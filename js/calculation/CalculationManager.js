// Manages the overall calculation lifecycle and reactivity.

const CalculationManager = (() => {
    // This module will eventually house the logic from main.js's
    // processCellCalculations and parts of pruneCellsCollection,
    // and manage the dependency graph updates more centrally.

    return {
        initialize: function() {
            // console.log("CalculationManager initialized.");
        },

        processCellCalculations: function() {
            // console.log('CalculationManager: Processing all cell calculations...');
            const currentCells = CellsCollectionManager.getCollection();
            
            for (const id in currentCells) {
                currentCells[id].prepareForReevaluation();
            }
            
            const cellsToProcess = Object.keys(currentCells);
            let maxIterations = cellsToProcess.length * 2 + 10; 
            let iterations = 0;
            let changedInIteration = true;

            while (changedInIteration && iterations < maxIterations) {
                changedInIteration = false;
                iterations++;
                // console.log(`CalculationManager: Calculation iteration ${iterations}`);

                cellsToProcess.forEach(cellId => {
                    const cell = currentCells[cellId];
                    if (cell && (cell.needsReevaluation || !cell.isProcessedInCurrentCycle())) { 
                        // processFormula defaults to using CellsCollectionManager.getCollection() if no arg passed,
                        // or we can pass currentCells explicitly.
                        if (cell.processFormula(currentCells)) { 
                            changedInIteration = true;
                        }
                    }
                });
                Object.values(currentCells).forEach(c => c.resetProcessedFlag());
            }

            if (iterations >= maxIterations) {
                console.warn("CalculationManager: Max calculation iterations reached. Possible circular dependency or instability.");
                Object.values(currentCells).forEach(cell => {
                    if (cell && !cell.isProcessedInCurrentCycle() && !cell.errorState) {
                        // cell.setError("Processing timeout or circular dependency suspected.", false);
                        // cell.notifyElementsToRefresh(); // Ensure error state is rendered
                    }
                });
            }
            // console.log("CalculationManager: Cell calculations complete. CellsCollection state:", JSON.parse(JSON.stringify(currentCells)));
        },

        pruneCellsCollection: function() {
            // Prune CellsCollection: Remove cells whose <g-cell> tags are no longer in the previewPane
            // This function needs access to the previewPane DOM element.
            // For now, we'll assume it can get it or it's passed, but ideally,
            // CalculationManager shouldn't directly access DOM elements outside its scope.
            // This might indicate a need for a higher-level orchestrator or event system.
            // For this refactor step, we'll replicate the logic and address DOM access later if needed.
            const previewPane = document.getElementById('previewPane'); // Direct DOM access - consider alternatives
            if (!previewPane) {
                console.error("CalculationManager.pruneCellsCollection: previewPane not found.");
                return;
            }

            const activeCellIds = new Set();
            previewPane.querySelectorAll('g-cell').forEach(el => {
                const id = el.getAttribute('id');
                if (id) activeCellIds.add(id);
            });
    
            const currentCells = CellsCollectionManager.getCollection();
            for (const id in currentCells) {
                if (!activeCellIds.has(id)) {
                    // console.log(`CalculationManager: Pruning cell ${id} from CellsCollection.`);
                    const cellToRemove = CellsCollectionManager.getCell(id);
                    if (cellToRemove) {
                        // Notify dependents that this cell is gone
                        cellToRemove.dependents.forEach(depId => {
                            const dependentCell = CellsCollectionManager.getCell(depId);
                            if (dependentCell) {
                                dependentCell.dependencies.delete(id);
                                dependentCell.needsReevaluation = true; 
                            }
                        });
                        // Remove from its dependencies' dependents list
                         cellToRemove.dependencies.forEach(depId => {
                            const dependencyCell = CellsCollectionManager.getCell(depId);
                            if (dependencyCell) {
                                dependencyCell.dependents.delete(id);
                            }
                        });
                    }
                    CellsCollectionManager.removeCell(id); 
                }
            }
        }
    };
})();

window.CalculationManager = CalculationManager; // Expose globally
console.log('js/calculation/CalculationManager.js loaded.');
