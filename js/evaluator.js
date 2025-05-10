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

                // If the cell has an error that was due to a dependency, propagate it.
                // If it's a direct error, it might be fixed by re-evaluation below.
                if (cell.errorState && cell.isDependencyError) {
                    throw new Error(`Evaluator Error: Dependency cell "${cellId}" has an error: ${cell.errorState}`);
                }

                // If a cell needs re-evaluation (is stale) or hasn't been processed in the current cycle
                // and isn't in a stable error state, process it now.
                // This ensures that dependencies are up-to-date before being used.
                if (cell.needsReevaluation || (!cell.isProcessedInCurrentCycle() && !cell.errorState)) {
                    // console.log(`Evaluator: Triggering re-evaluation for stale/unprocessed dependency ${cellId}`);
                    // Pass the current `currentlyEvaluating` set.
                    // Cell.js's processFormula will handle its own ID within this set.
                    cell.processFormula(cellsCollection, currentlyEvaluating); 
                    
                    // After attempting re-evaluation, check for errors again.
                    if (cell.errorState) {
                        // If an error occurred during re-evaluation, throw it.
                        currentlyEvaluating.delete(cellId); // Clean up before throwing
                        throw new Error(`Evaluator Error: Dependency cell "${cellId}" encountered an error upon re-evaluation: ${cell.errorState}`);
                    }
                }
                
                let result;
                // For constant types, always use the scalar value.
                if (cell.type === 'formulaOnlyConstant' || cell.type === 'constant') {
                    if (typeof cell.value === 'number') {
                        result = cell.value;
                    } else {
                        currentlyEvaluating.delete(cellId);
                        throw new Error(`Evaluator Error: Constant cell "${cellId}" (value: ${cell.value}) does not have a valid numeric value after processing.`);
                    }
                } 
                // For distribution types, use samples.
                else if (cell.type === 'distribution' || cell.type === 'pert' || cell.type === 'normal' || cell.type === 'dataArray') { // Explicitly check for distribution types
                    if (cell.samples && cell.samples.length > 0) {
                        // Ensure samples array has the correct global length for actual distributions.
                        // Note: Calculator.processInlineDataArray (for 'array()' function) already ensures this.
                        // Other direct distribution functions in Calculator also generate full sample arrays.
                        // This check is more of a safeguard for unexpected states.
                        if (cell.samples.length !== Calculator.getGlobalSamples()) {
                             currentlyEvaluating.delete(cellId);
                             throw new Error(`Evaluator Error: Distribution cell "${cellId}" has samples array with incorrect length (${cell.samples.length} vs ${Calculator.getGlobalSamples()}).`);
                        }
                        result = [...cell.samples]; 
                    } else if (Array.isArray(cell.samples) && cell.samples.length === 0) { 
                        // An explicitly empty sample array (e.g. from array() function with no arguments).
                        // This will likely cause errors in Calculator.performBinaryOperation.
                        result = []; 
                    } else {
                        // Distribution cell has no/invalid samples after processing and no error state.
                        currentlyEvaluating.delete(cellId);
                        throw new Error(`Evaluator Error: Distribution cell "${cellId}" has no valid samples after processing.`);
                    }
                } else if (typeof cell.value === 'number') { 
                    // Fallback: if type is unknown/null but a scalar value exists (e.g. before full processing or error)
                    // console.warn(`Evaluator: Cell "${cellId}" (type: ${cell.type}) resolved to a scalar value. This might be unexpected for a non-constant type.`);
                    result = cell.value;
                }
                else {
                    // Cell is in an unhandled or inconsistent state.
                    currentlyEvaluating.delete(cellId);
                    throw new Error(`Evaluator Error: Cell "${cellId}" (type: ${cell.type}) is in an inconsistent state. No valid value or samples found.`);
                }
                
                currentlyEvaluating.delete(cellId);
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
