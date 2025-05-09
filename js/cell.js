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
        this.errorState = null; // Clear previous errors
        const formula = this.rawFormula.trim();

        if (this._parseAsConstant(formula)) return;
        if (this._parseAsNormal(formula)) return;
        
        // Try to parse as a generic function call: funcName(args)
        const functionCallMatch = formula.match(/^([a-zA-Z_]\w*)\s*\((.*)\)\s*$/);
        if (functionCallMatch) {
            const functionName = functionCallMatch[1].toLowerCase();
            const argumentsString = functionCallMatch[2];
            if (this._handleFunctionCall(functionName, argumentsString)) {
                return;
            }
            // If _handleFunctionCall returns false, it means the function name was not recognized
            // or there was an issue handled within it that should fall through.
            // However, _handleFunctionCall should set errorState if it recognizes the function but fails.
            // If it returns false, it implies the function name itself is unknown.
            if (!this.errorState) { // Only set unknown function error if not already set by handler
                 this.errorState = `Unknown function: "${functionCallMatch[1]}"`;
                 console.error(`Cell ${this.id} ${this.errorState}`);
            }
            return;
        }

        // If none of the above, it's a complex formula (or an error)
        // TODO: Implement binary operator parsing here (e.g., CellA + CellB)
        this.type = 'formula';
        this.parameters = {}; 
        this.errorState = `Unsupported or invalid formula structure: "${formula}"`;
        console.log(`Cell ${this.id} ${this.errorState}`);
    }

    _handleFunctionCall(functionName, argumentsString) {
        switch (functionName) {
            case 'pert':
                return this._handlePert(argumentsString);
            case 'array':
                return this._handleArray(argumentsString);
            // Add other function handlers here, e.g. 'normal', 'mean'
            default:
                return false; // Function name not recognized by this dispatcher
        }
    }

    _parseAsConstant(formula) {
        if (/^\s*[-+]?\d+(\.\d+)?\s*$/.test(formula)) {
            this.type = 'constant';
            this.value = parseFloat(formula);
            this.parameters = { value: this.value };
            this.mean = this.value;
            this.samples = [this.value]; // Represent as a single sample for consistency
            this.ci = { lower: this.value, upper: this.value };
            this.histogramData = Calculator.calculateStats(this.samples).histogramData;
            console.log(`Cell ${this.id} parsed as constant:`, this.value);
            return true;
        }
        return false;
    }

    _parseAsNormal(formula) {
        const normalMatch = formula.match(/^\s*([-+]?\d+(\.\d+)?)\s*to\s*([-+]?\d+(\.\d+)?)\s*$/);
        if (normalMatch) {
            this.type = 'normal';
            const val1 = parseFloat(normalMatch[1]);
            const val2 = parseFloat(normalMatch[3]);
            this.parameters = { lowerCI: Math.min(val1, val2), upperCI: Math.max(val1, val2) };
            try {
                this.samples = Calculator.generateNormalSamplesFromCI(this.parameters.lowerCI, this.parameters.upperCI);
                const stats = Calculator.calculateStats(this.samples);
                this.mean = stats.mean;
                this.ci = stats.ci;
                this.histogramData = stats.histogramData;
                console.log(`Cell ${this.id} parsed as normal:`, this.parameters, "Mean:", this.mean);
            } catch (e) {
                this.errorState = `Normal dist calc error: ${e.message}`;
                console.error(`Error calculating normal distribution for ${this.id}:`, e);
            }
            return true;
        }
        return false;
    }

    _handlePert(argumentsString) {
        this.type = 'pert';
        const args = argumentsString.split(',').map(arg => parseFloat(arg.trim()));

        if (args.some(isNaN)) {
            this.errorState = `PERT: Invalid arguments (not all numbers) in "${argumentsString}"`;
            console.error(`Cell ${this.id} ${this.errorState}`);
            return true; 
        }

        let min, likely, max, lambda = 4; // Default lambda

            switch (args.length) {
                case 2: // PERT(min, max)
                    min = args[0];
                    max = args[1];
                    likely = (min + max) / 2;
                    break;
                case 3: // PERT(min, likely, max)
                    min = args[0];
                    likely = args[1];
                    max = args[2];
                    break;
                case 4: // PERT(min, likely, max, lambda)
                    min = args[0];
                    likely = args[1];
                    max = args[2];
                    lambda = args[3];
                    break;
                default:
                    this.errorState = `PERT: Incorrect number of arguments (${args.length}) in "${argsString}"`;
                    console.error(`Cell ${this.id} ${this.errorState}`);
                    return true; // Matched PERT but failed due to arg count
            }
            
            if (!(min <= likely && likely <= max)) {
                 this.errorState = `PERT: Invalid parameters (min <= likely <= max not met). min=${min}, likely=${likely}, max=${max}`;
                 console.error(`Cell ${this.id} ${this.errorState}`);
                 return true; // Matched PERT but failed validation
            }

            if (min === max) { // If min and max are same, treat as constant
                 this.type = 'constant'; // Or a very narrow PERT
                 this.value = min;
                 this.parameters = { value: this.value };
                 this.mean = this.value;
                 this.samples = [this.value];
                 this.ci = { lower: this.value, upper: this.value };
                 this.histogramData = Calculator.calculateStats(this.samples).histogramData;
                 console.log(`Cell ${this.id} PERT (min=max) parsed as constant:`, this.value);
                 return true;
            }

            this.parameters = { min, likely, max, lambda };
            try {
                this.samples = Calculator.generatePertSamples(min, likely, max, lambda);
                const stats = Calculator.calculateStats(this.samples);
                this.mean = stats.mean;
                this.ci = stats.ci;
                this.histogramData = stats.histogramData;
                console.log(`Cell ${this.id} parsed as PERT:`, this.parameters, "Mean:", this.mean);
            } catch (e) {
                this.errorState = `PERT calc error: ${e.message}`;
                console.error(`Error calculating PERT distribution for ${this.id}:`, e);
            }
            return true;
        }

    _handleArray(argumentsString) {
        this.type = 'dataArray'; // Keep type as 'dataArray' for consistency with Calculator
        const dataValues = argumentsString.split(',').map(s => parseFloat(s.trim()));

        if (dataValues.some(isNaN)) {
            this.errorState = `Array: Invalid numbers in "${argumentsString}"`;
            console.error(`Cell ${this.id} ${this.errorState}`);
            return true; 
        }
        
        if (dataValues.length === 0 && argumentsString.trim() !== "") {
            // Handles cases like "array()" or "array( )" which might result in empty dataValues
            // but argsString is not truly empty.
             this.errorState = `Array: No valid numbers found in "${argumentsString}"`;
             console.error(`Cell ${this.id} ${this.errorState}`);
             return true;
        }
        // If argumentsString is empty, dataValues will be [NaN] if not handled, or empty if split produces [""] then map to NaN.
        // Let's allow empty array: array() -> empty samples.
        if (dataValues.length === 0 || (dataValues.length === 1 && isNaN(dataValues[0]) && argumentsString.trim() === "")) {
             this.parameters = { data: [] };
             this.samples = [];
             this.mean = null; // Or 0, depending on desired behavior for empty array
             this.ci = {lower: null, upper: null};
             this.histogramData = [];
             console.log(`Cell ${this.id} parsed as empty Data Array.`);
             return true;
        }


        this.parameters = { data: dataValues };
        try {
            this.samples = Calculator.processInlineDataArray(dataValues);
            const stats = Calculator.calculateStats(this.samples);
            this.mean = stats.mean;
            this.ci = stats.ci;
            this.histogramData = stats.histogramData;
            console.log(`Cell ${this.id} parsed as Data Array:`, dataValues, "Mean:", this.mean);
        } catch (e) {
             this.errorState = `Array processing error: ${e.message}`;
             console.error(`Error processing Data Array for ${this.id}:`, e);
        }
        return true;
    }
}

window.Cell = Cell; // Make Cell class globally available for now
console.log('cell.js loaded with Cell class');
