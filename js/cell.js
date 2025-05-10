// Represents a single computational cell

class Cell {
    constructor(id, displayName, rawFormula, rawText) {
        this.id = id;
        this.displayName = displayName;
        this.rawFormula = rawFormula; // The string like "PERT(1,2,3)" or "10 to 20" or "100"
        this.rawText = rawText;     // The full original string e.g. "[MyCell][PERT(1,2,3)]"

        this.type = null;         // 'constant', 'normal', 'pert', 'dataArray', 'formula'
        this.parameters = {};     // e.g., { value: 100 } or { min: 1, max: 5 }
        
        this.samples = [];        // Array of Monte Carlo samples
        this.value = null;        // For constants, the direct value
        this.mean = null;
        this.ci = { lower: null, upper: null }; // 90% CI
        this.histogramData = [];  // For rendering histogram
        
        this.dependencies = new Set();   // Cell IDs this cell depends on
        this.dependents = new Set();     // Cell IDs that depend on this cell
        this.errorState = null;   // null, 'error', 'dependent-error'
        this.ast = null;          // Store the AST

        this.processFormula();
    }

    updateFormula(newRawFormula, newRawText) {
        this.rawFormula = newRawFormula;
        this.rawText = newRawText;
        // Reset values before reprocessing
        this.samples = [];
        this.value = null;
        this.mean = null;
        this.ci = { lower: null, upper: null };
        this.histogramData = [];
        this.errorState = null;
        // this.dependencies will be reset by processFormula
        // this.dependents should persist unless managed explicitly elsewhere
        this.processFormula();
    }

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
        this.dependencies = newDependencies; // Update the cell's own list of dependencies
    }

    _triggerDependentsUpdate(cellsCollection) {
        // Create a copy of dependents to iterate over, as the set might be modified
        // by recursive calls if there are complex update chains (though direct recursion is a cycle).
        const dependentsToUpdate = new Set(this.dependents);
        dependentsToUpdate.forEach(dependentId => {
            const dependentCell = cellsCollection[dependentId];
            if (dependentCell) {
                // console.log(`Cell ${this.id} triggering update for dependent: ${dependentId}`);
                // The dependentCell.processFormula() will handle its own DOM update
                // and trigger its own dependents if its state changes.
                dependentCell.processFormula();
            }
        });
    }

    processFormula() {
        const initialErrorState = this.errorState;
        const initialMean = this.mean;
        const initialValue = this.value; // For constants

        // Reset fields that will be recalculated or determined by formula processing
        this.errorState = null;
        this.ast = null;
        this.type = null;
        this.parameters = {};
        this.value = null;
        this.samples = [];
        this.mean = null;
        this.ci = { lower: null, upper: null };
        this.histogramData = [];
        // Dependencies are managed by _updateDependencyLinks called below

        const formula = this.rawFormula.trim();

        if (formula === '') {
            this.errorState = "Formula cannot be empty.";
            // console.warn(`Cell ${this.id}: ${this.errorState}`); // Error state will be handled below
        } else {
            try {
                this.ast = FormulaParser.parse(formula);
                // console.log(`Cell ${this.id} parsed. AST:`, JSON.parse(JSON.stringify(this.ast)));

                const newDependencies = this._extractDependencies(this.ast);
                this._updateDependencyLinks(newDependencies, window.Guesstinote.getCellsCollection());

                const evaluationResult = Evaluator.evaluate(this.ast, window.Guesstinote.getCellsCollection());

                if (typeof evaluationResult === 'number') {
                    this.type = 'constant';
                    this.value = evaluationResult;
                    this.samples = [evaluationResult]; // Represent scalar as a single sample for consistency
                } else if (Array.isArray(evaluationResult)) {
                    this.type = 'distribution'; // Covers PERT, Normal, Array, and formula results
                    this.value = null;
                    this.samples = evaluationResult;
                } else {
                    throw new Error("Evaluator returned an unexpected result type.");
                }

                if (this.samples.length > 0) {
                    const stats = Calculator.calculateStats(this.samples);
                    this.mean = stats.mean;
                    this.ci = stats.ci;
                    this.histogramData = stats.histogramData;
                } else { // Handles empty samples (e.g., from array() or error during eval)
                    this.mean = null;
                    this.ci = { lower: null, upper: null };
                    this.histogramData = [];
                }
            } catch (e) {
                this.errorState = e.message;
                // Clear potentially partially computed data
                this.value = null; this.samples = []; this.mean = null;
                this.ci = { lower: null, upper: null }; this.histogramData = [];
                console.error(`Cell ${this.id} Error during formula processing:`, e.message, e.stack);
            }
        }

        let stateChanged = false;
        if (this.errorState !== initialErrorState) {
            stateChanged = true;
        } else if (this.errorState === null) { // No error, check value
            if (this.type === 'constant') { // This type is set during current processing
                if (this.value !== initialValue) stateChanged = true;
            } else { // Distribution or other non-constant, non-error types
                if (this.mean !== initialMean) stateChanged = true;
                // More robust check for sample changes could be added if mean isn't sufficient
            }
        }

        if (stateChanged) {
            // console.log(`Cell ${this.id} state changed. Updating DOM and triggering dependents.`);
            window.Guesstinote.updateCellDOM(this.id);
            this._triggerDependentsUpdate(window.Guesstinote.getCellsCollection());
            return true; // Indicate that the cell's state changed
        }
        return false; // Indicate no change
    }
}

window.Cell = Cell; // Make Cell class globally available for now
console.log('cell.js loaded with Cell class');
