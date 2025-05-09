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
        if (this._parseAsPert(formula)) return;
        if (this._parseAsDataArray(formula)) return;

        // If none of the above, it's a complex formula (or an error)
        // For now, we just mark it and don't calculate.
        // TODO: Implement formula evaluation (e.g., CellA + CellB)
        this.type = 'formula';
        this.parameters = {}; // No specific parameters for a generic formula yet
        this.errorState = `Complex formula (not yet supported): "${formula}"`;
        console.log(`Cell ${this.id} ${this.errorState}`);
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

    _parseAsPert(formula) {
        const pertMatch = formula.match(/^PERT\s*\(([^)]*)\)\s*$/i);
        if (pertMatch) {
            this.type = 'pert';
            const argsString = pertMatch[1];
            const args = argsString.split(',').map(arg => parseFloat(arg.trim()));

            if (args.some(isNaN)) {
                this.errorState = `PERT: Invalid arguments (not all numbers) in "${argsString}"`;
                console.error(`Cell ${this.id} ${this.errorState}`);
                return true; // Matched PERT but failed to parse args
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
        return false;
    }
    
    _parseAsDataArray(formula) {
        const arrayMatch = formula.match(/^\s*\[\s*((?:[-+]?\d+(\.\d+)?\s*,\s*)*[-+]?\d+(\.\d+)?)\s*\]\s*$/);
        if (arrayMatch && arrayMatch[1]) {
            this.type = 'dataArray';
            try {
                const dataValues = arrayMatch[1].split(',').map(s => parseFloat(s.trim()));
                if (dataValues.some(isNaN)) {
                    this.errorState = `Data Array: Invalid numbers in "${arrayMatch[1]}"`;
                    console.error(`Cell ${this.id} ${this.errorState}`);
                    return true; // Matched Data Array but failed to parse values
                }
                this.parameters = { data: dataValues };
                this.samples = Calculator.processInlineDataArray(dataValues);
                const stats = Calculator.calculateStats(this.samples);
                this.mean = stats.mean;
                this.ci = stats.ci;
                this.histogramData = stats.histogramData;
                console.log(`Cell ${this.id} parsed as Data Array:`, dataValues, "Mean:", this.mean);
            } catch (e) {
                 this.errorState = `Data Array processing error: ${e.message}`;
                 console.error(`Error processing Data Array for ${this.id}:`, e);
            }
            return true;
        }
        return false;
    }
}

window.Cell = Cell; // Make Cell class globally available for now
console.log('cell.js loaded with Cell class');
