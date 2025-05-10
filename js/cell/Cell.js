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
        // this.dependents = new Set();  // No longer managed by Cell; CalculationManager handles this
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
        const oldDependencies = this.dependencies; // This will be empty on first call for a new cell, or contain previous deps

        // Logic to update other cells' `dependents` lists is removed from here.
        // CalculationManager will use `this.dependencies` (set below) and `this._previousDependencies`
        // (set in `prepareForReevaluation`) to update its own graph.

        this.dependencies = newDependencies; // Set the new dependencies for this cell

        // Note: _previousDependencies is set in prepareForReevaluation and used by CalculationManager.
        // It's not cleared here because CalculationManager needs it.
        // CalculationManager will compare cell.dependencies (new) with cell._previousDependencies (old)
        // after processFormula returns.
    }

    // _triggerDependentsUpdate is removed. CalculationManager now handles this logic.

    // currentlyEvaluatingParam is passed down from Evaluator when it recursively calls processFormula for a dependency.
    processFormula(cellsCollection = window.Guesstinote.getCellsCollection(), currentlyEvaluatingParam = null) {
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
        const initialCILower = this.ci ? this.ci.lower : null;
        const initialCIUpper = this.ci ? this.ci.upper : null;

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
                // Assumes FormulaParser is globally available
                this.ast = FormulaParser.parse(formula); 
                const newDependencies = this._extractDependencies(this.ast);
                this._updateDependencyLinks(newDependencies, cellsCollection);

                let evalCurrentlyEvaluatingSet;
                if (currentlyEvaluatingParam) {
                    // If called from Evaluator for a stale dependency, use the passed set.
                    evalCurrentlyEvaluatingSet = currentlyEvaluatingParam;
                } else {
                    // This is a top-level call (e.g., from main.js loop), start a new set.
                    evalCurrentlyEvaluatingSet = new Set([this.id]);
                }
                
                // Assumes Evaluator is globally available
                const evaluationResult = Evaluator.evaluate(this.ast, cellsCollection, evalCurrentlyEvaluatingSet);

                // Process evaluationResult based on its structure (scalar, array, or object with type/samples)
                if (typeof evaluationResult === 'number') {
                    this.type = 'formulaOnlyConstant'; 
                    this.value = evaluationResult;
                    this.samples = [evaluationResult]; 
                    this.mean = evaluationResult;
                    this.ci = { lower: evaluationResult, upper: evaluationResult };
                    // Histogram data will be calculated by HistogramRenderer as needed
                    this.histogramData = null; // Mark as needing recalc by renderer
                } else if (Array.isArray(evaluationResult)) { // Raw array of samples from complex formula
                    this.type = 'distribution'; 
                    this.value = null; 
                    this.samples = evaluationResult; 
                    
                    if (this.samples.length > 0) {
                        // StatisticsCalculator will be used by HistogramRenderer or CellRenderer
                        const stats = StatisticsCalculator.calculateStats(this.samples);
                        this.mean = stats.mean; this.ci = stats.ci;
                        this.histogramData = null; // Mark as needing recalc by renderer
                    } else { 
                        this.mean = null; this.ci = { lower: null, upper: null }; this.histogramData = [];
                    }
                } else if (evaluationResult && typeof evaluationResult === 'object' && evaluationResult.type) { // Structured result from direct functions
                    this.type = evaluationResult.type; // 'constant', 'pert', 'normal', 'dataArray'
                    if (evaluationResult.type === 'constant') {
                        this.value = evaluationResult.value;
                        this.samples = [this.value];
                        this.mean = this.value; this.ci = {lower: this.value, upper: this.value};
                        this.histogramData = null; // Mark as needing recalc by renderer
                    } else { // A distribution type
                        this.value = null;
                        this.samples = evaluationResult.samples || [];
                        if (this.samples.length > 0) {
                            const stats = StatisticsCalculator.calculateStats(this.samples);
                            this.mean = stats.mean; this.ci = stats.ci;
                            this.histogramData = null; // Mark as needing recalc by renderer
                        } else {
                             this.mean = null; this.ci = { lower: null, upper: null }; this.histogramData = [];
                        }
                    }
                } else {
                    this.setError("Evaluator returned an unexpected result type.", false);
                }
            } catch (e) {
                const isDepError = e.message && (e.message.startsWith("Dependency cell") || e.message.includes("Unknown cell identifier") || e.message.includes("Circular dependency detected") || e.message.startsWith("Evaluator Error:"));
                this.setError(e.message, isDepError);
            }
        }

        this._processedInCurrentCycle = true; // Mark as processed in this cycle.

        let stateChangedForDisplay = false;
        let dataChangedForDependents = false; 

        // Determine if a display refresh is needed based on actual changes.
        // This block correctly determines if the visual representation of the cell needs an update.
        if (errorWasCleared || 
            this.errorState !== initialErrorState || 
            this.isDependencyError !== initialIsDependencyError) {
            stateChangedForDisplay = true;
        } else if (this.errorState === null) { // No error, check for data changes.
            if (this.type === 'constant' || this.type === 'formulaOnlyConstant') {
                if (this.value !== initialValue) {
                    stateChangedForDisplay = true;
                }
            } else { // Distribution type.
                if (this.mean !== initialMean ||
                    (this.ci ? this.ci.lower : null) !== initialCILower ||
                    (this.ci ? this.ci.upper : null) !== initialCIUpper ||
                    this.samples.length !== initialSamplesLength) { // Compare samples length as a proxy for content change
                    stateChangedForDisplay = true;
                }
            }
        }

        // If the displayable state changed, notify elements.
        if (stateChangedForDisplay) {
            this.notifyElementsToRefresh();
            // Any change that affects display might also affect dependents.
            // More precise logic for dataChangedForDependents could be:
            // - Error state changed: dataChangedForDependents = true
            // - Value/Mean/CI/Samples content changed (not just length): dataChangedForDependents = true
            // For now, linking it to stateChangedForDisplay is a safe bet.
            dataChangedForDependents = true; 
        }
        // An alternative for dataChangedForDependents (more precise):
        // if (this.errorState !== initialErrorState || this.isDependencyError !== initialIsDependencyError) {
        //     dataChangedForDependents = true;
        // } else if (this.errorState === null) {
        //     if (this.type === 'constant' || this.type === 'formulaOnlyConstant') {
        //         if (this.value !== initialValue) dataChangedForDependents = true;
        //     } else { // Distribution type
        //         // A more thorough check would compare sample arrays if necessary,
        //         // but mean/ci/length is usually sufficient.
        //         if (this.mean !== initialMean || 
        //             (this.ci ? this.ci.lower : null) !== initialCILower ||
        //             (this.ci ? this.ci.upper : null) !== initialCIUpper ||
        //             this.samples.length !== initialSamplesLength) { // Or a deep compare of samples
        //             dataChangedForDependents = true;
        //         }
        //     }
        // }

        // The `dataChangedForDependents` flag effectively becomes `outputChanged`
        outputChanged = dataChangedForDependents;

        if (stateChangedForDisplay) { // If display changed, notify elements
            this.notifyElementsToRefresh();
        }
        
        // Return true if the cell's output changed, signaling to CalculationManager
        // that dependents might need reevaluation.
        // CalculationManager will also use cell.dependencies and cell._previousDependencies
        // to update its graph.
        return { outputChanged }; 
    }

    setError(errorMessage, isDepError = false) {
        let errorStateActuallyChanged = false;
        if (this.errorState !== errorMessage || this.isDependencyError !== isDepError) {
            this.errorState = errorMessage;
            this.isDependencyError = isDepError;
            errorStateActuallyChanged = true;

            if (!isDepError) { 
                this.value = null; this.samples = []; this.mean = null;
                this.ci = { lower: null, upper: null }; this.histogramData = [];
                this.type = null; 
            }
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

window.Cell = Cell; // Expose globally
console.log('js/cell/Cell.js loaded (with custom element support).');
