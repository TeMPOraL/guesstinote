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

            // We can, however, do a very simple interpretation for immediate feedback for *some* simple cases
            // if the AST root is a known type that doesn't require further evaluation (like a number literal).
            // This is a temporary measure.
            if (this.ast.type === 'NumberLiteral') {
                this.type = 'constant';
                this.value = this.ast.value;
                this.mean = this.value;
                this.samples = [this.value];
                this.ci = { lower: this.value, upper: this.value };
                this.histogramData = Calculator.calculateStats(this.samples).histogramData;
            } else if (this.ast.type === 'RangeExpression') {
                // This still requires evaluating the left and right nodes if they are not NumberLiterals.
                // For now, we'll assume they are for this temporary feedback.
                if (this.ast.left.type === 'NumberLiteral' && this.ast.right.type === 'NumberLiteral') {
                    this.type = 'normal'; // Assuming "X to Y" implies normal
                    const val1 = this.ast.left.value;
                    const val2 = this.ast.right.value;
                    this.parameters = { lowerCI: Math.min(val1, val2), upperCI: Math.max(val1, val2) };
                    try {
                        this.samples = Calculator.generateNormalSamplesFromCI(this.parameters.lowerCI, this.parameters.upperCI);
                        const stats = Calculator.calculateStats(this.samples);
                        this.mean = stats.mean;
                        this.ci = stats.ci;
                        this.histogramData = stats.histogramData;
                    } catch (e) { this.errorState = `Normal dist calc error: ${e.message}`; }
                } else {
                     this.errorState = "Range expression arguments must be numbers (for now).";
                }
            } else if (this.ast.type === 'FunctionCall') {
                // Similar temporary handling for PERT and array if args are simple numbers
                if (this.ast.name.toLowerCase() === 'pert' && this.ast.args.every(arg => arg.type === 'NumberLiteral')) {
                    this.type = 'pert';
                    const args = this.ast.args.map(arg => arg.value);
                    // ... (PERT logic from _handlePert, simplified for direct values) ...
                    // This part is getting repetitive with the old _handlePert, highlighting
                    // the need for the AST evaluator to handle this properly.
                    // For brevity, I'll skip reimplementing full PERT logic here for this temporary step.
                    // It will fall through to "Calculating..." or show formula.
                    // We'll just set the type.
                    // For now, to avoid errors and show something, let's just mark it as needing calculation
                    // if we don't fully implement the temporary PERT logic here.
                    // This means PERT cells will show "Calculating..." until the evaluator.
                    if (args.length >= 2 && args.length <= 4 && !args.some(isNaN)) {
                        // Basic validation passed, but not calculating here.
                        // The renderer will show "Calculating..." if mean is null.
                    } else {
                        this.errorState = "PERT arguments invalid or not all numbers.";
                    }


                } else if (this.ast.name.toLowerCase() === 'array' && this.ast.args.every(arg => arg.type === 'NumberLiteral')) {
                    this.type = 'dataArray';
                    const dataValues = this.ast.args.map(arg => arg.value);
                    this.parameters = { data: dataValues };
                    try {
                        this.samples = Calculator.processInlineDataArray(dataValues);
                        const stats = Calculator.calculateStats(this.samples);
                        this.mean = stats.mean;
                        this.ci = stats.ci;
                        this.histogramData = stats.histogramData;
                    } catch (e) { this.errorState = `Array processing error: ${e.message}`; }
                }
                // Other function calls or complex args will not be evaluated here.
            }
            // Complex formulas (BinaryOp, CellIdentifier) will not be evaluated here.

        } catch (e) {
            this.errorState = e.message;
            console.error(`Cell ${this.id} Error during formula processing:`, e);
        }
    }

    // _handleFunctionCall, _parseAsConstant, _parseAsNormal, _handlePert, _handleArray
    // are now effectively replaced by the FormulaParser and subsequent AST evaluation (to be built).
    // We can remove these private methods from the Cell class.
}

window.Cell = Cell; // Make Cell class globally available for now
console.log('cell.js loaded with Cell class');
