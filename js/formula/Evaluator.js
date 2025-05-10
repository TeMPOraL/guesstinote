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
                // Assumes DistributionGenerator is globally available
                return DistributionGenerator.generateNormalSamplesFromCI(Math.min(leftVal, rightVal), Math.max(leftVal, rightVal));

            case 'FunctionCall':
                const funcName = astNode.name.toLowerCase();
                const evaluatedArgs = astNode.args.map(arg => evaluate(arg, cellsCollection, currentlyEvaluating));

                switch (funcName) {
                    case 'pert':
                        if (evaluatedArgs.some(isNaN)) { 
                            throw new Error(`Evaluator Error: PERT arguments must all evaluate to numbers. Got: ${evaluatedArgs.join(', ')}`);
                        }
                        let min, likely, max, lambda; 
                        if (evaluatedArgs.length === 2) {
                            min = evaluatedArgs[0]; max = evaluatedArgs[1]; likely = (min + max) / 2; lambda = 4;
                        } else if (evaluatedArgs.length === 3) {
                            min = evaluatedArgs[0]; likely = evaluatedArgs[1]; max = evaluatedArgs[2]; lambda = 4;
                        } else if (evaluatedArgs.length === 4) {
                            min = evaluatedArgs[0]; likely = evaluatedArgs[1]; max = evaluatedArgs[2]; lambda = evaluatedArgs[3];
                        } else {
                            throw new Error(`Evaluator Error: PERT function called with incorrect number of arguments (${evaluatedArgs.length}). Expected 2, 3, or 4.`);
                        }
                        if (typeof min !== 'number' || typeof likely !== 'number' || typeof max !== 'number' || typeof lambda !== 'number') {
                             throw new Error(`Evaluator Error: PERT arguments resolved to non-numeric values. min=${min}, likely=${likely}, max=${max}, lambda=${lambda}`);
                        }
                        if (!(min <= likely && likely <= max)) {
                            throw new Error(`Evaluator Error: PERT arguments invalid (min <= likely <= max not met). min=${min}, likely=${likely}, max=${max}, lambda=${lambda}`);
                        }
                        if (min === max) return { type: 'constant', value: min, samples: [min] }; // PERT returning structure
                        // Assumes DistributionGenerator is globally available
                        return { type: 'pert', samples: DistributionGenerator.generatePertSamples(min, likely, max, lambda) };

                    case 'array':
                        if (evaluatedArgs.some(arg => typeof arg !== 'number')) { 
                            throw new Error(`Evaluator Error: Array function arguments must all evaluate to numbers. Got: ${evaluatedArgs}`);
                        }
                        // Assumes DistributionGenerator is globally available
                        return { type: 'dataArray', samples: DistributionGenerator.processInlineDataArray(evaluatedArgs) };
                    
                    default:
                        throw new Error(`Evaluator Error: Unknown function "${astNode.name}"`);
                }

            case 'CellIdentifier':
                const cellId = astNode.name;
                if (currentlyEvaluating.has(cellId)) {
                    throw new Error(`Evaluator Error: Circular dependency detected involving cell "${cellId}"`);
                }
                currentlyEvaluating.add(cellId);

                const cell = cellsCollection[cellId]; // cellsCollection is now passed directly
                if (!cell) {
                    currentlyEvaluating.delete(cellId);
                    throw new Error(`Evaluator Error: Unknown cell identifier "${cellId}"`);
                }

                if (cell.errorState && cell.isDependencyError) {
                    throw new Error(`Evaluator Error: Dependency cell "${cellId}" has an error: ${cell.errorState}`);
                }

                if (cell.needsReevaluation || (!cell.isProcessedInCurrentCycle() && !cell.errorState)) {
                    cell.processFormula(cellsCollection, currentlyEvaluating); 
                    if (cell.errorState) {
                        currentlyEvaluating.delete(cellId); 
                        throw new Error(`Evaluator Error: Dependency cell "${cellId}" encountered an error upon re-evaluation: ${cell.errorState}`);
                    }
                }
                
                let result;
                if (cell.type === 'formulaOnlyConstant' || cell.type === 'constant') {
                    if (typeof cell.value === 'number') result = cell.value;
                    else {
                        currentlyEvaluating.delete(cellId);
                        throw new Error(`Evaluator Error: Constant cell "${cellId}" (value: ${cell.value}) does not have a valid numeric value.`);
                    }
                } else if (cell.type === 'distribution' || cell.type === 'pert' || cell.type === 'normal' || cell.type === 'dataArray') {
                    if (cell.samples && cell.samples.length > 0) {
                        if (cell.samples.length !== Config.getGlobalSamples()) { // Use Config
                             currentlyEvaluating.delete(cellId);
                             throw new Error(`Evaluator Error: Dist cell "${cellId}" samples length mismatch (${cell.samples.length} vs ${Config.getGlobalSamples()}).`);
                        }
                        result = [...cell.samples]; 
                    } else if (Array.isArray(cell.samples) && cell.samples.length === 0) { 
                        result = []; 
                    } else {
                        currentlyEvaluating.delete(cellId);
                        throw new Error(`Evaluator Error: Dist cell "${cellId}" has no valid samples.`);
                    }
                } else if (typeof cell.value === 'number') { 
                    result = cell.value;
                } else {
                    currentlyEvaluating.delete(cellId);
                    throw new Error(`Evaluator Error: Cell "${cellId}" (type: ${cell.type}) inconsistent state.`);
                }
                
                currentlyEvaluating.delete(cellId);
                return result;

            case 'BinaryOp':
                const left = evaluate(astNode.left, cellsCollection, currentlyEvaluating);
                const right = evaluate(astNode.right, cellsCollection, currentlyEvaluating);
                // Assumes DistributionMath is globally available
                return DistributionMath.performBinaryOperation(astNode.operator, left, right);
            
            case 'UnaryOp':
                const operand = evaluate(astNode.operand, cellsCollection, currentlyEvaluating);
                // Assumes DistributionMath is globally available
                return DistributionMath.performUnaryOperation(astNode.operator, operand);

            default:
                throw new Error(`Evaluator Error: Unknown AST node type "${astNode.type}"`);
        }
    }

    return {
        evaluate
    };

})();

window.Evaluator = Evaluator; // Expose globally
console.log('js/formula/Evaluator.js loaded');
