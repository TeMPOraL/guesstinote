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

        // The pruneCells method will be moved here later if desired.
        // For now, keeping it in main.js to minimize changes in one go.
        pruneCells: function(activeCellIds, cellsCollection) {
            // Placeholder for pruning logic.
            console.warn("CalculationManager.pruneCells is a placeholder. Logic still in main.js");
        }
    };
})();

window.CalculationManager = CalculationManager; // Expose globally
console.log('js/calculation/CalculationManager.js loaded.');
