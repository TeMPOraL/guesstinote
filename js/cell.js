// Represents a single computational cell

class Cell {
    constructor(id, displayName, rawFormula, rawText) {
        this.id = id;
        this.displayName = displayName;
        this.rawFormula = rawFormula; 
        this.rawText = rawText;     // e.g. "<g-cell id='MyCell'...>"

        this.type = null;         // 'constant', 'normal', 'pert', 'dataArray', 'formula', 'formulaOnlyConstant'
        this.parameters = {};     
        
        this.samples = [];        
        this.value = null;        
        this.mean = null;
        this.ci = { lower: null, upper: null }; 
        this.histogramData = [];  
        
        this.dependencies = new Set();   
        this.dependents = new Set();     
        this._previousDependencies = new Set(); 

        this.errorState = null;   
        this.isDependencyError = false; 
        this.ast = null;          

        this._processedInCurrentCycle = false; 
        this.needsReevaluation = true; 

        this.domElements = new Set(); // Set of GCellElement/GRefElement instances
        
        // Initial processing is handled by the main processing loop (processCellCalculations in main.js)
        // Calling processFormula() here can lead to issues if CellsCollection is not fully populated yet.
    }

    registerElement(element) {
        this.domElements.add(element);
    }

    unregisterElement(element) {
        this.domElements.delete(element);
    }

    notifyElementsToRefresh() {
        this.domElements.forEach(element => {
            if (typeof element.refreshDisplay === 'function') {
                element.refreshDisplay();
            }
        });
    }

    prepareForReevaluation() {
        this.clearError(); 
        this._previousDependencies = new Set(this.dependencies);
        this.dependencies.clear(); 
        this._processedInCurrentCycle = false;
        this.needsReevaluation = true; 
    }
    
    isProcessedInCurrentCycle() { return this._processedInCurrentCycle; }
    resetProcessedFlag() { this._processedInCurrentCycle = false; }

    // updateFormula is effectively handled by GCellElement attributeChangedCallback
    // which updates rawFormula on the Cell instance, then processFormula is called by main loop.

    _extractDependencies(astNode) {
        const dependencies = new Set();
        if (!astNode) return dependencies;

        function traverse(node) {
            if (!node) return;
            if (node.type === 'CellIdentifier') {
                dependencies.add(node.name);
            }
            // Recursively traverse children
            if (node.left) traverse(node.left);
            if (node.right) traverse(node.right);
            if (node.operand) traverse(node.operand);
            if (node.args && Array.isArray(node.args)) {
                node.args.forEach(arg => traverse(arg));
            }
        }
        traverse(astNode);
        return dependencies;
    }
    
    _updateDependencyLinks(newDependencies, cellsCollection) {
        const oldDependencies = this.dependencies;

        // Remove this cell from dependents list of old dependencies no longer used
        oldDependencies.forEach(depId => {
            if (!newDependencies.has(depId)) {
                const depCell = cellsCollection[depId];
                if (depCell) {
                    depCell.dependents.delete(this.id);
                }
            }
        });

        // Add this cell to dependents list of all current dependencies
        newDependencies.forEach(depId => {
            const depCell = cellsCollection[depId];
            if (depCell) {
                depCell.dependents.add(this.id); // Ensure this cell is listed as a dependent
            } else {
                // This can happen if a cell is defined that refers to a not-yet-defined cell.
                // The evaluator will throw an "Unknown cell identifier" error, which is handled.
                // During the iterative processing in processFullDocument, this link
                // should eventually be established when this cell (the one calling _updateDependencyLinks)
                // is re-processed after the dependency cell has been created.
                console.warn(`Cell ${this.id} attempting to link to dependency ${depId}, but ${depId} not found in cellsCollection yet.`);
            }
        });
        this.dependencies = newDependencies;
        this._previousDependencies.forEach(oldDepId => {
            if (!newDependencies.has(oldDepId)) {
                const oldDepCell = cellsCollection[oldDepId];
                if (oldDepCell) {
                    oldDepCell.dependents.delete(this.id);
                }
            }
        });
        this._previousDependencies.clear(); // Important to clear after use
    }

