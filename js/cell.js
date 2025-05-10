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

        // Add this cell to dependents list of new dependencies
        newDependencies.forEach(depId => {
            if (!oldDependencies.has(depId)) {
                const depCell = cellsCollection[depId];
                if (depCell) {
                    depCell.dependents.add(this.id);
                } else {
                    // This case implies a dependency on a non-existent cell.
                    // The evaluator will catch this, but good to be aware.
                    console.warn(`Cell ${this.id} lists dependency on non-existent cell ${depId}`);
                }
            }
        });
        this.dependencies = newDependencies;
    }

    _triggerDependentsUpdate(cellsCollection) {
        // Create a copy of dependents to iterate over, as the set might be modified
        // by recursive calls if there are complex update chains (though direct recursion is a cycle).
        const dependentsToUpdate = new Set(this.dependents);
        dependentsToUpdate.forEach(dependentId => {
            const dependentCell = cellsCollection[dependentId];
            if (dependentCell) {
                console.log(`Cell ${this.id} triggering update for dependent: ${dependentId}`);
                dependentCell.processFormula(); // This will in turn call its own evaluator and trigger its dependents
            }
        });
    }


    processFormula() {
        this.errorState = null;
        // this.ast = null; // AST is parsed below
        this.type = null; 
        this.parameters = {};
        this.value = null;
        this.samples = [];
        this.mean = null;
        this.ci = { lower: null, upper: null };
        this.histogramData = [];
        // Dependencies are calculated below

        const formula = this.rawFormula.trim();

        if (formula === '') {
            this.errorState = "Formula cannot be empty.";
            console.warn(`Cell ${this.id}: ${this.errorState}`);
            return;
        }

        try {
            this.ast = FormulaParser.parse(formula);
            console.log(`Cell ${this.id} parsed. AST:`, JSON.parse(JSON.stringify(this.ast))); // Deep copy for logging

            // At this point, we have an AST.
            // The direct calculation logic (for constants, PERT, array, X to Y)
            // will be handled by an AST evaluator in a subsequent step.
            // For now, we won't populate mean, ci, samples, etc., directly from here.
            // The cell will display "Calculating..." or its formula based on renderer logic
            // until the evaluator is built and integrated.

            // The new Evaluator will handle interpretation of the AST.
            // It needs access to the global CellsCollection for resolving CellIdentifiers.
            // This is a simplification; ideally, CellsCollection is passed more explicitly.
            const evaluationResult = Evaluator.evaluate(this.ast, window.Guesstinote.getCellsCollection());

            if (typeof evaluationResult === 'number') {
                this.type = 'constant'; // Result of evaluation is a scalar
                this.value = evaluationResult;
                this.samples = [evaluationResult]; // Represent as a single sample
            } else if (Array.isArray(evaluationResult)) {
                this.type = 'distribution'; // Result of evaluation is an array of samples
                this.value = null; // Not a single scalar value
                this.samples = evaluationResult;
            } else {
                // Should not happen if evaluator is correct
                throw new Error("Evaluator returned an unexpected result type.");
            }

            // Calculate stats based on samples
            if (this.samples.length > 0) {
                const stats = Calculator.calculateStats(this.samples);
                this.mean = stats.mean;
                this.ci = stats.ci;
                this.histogramData = stats.histogramData;
            } else { // Handle empty samples case (e.g. from empty array())
                this.mean = null;
                this.ci = { lower: null, upper: null };
                this.histogramData = [];
            }
            
            // TODO: Determine cell type ('pert', 'normal', 'dataArray', 'formula') more specifically
            // based on the AST root or evaluation path if needed for rendering or other logic.
            // For now, 'constant' or 'distribution' based on result type is a start.
            
            // After successful evaluation, trigger updates for dependent cells
            // This should only happen if the value or error state actually changed,
            // but for simplicity now, we trigger if no error.
            // A more refined check would compare old vs new values/samples.
            this._triggerDependentsUpdate(window.Guesstinote.getCellsCollection());


        } catch (e) {
            this.errorState = e.message; // Capture errors from parser or evaluator
            console.error(`Cell ${this.id} Error during formula processing:`, e.message, e.stack);
            // If this cell errors out, its dependents might also need to be marked
            // (e.g. 'dependent-error'). For now, they will try to evaluate and likely
            // get an error when trying to access this cell's value.
        }
    }
}

window.Cell = Cell; // Make Cell class globally available for now
console.log('cell.js loaded with Cell class');
