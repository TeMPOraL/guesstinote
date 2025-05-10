// Manages the global collection of Cell objects.

const CellsCollectionManager = (() => {
    const _cellsCollection = {};

    return {
        getCollection: function() {
            return _cellsCollection;
        },

        getCell: function(cellId) {
            return _cellsCollection[cellId];
        },

        addCell: function(cellInstance) {
            if (cellInstance && cellInstance.id) {
                _cellsCollection[cellInstance.id] = cellInstance;
            } else {
                console.error("CellsCollectionManager: Attempted to add invalid cell instance.", cellInstance);
            }
        },

        removeCell: function(cellId) {
            // Complex removal logic including updating dependencies/dependents
            // of other cells might be needed here or in CalculationManager.
            // For now, simple deletion. Pruning logic in main.js handles some of this.
            delete _cellsCollection[cellId];
        },

        clear: function() {
            for (const id in _cellsCollection) {
                delete _cellsCollection[id];
            }
        }
        // Future: Add methods for pruning, etc., if moved from main.js
    };
})();

window.CellsCollectionManager = CellsCollectionManager;
console.log('js/cell/CellsCollectionManager.js loaded');