    _triggerDependentsUpdate(cellsCollection, isErrorPropagation = false) {
        this.dependents.forEach(depId => {
            const dependentCell = cellsCollection[depId];
            if (dependentCell) {
                dependentCell.needsReevaluation = true; // Mark for re-evaluation by the main loop
                let errorStatusChanged = false;
                if (isErrorPropagation && this.errorState) {
                    // Store current error state before setting new one to check if it changed
                    const oldDepError = dependentCell.errorState;
                    const oldDepIsDepError = dependentCell.isDependencyError;
                    dependentCell.setError(`Dependency '${this.id}' error: ${this.errorState}`, true);
                    if(dependentCell.errorState !== oldDepError || dependentCell.isDependencyError !== oldDepIsDepError) {
                        errorStatusChanged = true;
                    }
                } else if (!isErrorPropagation && dependentCell.isDependencyError && dependentCell.errorState && dependentCell.errorState.includes(`Dependency '${this.id}'`)) {
                    // If this cell fixed itself, and dependent had an error due to this cell, clear it.
                    if(dependentCell.clearError()) { // clearError returns true if state changed
                        errorStatusChanged = true;
                    }
                }
                // If the dependent's error state actually changed, it needs to refresh its display.
                // The main processing loop will eventually call processFormula on it due to needsReevaluation=true,
                // which will also call notifyElementsToRefresh if its data/error changes.
                // Explicitly calling notify here if error changed ensures faster UI update for error propagation.
                if (errorStatusChanged) {
                    dependentCell.notifyElementsToRefresh();
                }
            }
        });
    }

