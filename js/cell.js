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
            const astHandler = Cell.AST_HANDLERS[this.ast.type];
            if (astHandler) {
                astHandler(this, this.ast); // Pass cell instance and AST node
            } else {
                // For AST types without a direct temporary handler (e.g., BinaryOp, CellIdentifier),
                // they will remain in a state where mean, ci, etc., are null.
                // The renderer will show "Calculating..."
                console.log(`Cell ${this.id}: No temporary AST handler for type "${this.ast.type}". Awaiting full evaluator.`);
            }

        } catch (e) {
            this.errorState = e.message;
            console.error(`Cell ${this.id} Error during formula processing:`, e);
        }
    }

    // _handleFunctionCall, _parseAsConstant, _parseAsNormal, _handlePert, _handleArray
    // are now effectively replaced by the FormulaParser and subsequent AST evaluation (to be built).
    // We can remove these private methods from the Cell class.
}

// Static map for temporary AST handlers
Cell.AST_HANDLERS = {
    'NumberLiteral': function(cell, astNode) {
        cell.type = 'constant';
        cell.value = astNode.value;
        cell.mean = cell.value;
        cell.samples = [cell.value];
        cell.ci = { lower: cell.value, upper: cell.value };
        cell.histogramData = Calculator.calculateStats(cell.samples).histogramData;
    },
    'RangeExpression': function(cell, astNode) {
        // This still requires evaluating the left and right nodes if they are not NumberLiterals.
        // For now, we'll assume they are for this temporary feedback.
        if (astNode.left.type === 'NumberLiteral' && astNode.right.type === 'NumberLiteral') {
            cell.type = 'normal'; // Assuming "X to Y" implies normal
            const val1 = astNode.left.value;
            const val2 = astNode.right.value;
            cell.parameters = { lowerCI: Math.min(val1, val2), upperCI: Math.max(val1, val2) };
            try {
                cell.samples = Calculator.generateNormalSamplesFromCI(cell.parameters.lowerCI, cell.parameters.upperCI);
                const stats = Calculator.calculateStats(cell.samples);
                cell.mean = stats.mean;
                cell.ci = stats.ci;
                cell.histogramData = stats.histogramData;
            } catch (e) { cell.errorState = `Normal dist calc error: ${e.message}`; }
        } else {
             cell.errorState = "Range expression arguments must be numbers (for now).";
        }
    },
    'FunctionCall': function(cell, astNode) {
        const functionName = astNode.name.toLowerCase();
        
        // For now, assume all arguments to these specific functions must be numbers.
        // This check can be moved into individual function handlers if some functions
        // accept non-numeric AST nodes (e.g., cell identifiers) later.
        const allArgsAreNumbers = astNode.args.every(arg => arg.type === 'NumberLiteral');

        if (!allArgsAreNumbers) {
            cell.errorState = `Function '${astNode.name}' arguments must all be numbers (for now).`;
            return;
        }
        const argValues = astNode.args.map(arg => arg.value);

        const funcImplementation = Cell.FUNCTION_IMPLEMENTATIONS[functionName];
        if (funcImplementation) {
            funcImplementation(cell, astNode, argValues);
        } else {
            cell.errorState = `Unknown function for temporary evaluation: '${astNode.name}'.`;
        }
    }
};

// Static map for specific function implementations (used by FunctionCall AST_HANDLER)
Cell.FUNCTION_IMPLEMENTATIONS = {
    'pert': function(cell, astNode, argValues) {
        cell.type = 'pert';
        let min, likely, max, lambda = 4;
        if (argValues.length === 2) {
            min = argValues[0]; max = argValues[1]; likely = (min + max) / 2;
        } else if (argValues.length === 3) {
            min = argValues[0]; likely = argValues[1]; max = argValues[2];
        } else if (argValues.length === 4) {
            min = argValues[0]; likely = argValues[1]; max = argValues[2]; lambda = argValues[3];
        } else {
            cell.errorState = `PERT: Incorrect number of arguments (${argValues.length}).`;
            return;
        }
        if (!(min <= likely && likely <= max)) {
            cell.errorState = `PERT: Invalid parameters (min <= likely <= max not met).`;
            return;
        }
        if (min === max) { // Treat as constant
            // Reuse constant handler by directly setting cell properties
            cell.type = 'constant';
            cell.value = min;
            cell.mean = min;
            cell.samples = [min];
            cell.ci = { lower: min, upper: min };
            cell.histogramData = Calculator.calculateStats(cell.samples).histogramData;
            return;
        }
        cell.parameters = { min, likely, max, lambda };
        try {
            cell.samples = Calculator.generatePertSamples(min, likely, max, lambda);
            const stats = Calculator.calculateStats(cell.samples);
            cell.mean = stats.mean;
            cell.ci = stats.ci;
            cell.histogramData = stats.histogramData;
        } catch (e) { cell.errorState = `PERT calc error: ${e.message}`; }
    },
    'array': function(cell, astNode, argValues) {
        cell.type = 'dataArray';
        cell.parameters = { data: argValues };
        try {
            // Handle empty array case explicitly if argValues is empty
            if (argValues.length === 0) {
                 cell.samples = [];
                 cell.mean = null; 
                 cell.ci = {lower: null, upper: null};
                 cell.histogramData = [];
                 console.log(`Cell ${cell.id} parsed as empty Data Array.`);
                 return;
            }
            cell.samples = Calculator.processInlineDataArray(argValues);
            const stats = Calculator.calculateStats(cell.samples);
            cell.mean = stats.mean;
            cell.ci = stats.ci;
            cell.histogramData = stats.histogramData;
        } catch (e) { cell.errorState = `Array processing error: ${e.message}`; }
    }
    // Add more function implementations here:
    // 'normal': function(cell, astNode, argValues) { ... },
    // 'mean': function(cell, astNode, argValues) { ... },
};

window.Cell = Cell; // Make Cell class globally available for now
console.log('cell.js loaded with Cell class');
