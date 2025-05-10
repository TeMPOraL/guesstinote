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
                        if (evaluatedArgs.some(isNaN)) { // Ensure all args evaluated to numbers
                            throw new Error(`Evaluator Error: PERT arguments must all evaluate to numbers. Got: ${evaluatedArgs.join(', ')}`);
                        }

                        let min, likely, max, lambda; 

                        if (evaluatedArgs.length === 2) {
                            min = evaluatedArgs[0];
                            max = evaluatedArgs[1];
                            likely = (min + max) / 2;
                            lambda = 4; // Default lambda
                        } else if (evaluatedArgs.length === 3) {
                            min = evaluatedArgs[0];
                            likely = evaluatedArgs[1];
                            max = evaluatedArgs[2];
                            lambda = 4; // Default lambda
                        } else if (evaluatedArgs.length === 4) {
                            min = evaluatedArgs[0];
                            likely = evaluatedArgs[1];
                            max = evaluatedArgs[2];
                            lambda = evaluatedArgs[3];
                        } else {
                            throw new Error(`Evaluator Error: PERT function called with incorrect number of arguments (${evaluatedArgs.length}). Expected 2, 3, or 4.`);
                        }

                        if (typeof min !== 'number' || typeof likely !== 'number' || typeof max !== 'number' || typeof lambda !== 'number') {
                             throw new Error(`Evaluator Error: PERT arguments resolved to non-numeric values. min=${min}, likely=${likely}, max=${max}, lambda=${lambda}`);
                        }

                        if (!(min <= likely && likely <= max)) {
                            throw new Error(`Evaluator Error: PERT arguments invalid (min <= likely <= max not met). min=${min}, likely=${likely}, max=${max}, lambda=${lambda}`);
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
                const cellId = astNode.name;
                if (currentlyEvaluating.has(cellId)) {
                    throw new Error(`Evaluator Error: Circular dependency detected involving cell "${cellId}"`);
                }
                currentlyEvaluating.add(cellId);

                const cell = cellsCollection[cellId];
                if (!cell) {
                    currentlyEvaluating.delete(cellId);
                    throw new Error(`Evaluator Error: Unknown cell identifier "${cellId}"`);
                }

                // If the cell itself had a parsing/evaluation error, propagate that.
                // This is crucial for the reactive chain.
                if (cell.errorState) {
                    // We don't delete from currentlyEvaluating here, as this path is an error propagation,
                    // not a successful evaluation completion for this specific identifier.
                    // The deletion will happen when the original evaluation that led here unwinds.
                    throw new Error(`Dependency cell "${cellId}" has an error: ${cell.errorState}`);
                }
                
                // A cell's processFormula (which calls this evaluator) should have populated samples/value.
                // If a cell is in the collection, it's assumed to have been processed.
                // The iterative loop in processFullDocument or reactive updates should handle this.
                let result;
                // Check if samples exist and have content, or if it's a scalar value.
                if (cell.samples && cell.samples.length > 0) {
                    result = [...cell.samples]; // Return a copy of samples
                } else if (typeof cell.value === 'number') {
                    result = cell.value; // Return scalar value
                } else if (Array.isArray(cell.samples) && cell.samples.length === 0) { 
                    // Handles explicitly empty arrays, e.g., from array()
                    result = [];
                }
                else {
                    // This state implies the cell hasn't been successfully evaluated yet,
                    // or it's part of an unresolvable cycle not caught by the simple check,
                    // or its evaluation resulted in no value/samples without an error.
                    // This should ideally be caught by the iterative processing or a more robust graph traversal.
                    // For now, if it's truly unevaluated, this is an issue.
                    currentlyEvaluating.delete(cellId); // Clean up before throwing
                    throw new Error(`Evaluator Error: Cell "${cellId}" is not yet evaluated or has an inconsistent state.`);
                }
                
                currentlyEvaluating.delete(cellId); // Successful evaluation of this identifier
                return result;

            case 'BinaryOp':
                const left = evaluate(astNode.left, cellsCollection, currentlyEvaluating);
                const right = evaluate(astNode.right, cellsCollection, currentlyEvaluating);
                return Calculator.performBinaryOperation(astNode.operator, left, right);
            
            case 'UnaryOp':
                const operand = evaluate(astNode.operand, cellsCollection, currentlyEvaluating);
                return Calculator.performUnaryOperation(astNode.operator, operand);

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
