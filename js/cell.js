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
        
        this.dependencies = [];   // Cell IDs this cell depends on (for complex formulas)
        this.dependents = [];     // Cell IDs that depend on this cell
        this.errorState = null;   // null, 'error', 'dependent-error'

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
        this.dependencies = [];
        this.processFormula();
    }

    processFormula() {
        this.errorState = null;
        this.ast = null; // Abstract Syntax Tree
        this.type = null; // Reset type, will be determined by AST evaluation later
        this.parameters = {};
        this.value = null;
        this.samples = [];
        this.mean = null;
        this.ci = { lower: null, upper: null };
        this.histogramData = [];
        this.dependencies = [];

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

        } catch (e) {
            this.errorState = e.message; // Capture errors from parser or evaluator
            console.error(`Cell ${this.id} Error during formula processing:`, e);
        }
    }

    // _handleFunctionCall, _parseAsConstant, _parseAsNormal, _handlePert, _handleArray,
    // Cell.AST_HANDLERS, and Cell.FUNCTION_IMPLEMENTATIONS are removed as the new
    // Evaluator module and the direct AST processing in processFormula supersede them.
}

window.Cell = Cell; // Make Cell class globally available for now
console.log('cell.js loaded with Cell class');
