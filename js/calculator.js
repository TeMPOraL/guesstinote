// Handles Monte Carlo simulations and expression evaluation.

const Calculator = {
    
    // FR3.4.2: Global configurable number of samples
    getGlobalSamples: function() {
        // This should ideally come from a central config or UI element
        return window.Guesstinote ? window.Guesstinote.getGlobalSamples() : 5000;
    },

    // Placeholder for PERT distribution
    // FR3.3.3: PERT(min, most_likely, max, lambda=4), PERT(min, most_likely, max), PERT(min, max)
    generatePertSamples: function(min, mostLikely, max, lambda = 4) { // Lambda currently unused by triangular
        const samples = [];
        const numSamples = this.getGlobalSamples();

        if (min > mostLikely || mostLikely > max || min > max) {
            console.error("Invalid PERT parameters for triangular: min <= mostLikely <= max not met.", {min, mostLikely, max});
            // Fill with a fallback or throw error
            for (let i = 0; i < numSamples; i++) samples.push((min + mostLikely + max) / 3); // Fallback to mean
            return samples.sort((a,b) => a-b);
        }
        if (min === max) { // All values are the same
             for (let i = 0; i < numSamples; i++) samples.push(min);
             return samples; // Already sorted
        }

        // Using Triangular Distribution as an approximation for PERT
        // (Actual PERT uses Beta distribution, lambda would shape it)
        // For triangular:
        // F(c) = (c - a) / (b - a), where c is mostLikely, a is min, b is max
        const fc = (mostLikely - min) / (max - min);

        for (let i = 0; i < numSamples; i++) {
            const rand = Math.random();
            let sample;
            if (rand < fc) {
                sample = min + Math.sqrt(rand * (max - min) * (mostLikely - min));
            } else {
                sample = max - Math.sqrt((1 - rand) * (max - min) * (max - mostLikely));
            }
            samples.push(sample);
        }
        // console.log(`Generated ${numSamples} triangular samples for PERT(${min}, ${mostLikely}, ${max})`);
        return samples.sort((a, b) => a - b);
    },

    // Placeholder for Normal distribution from 90% CI
    // FR3.3.4: Normal from 90% CI (value1 to value2)
    generateNormalSamplesFromCI: function(ciLower, ciUpper) {
        const samples = [];
        const numSamples = this.getGlobalSamples();
        const mean = (ciLower + ciUpper) / 2;
        const stdDev = (ciUpper - mean) / 1.645; // 1.645 for 90% CI (Z-score for 0.95)

        // Using Box-Muller transform (simplified) for generating normal samples
        for (let i = 0; i < numSamples; i++) {
            // Standard Box-Muller requires two uniform random numbers
            // This is a simplified version, for a proper one, look up Box-Muller.
            let u1 = Math.random();
            let u2 = Math.random();
            let z0 = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
            // z0 is a standard normal variate (mean 0, stdDev 1)
            samples.push(mean + stdDev * z0);
        }
        return samples.sort((a, b) => a - b);
    },

    // Placeholder for inline data array
    // FR3.3.5: Upsample/downsample to global sample count
    processInlineDataArray: function(dataArray) {
        if (!dataArray || dataArray.length === 0) {
            return []; // Return an empty array if input is empty
        }

        const numSamples = this.getGlobalSamples();
        if (dataArray.length === numSamples) {
            return [...dataArray].sort((a,b) => a-b);
        }
        // Naive resampling (with replacement if upsampling, random selection if downsampling)
        const resampled = [];
        for (let i = 0; i < numSamples; i++) {
            resampled.push(dataArray[Math.floor(Math.random() * dataArray.length)]);
        }
        return resampled.sort((a, b) => a - b);
    },

    // Calculate statistics from samples
    calculateStats: function(samples) {
        if (!samples || samples.length === 0) {
            return { mean: null, ci: { lower: null, upper: null }, histogramData: [] };
        }
        const sum = samples.reduce((acc, val) => acc + val, 0);
        const mean = sum / samples.length;

        // For CI, samples should be sorted
        const lowerIndex = Math.floor(samples.length * 0.05); // 5th percentile
        const upperIndex = Math.ceil(samples.length * 0.95) -1; // 95th percentile

        const ci = {
            lower: samples[lowerIndex],
            upper: samples[upperIndex]
        };

        // Basic histogram data (e.g., 10 bins)
        // This is a very simple histogram binning.
        const minVal = samples[0];
        const maxVal = samples[samples.length - 1];
        const binSize = (maxVal - minVal) / 10 || 1; // Avoid division by zero if all values are same
        const histogramData = Array(10).fill(0);
        if (maxVal > minVal) { // only bin if there's a range
            for (const val of samples) {
                let binIndex = Math.floor((val - minVal) / binSize);
                if (binIndex >= 10) binIndex = 9; // Clamp to last bin
                if (binIndex < 0) binIndex = 0; // Should not happen if val >= minVal
                histogramData[binIndex]++;
            }
        } else if (samples.length > 0) { // all values are the same
            histogramData[0] = samples.length; // put all in the first bin
        }


        return { mean, ci, histogramData };
    },

    // Placeholder for expression evaluation
    // FR3.4.3, FR3.4.4: Arithmetic operations on scalars and distributions
    evaluateExpression: function(formula, cellsMap) {
        // This is a major task and will require a proper expression parser and evaluator.
        // It needs to handle:
        // - Numbers
        // - Cell ID references (looking up their sample arrays from cellsMap)
        // - Operators: +, -, *, /, ^
        // - Operator precedence
        // - Functions like PERT(), NORMAL(), etc.
        // For now, this is a stub.
        console.warn("Calculator.evaluateExpression is a non-functional stub.");
        // Example: if formula is "CellA + CellB"
        // 1. Parse formula into tokens: CellA, +, CellB
        // 2. Get samples for CellA and CellB from cellsMap.
        // 3. Perform element-wise addition on sample arrays.
        // 4. Return new sample array.
        return [1, 2, 3, 4, 5]; // Placeholder samples
    },

    // --- Distribution Arithmetic Helpers ---

    _applyOpToPair: function(op, val1, val2) {
        switch (op) {
            case FormulaParser.TOKEN_TYPES.PLUS: return val1 + val2;
            case FormulaParser.TOKEN_TYPES.MINUS: return val1 - val2;
            case FormulaParser.TOKEN_TYPES.MUL: return val1 * val2;
            case FormulaParser.TOKEN_TYPES.DIV:
                if (val2 === 0) throw new Error("Calculator Error: Division by zero.");
                return val1 / val2;
            case FormulaParser.TOKEN_TYPES.POW: return Math.pow(val1, val2);
            default: throw new Error(`Calculator Error: Unknown binary operator ${op}`);
        }
    },

    performBinaryOperation: function(operator, left, right) {
        const leftIsArray = Array.isArray(left);
        const rightIsArray = Array.isArray(right);

        if (!leftIsArray && !rightIsArray) { // Scalar op Scalar
            return this._applyOpToPair(operator, left, right);
        }

        const numSamples = this.getGlobalSamples();
        let resultSamples = new Array(numSamples);

        if (leftIsArray && !rightIsArray) { // Array op Scalar
            if (left.length !== numSamples) throw new Error("Calculator Error: Left operand array length mismatch.");
            for (let i = 0; i < numSamples; i++) {
                resultSamples[i] = this._applyOpToPair(operator, left[i], right);
            }
            return resultSamples;
        }

        if (!leftIsArray && rightIsArray) { // Scalar op Array
            if (right.length !== numSamples) throw new Error("Calculator Error: Right operand array length mismatch.");
            for (let i = 0; i < numSamples; i++) {
                resultSamples[i] = this._applyOpToPair(operator, left, right[i]);
            }
            return resultSamples;
        }

        // Array op Array
        if (left.length !== numSamples || right.length !== numSamples) {
            throw new Error("Calculator Error: Array operand length mismatch for binary operation.");
        }
        for (let i = 0; i < numSamples; i++) {
            resultSamples[i] = this._applyOpToPair(operator, left[i], right[i]);
        }
        return resultSamples;
    },

    performUnaryOperation: function(operator, operand) {
        const operandIsArray = Array.isArray(operand);

        if (operator === FormulaParser.TOKEN_TYPES.MINUS) {
            if (!operandIsArray) { // Scalar
                return -operand;
            }
            // Array
            const numSamples = this.getGlobalSamples();
            if (operand.length !== numSamples) throw new Error("Calculator Error: Unary minus operand array length mismatch.");
            let resultSamples = new Array(numSamples);
            for (let i = 0; i < numSamples; i++) {
                resultSamples[i] = -operand[i];
            }
            return resultSamples;
        }
        throw new Error(`Calculator Error: Unknown unary operator ${operator}`);
    }
};

console.log('calculator.js loaded');
