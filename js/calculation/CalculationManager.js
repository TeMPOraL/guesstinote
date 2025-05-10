// Manages the overall calculation lifecycle and reactivity.

const CalculationManager = (() => {
    // This module will eventually house the logic from main.js's
    // processCellCalculations and parts of pruneCellsCollection,
    // and manage the dependency graph updates more centrally.

    // Stores the dependency graph:
    // dependentsMap: cellId -> Set of cell IDs that depend on it.
    // dependenciesMap: cellId -> Set of cell IDs it depends on. (Mirrors cell.dependencies)
    let _dependentsMap = new Map();
    let _dependenciesMap = new Map(); // Primarily for pruning convenience

    function _updateDependencyGraph(cellId, newDependencies, oldDependencies) {
        // Update dependenciesMap for the current cell
        _dependenciesMap.set(cellId, new Set(newDependencies));

        // Update dependentsMap for new dependencies
        newDependencies.forEach(depId => {
            if (!_dependentsMap.has(depId)) {
                _dependentsMap.set(depId, new Set());
            }
            _dependentsMap.get(depId).add(cellId);
        });

        // Update dependentsMap for old dependencies that are no longer dependencies
        oldDependencies.forEach(oldDepId => {
            if (!newDependencies.has(oldDepId)) {
                if (_dependentsMap.has(oldDepId)) {
                    _dependentsMap.get(oldDepId).delete(cellId);
                    if (_dependentsMap.get(oldDepId).size === 0) {
                        _dependentsMap.delete(oldDepId);
                    }
                }
            }
        });
    }
    
    function _clearDependencyGraph() {
        _dependentsMap.clear();
        _dependenciesMap.clear();
    }

    return {
        initialize: function() {
            // console.log("CalculationManager initialized.");
            _clearDependencyGraph();
        },

        processCellCalculations: function() {
            // console.log('CalculationManager: Processing all cell calculations...');
            const currentCells = CellsCollectionManager.getCollection();
            
            for (const id in currentCells) {
                currentCells[id].prepareForReevaluation(); // This sets cell._previousDependencies
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
                        const processResult = cell.processFormula(currentCells); // Now returns { outputChanged }
                        
                        // Update dependency graph based on cell.dependencies and cell._previousDependencies
                        _updateDependencyGraph(cell.id, cell.dependencies, cell._previousDependencies);

                        if (processResult && processResult.outputChanged) {
                            changedInIteration = true;
                            // Trigger dependents
                            const dependentsToUpdate = _dependentsMap.get(cell.id) || new Set();
                            dependentsToUpdate.forEach(dependentId => {
                                if (currentCells[dependentId]) {
                                    currentCells[dependentId].needsReevaluation = true;
                                }
                            });
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
    
            const currentCells = CellsCollectionManager.getCollection(); // Get a snapshot
            const allCellIdsInManager = Object.keys(currentCells);

            allCellIdsInManager.forEach(idToRemove => {
                if (!activeCellIds.has(idToRemove)) {
                    // console.log(`CalculationManager: Pruning cell ${idToRemove}`);
                    
                    // Update dependency graph:
                    // 1. For each cell that idToRemove depended on, remove idToRemove from their dependents list.
                    const dependenciesOfPrunedCell = _dependenciesMap.get(idToRemove) || new Set();
                    dependenciesOfPrunedCell.forEach(depId => {
                        if (_dependentsMap.has(depId)) {
                            _dependentsMap.get(depId).delete(idToRemove);
                            if (_dependentsMap.get(depId).size === 0) {
                                _dependentsMap.delete(depId);
                            }
                        }
                    });
                    _dependenciesMap.delete(idToRemove);

                    // 2. For each cell that depended on idToRemove, remove idToRemove from their dependencies list
                    //    and mark them for re-evaluation.
                    const dependentsOfPrunedCell = _dependentsMap.get(idToRemove) || new Set();
                    dependentsOfPrunedCell.forEach(dependentId => {
                        const dependentCell = currentCells[dependentId]; // Use snapshot
                        if (dependentCell) {
                            dependentCell.dependencies.delete(idToRemove);
                            dependentCell.needsReevaluation = true;
                            // dependentCell.setError(`Dependency '${idToRemove}' was removed.`, true); // Optional
                        }
                    });
                    _dependentsMap.delete(idToRemove);

                    CellsCollectionManager.removeCell(idToRemove); 
                }
            });
        }
    };
})();

window.CalculationManager = CalculationManager; // Expose globally
console.log('js/calculation/CalculationManager.js loaded.');
