// Guesstinote - AST Evaluator
// Evaluates an AST node to produce a result (typically samples or a scalar).

const Evaluator = (() => {

    // Main evaluation function
    // currentlyEvaluating is a Set to detect circular dependencies
    function evaluate(astNode, cellsCollection, currentlyEvaluating = new Set()) {
        if (!astNode) {
            throw new Error("Evaluator Error: AST node cannot be null or undefined.");
        }

        // console.log(`Evaluating AST Node: ${astNode.type}`, astNode, "Currently evaluating:", new Set(currentlyEvaluating));

        switch (astNode.type) {
            case 'NumberLiteral':
                return astNode.value; // Returns a scalar

            case 'RangeExpression': // e.g., "X to Y"
                const leftVal = evaluate(astNode.left, cellsCollection, currentlyEvaluating);
                const rightVal = evaluate(astNode.right, cellsCollection, currentlyEvaluating);
                if (typeof leftVal !== 'number' || typeof rightVal !== 'number') {
                    throw new Error("Evaluator Error: Arguments for 'X to Y' range must evaluate to numbers.");
                }
                // Returns an array of samples
                return Calculator.generateNormalSamplesFromCI(Math.min(leftVal, rightVal), Math.max(leftVal, rightVal));

            case 'FunctionCall':
                const funcName = astNode.name.toLowerCase();
                const evaluatedArgs = astNode.args.map(arg => evaluate(arg, cellsCollection, currentlyEvaluating));

                switch (funcName) {
                    case 'pert':
                        if (evaluatedArgs.length < 2 || evaluatedArgs.length > 4 || evaluatedArgs.some(isNaN)) {
                            throw new Error(`Evaluator Error: PERT function called with invalid arguments: ${evaluatedArgs.join(', ')}`);
                        }
                        let [min, likely, max, lambda = 4] = evaluatedArgs;
                        if (evaluatedArgs.length === 2) { // PERT(min, max)
                            likely = (min + max) / 2;
                        } else if (evaluatedArgs.length === 3) { // PERT(min, likely, max)
                            // max is already set, lambda uses default
                        } // else 4 args, all set

                        if (!(min <= likely && likely <= max)) {
                            throw new Error(`Evaluator Error: PERT arguments invalid (min <= likely <= max not met). min=${min}, likely=${likely}, max=${max}`);
                        }
                        if (min === max) return [min]; // Treat as constant, return array of one sample
                        // Returns an array of samples
                        return Calculator.generatePertSamples(min, likely, max, lambda);

                    case 'array':
                        if (evaluatedArgs.some(arg => typeof arg !== 'number')) { // Stricter check after evaluation
                            throw new Error(`Evaluator Error: Array function arguments must all evaluate to numbers. Got: ${evaluatedArgs}`);
                        }
                        // Returns an array of samples (potentially resampled)
                        return Calculator.processInlineDataArray(evaluatedArgs);
                    
                    default:
                        throw new Error(`Evaluator Error: Unknown function "${astNode.name}"`);
                }

            case 'CellIdentifier':
                // TODO: Implement CellIdentifier evaluation
                // - Check for circular dependencies using `currentlyEvaluating`
                // - Get the referenced cell from `cellsCollection`
                // - Ensure it's evaluated (call its processFormula/evaluate if needed)
                // - Return its result (samples or value)
                throw new Error(`Evaluator Error: CellIdentifier "${astNode.name}" evaluation not yet implemented.`);

            case 'BinaryOp':
                // TODO: Implement BinaryOp evaluation
                // - Evaluate left and right operands
                // - Perform the operation (scalar-scalar, scalar-distribution, distribution-distribution)
                throw new Error(`Evaluator Error: BinaryOp "${astNode.operator}" evaluation not yet implemented.`);
            
            case 'UnaryOp':
                 // TODO: Implement UnaryOp evaluation
                throw new Error(`Evaluator Error: UnaryOp "${astNode.operator}" evaluation not yet implemented.`);

            default:
                throw new Error(`Evaluator Error: Unknown AST node type "${astNode.type}"`);
        }
    }

    return {
        evaluate
    };

})();

window.Evaluator = Evaluator;
console.log('evaluator.js loaded');
