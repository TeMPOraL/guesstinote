// Performs arithmetic operations on sample arrays and scalars.

const DistributionMath = {
    _applyOpToPair: function(op, val1, val2) {
        // Assumes FormulaParser.TOKEN_TYPES is globally available
        switch (op) {
            case FormulaParser.TOKEN_TYPES.PLUS: return val1 + val2;
            case FormulaParser.TOKEN_TYPES.MINUS: return val1 - val2;
            case FormulaParser.TOKEN_TYPES.MUL: return val1 * val2;
            case FormulaParser.TOKEN_TYPES.DIV:
                if (val2 === 0) throw new Error("DistributionMath Error: Division by zero.");
                return val1 / val2;
            case FormulaParser.TOKEN_TYPES.POW: return Math.pow(val1, val2);
            default: throw new Error(`DistributionMath Error: Unknown binary operator ${op}`);
        }
    },

    performBinaryOperation: function(operator, left, right) {
        const leftIsArray = Array.isArray(left);
        const rightIsArray = Array.isArray(right);

        if (!leftIsArray && !rightIsArray) { // Scalar op Scalar
            return this._applyOpToPair(operator, left, right);
        }

        const numSamples = Config.getGlobalSamples(); // Use Config
        let resultSamples = new Array(numSamples);

        if (leftIsArray && !rightIsArray) { // Array op Scalar
            if (left.length !== numSamples) throw new Error("DistributionMath Error: Left operand array length mismatch.");
            for (let i = 0; i < numSamples; i++) {
                resultSamples[i] = this._applyOpToPair(operator, left[i], right);
            }
            return resultSamples;
        }

        if (!leftIsArray && rightIsArray) { // Scalar op Array
            if (right.length !== numSamples) throw new Error("DistributionMath Error: Right operand array length mismatch.");
            for (let i = 0; i < numSamples; i++) {
                resultSamples[i] = this._applyOpToPair(operator, left, right[i]);
            }
            return resultSamples;
        }

        // Array op Array
        if (left.length !== numSamples || right.length !== numSamples) {
            throw new Error("DistributionMath Error: Array operand length mismatch for binary operation.");
        }
        for (let i = 0; i < numSamples; i++) {
            resultSamples[i] = this._applyOpToPair(operator, left[i], right[i]);
        }
        return resultSamples;
    },

    performUnaryOperation: function(operator, operand) {
        const operandIsArray = Array.isArray(operand);

        // Assumes FormulaParser.TOKEN_TYPES is globally available
        if (operator === FormulaParser.TOKEN_TYPES.MINUS) {
            if (!operandIsArray) { // Scalar
                return -operand;
            }
            // Array
            const numSamples = Config.getGlobalSamples(); // Use Config
            if (operand.length !== numSamples) throw new Error("DistributionMath Error: Unary minus operand array length mismatch.");
            let resultSamples = new Array(numSamples);
            for (let i = 0; i < numSamples; i++) {
                resultSamples[i] = -operand[i];
            }
            return resultSamples;
        }
        throw new Error(`DistributionMath Error: Unknown unary operator ${operator}`);
    }
};

window.DistributionMath = DistributionMath; // Expose globally
console.log('js/math/DistributionMath.js loaded');