    processFormula(cellsCollection = window.Guesstinote.getCellsCollection()) {
        // If already processed in this cycle and not explicitly marked for re-evaluation, skip.
        if (this._processedInCurrentCycle && !this.needsReevaluation) {
            return false; 
        }
        this.needsReevaluation = false; // Consumed the flag

        const initialErrorState = this.errorState;
        const initialMean = this.mean;
        const initialValue = this.value;
        const initialIsDependencyError = this.isDependencyError;
        const initialSamplesLength = this.samples.length;

        let errorWasCleared = this.clearError(); // Clears errorState, isDependencyError. Returns true if state changed.

        this.ast = null;
        // this.type, this.parameters, this.value, this.samples etc. are not reset here.
        // They are overwritten on successful evaluation or cleared by setError if it's a direct error.
        // If it's a dependency error, they retain their "frozen" state.

        const formula = this.rawFormula ? this.rawFormula.trim() : "";

        if (formula === '') {
            this.setError("Formula cannot be empty.", false); // false for direct error
        } else {
            try {
                this.ast = FormulaParser.parse(formula);
                const newDependencies = this._extractDependencies(this.ast);
                this._updateDependencyLinks(newDependencies, cellsCollection);

                // Pass a new Set for currentlyEvaluating to avoid interference between sibling evaluations in a complex graph
                const evaluationResult = Evaluator.evaluate(this.ast, cellsCollection, new Set([this.id]));

                // Process evaluationResult based on its structure (scalar, array, or object with type/samples)
                if (typeof evaluationResult === 'number') {
                    this.type = 'formulaOnlyConstant'; 
                    this.value = evaluationResult;
                    this.samples = [evaluationResult]; 
                    this.mean = evaluationResult;
                    this.ci = { lower: evaluationResult, upper: evaluationResult };
                    this.histogramData = Calculator.calculateStats(this.samples).histogramData;
                } else if (Array.isArray(evaluationResult)) { // Raw array of samples from complex formula
                    this.type = 'distribution'; 
                    this.value = null; 
                    this.samples = evaluationResult; 
                    
                    if (this.samples.length > 0) {
                        const stats = Calculator.calculateStats(this.samples);
                        this.mean = stats.mean; this.ci = stats.ci; this.histogramData = stats.histogramData;
                    } else { 
                        this.mean = null; this.ci = { lower: null, upper: null }; this.histogramData = [];
                    }
                } else if (evaluationResult && typeof evaluationResult === 'object') { // Structured result from direct functions
                    this.type = evaluationResult.type; // 'constant', 'pert', 'normal', 'dataArray'
                    if (evaluationResult.type === 'constant') {
                        this.value = evaluationResult.value;
                        this.samples = [this.value];
                        this.mean = this.value; this.ci = {lower: this.value, upper: this.value};
                        this.histogramData = Calculator.calculateStats(this.samples).histogramData;
                    } else { // A distribution type
                        this.value = null;
                        this.samples = evaluationResult.samples || [];
                        if (this.samples.length > 0) {
                            const stats = Calculator.calculateStats(this.samples);
                            this.mean = stats.mean; this.ci = stats.ci; this.histogramData = stats.histogramData;
                        } else {
                             this.mean = null; this.ci = { lower: null, upper: null }; this.histogramData = [];
                        }
                    }
                } else {
                    this.setError("Evaluator returned an unexpected result type.", false);
                }
            } catch (e) {
                const isDepError = e.message && (e.message.startsWith("Dependency cell") || e.message.includes("Unknown cell identifier") || e.message.includes("Circular dependency detected"));
                this.setError(e.message, isDepError);
            }
        }

        this._processedInCurrentCycle = true;
        let dataChangedSignificantEnoughForDependents = false;

        if (this.errorState !== initialErrorState || this.isDependencyError !== initialIsDependencyError) {
            dataChangedSignificantEnoughForDependents = true;
        } else if (this.errorState === null) { // No error, check for data changes
            if (this.type === 'constant' || this.type === 'formulaOnlyConstant') {
                if (this.value !== initialValue) dataChangedSignificantEnoughForDependents = true;
            } else { // Distribution
                if (this.mean !== initialMean || this.samples.length !== initialSamplesLength) {
                    dataChangedSignificantEnoughForDependents = true;
                }
                // A more robust check for sample array content change could be added here if mean/length isn't sufficient
            }
        }
        
        // Always notify own elements if error was cleared or if data changed.
        if (dataChangedSignificantEnoughForDependents || errorWasCleared) {
            this.notifyElementsToRefresh();
        }

        // Trigger dependents only if there was a significant change (value or error state)
        if (dataChangedSignificantEnoughForDependents) {
            this._triggerDependentsUpdate(cellsCollection, !!this.errorState);
            return true; // Indicates a change that affects dependents
        }
        // If only errorWasCleared but data remained same, it's a change for this cell's display, but maybe not for dependents.
        // However, returning true ensures the processing loop considers it a change.
        return errorWasCleared; 
    }

    setError(errorMessage, isDepError = false) {
        let errorStateActuallyChanged = false;
        if (this.errorState !== errorMessage || this.isDependencyError !== isDepError) {
            this.errorState = errorMessage;
            this.isDependencyError = isDepError;
            errorStateActuallyChanged = true;

            if (!isDepError) { // Direct error in this cell, clear its data
                this.value = null; this.samples = []; this.mean = null;
                this.ci = { lower: null, upper: null }; this.histogramData = [];
                this.type = null; // Type is invalidated by direct error
            }
            // If it's a dependency error, data (value, samples, mean, ci, histogram, type) is "frozen" (not cleared here).
        }
        return errorStateActuallyChanged; 
    }

    clearError() {
        let errorActuallyCleared = false;
        if (this.errorState !== null || this.isDependencyError) {
            this.errorState = null;
            this.isDependencyError = false;
            errorActuallyCleared = true;
        }
        return errorActuallyCleared; 
    }
}

window.Cell = Cell;
console.log('cell.js loaded (with custom element support).');
