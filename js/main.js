
document.addEventListener('DOMContentLoaded', () => {
    console.log('Guesstinote DOMContentLoaded (Two-Pane Editor)');

    const htmlEditor = document.getElementById('htmlEditor'); // Changed from 'editor'
    const previewPane = document.getElementById('previewPane'); // New element
    const docNameInput = document.getElementById('docName');
    const newDocBtn = document.getElementById('newDocBtn');
    const saveDocBtn = document.getElementById('saveDocBtn');
    const loadDocBtn = document.getElementById('loadDocBtn');
    const exportDocBtn = document.getElementById('exportDocBtn');
    const importDocBtn = document.getElementById('importDocBtn');
    const globalSamplesInput = document.getElementById('globalSamplesInput'); // Changed from 'globalSamples'

    // const CellsCollection = {}; // Global store for Cell objects - REMOVED, use CellsCollectionManager
    let processingTimeout = null;
    const PROCESSING_DELAY = 300; // ms to wait after input before processing full calculations

    function initializeApp() {
        console.log('Initializing Guesstinote with two-pane editor...');
        Persistence.loadInitialDocument(); // This will call Guesstinote.setEditorContent
        setupEventListeners();
        // Initial processing is triggered by setEditorContent -> updatePreviewAndProcessAll
    }
    
    function updatePreviewAndProcessAll() {
        const htmlContent = htmlEditor.value;
        previewPane.innerHTML = htmlContent; 

        // Short delay to allow custom elements to connect and run their connectedCallbacks
        // This is a pragmatic approach. A more robust solution might involve MutationObservers
        // or a ready state from custom elements, but that adds complexity.
        setTimeout(() => {
            pruneCellsCollection();
            processCellCalculations();
        }, 50); // Small delay, adjust if needed
    }

    function pruneCellsCollection() {
        // Prune CellsCollection: Remove cells whose <g-cell> tags are no longer in the previewPane.
        const activeCellIds = new Set();
        previewPane.querySelectorAll('g-cell').forEach(el => {
            const id = el.getAttribute('id');
            if (id) activeCellIds.add(id);
        });

        const currentCells = CellsCollectionManager.getCollection();
        for (const id in currentCells) {
            if (!activeCellIds.has(id)) {
                // console.log(`Pruning cell ${id} from CellsCollection.`);
                const cellToRemove = CellsCollectionManager.getCell(id); // Get cell from manager
                if (cellToRemove) {
                    // Notify dependents that this cell is gone
                    cellToRemove.dependents.forEach(depId => {
                        const dependentCell = CellsCollectionManager.getCell(depId); // Get cell from manager
                        if (dependentCell) {
                            dependentCell.dependencies.delete(id);
                            dependentCell.needsReevaluation = true; // Mark for re-evaluation
                        }
                    });
                    // Remove from its dependencies' dependents list
                     cellToRemove.dependencies.forEach(depId => {
                        const dependencyCell = CellsCollectionManager.getCell(depId); // Get cell from manager
                        if (dependencyCell) {
                            dependencyCell.dependents.delete(id);
                        }
                    });
                }
                CellsCollectionManager.removeCell(id); // Remove cell using manager
            }
        }
    }

    function processCellCalculations() {
        // console.log('Processing all cell calculations...');
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
            // console.log(`Calculation iteration ${iterations}`);

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
            console.warn("Max calculation iterations reached. Possible circular dependency or instability.");
            Object.values(currentCells).forEach(cell => {
                if (cell && !cell.isProcessedInCurrentCycle() && !cell.errorState) {
                    // cell.setError("Processing timeout or circular dependency suspected.", false);
                    // cell.notifyElementsToRefresh(); // Ensure error state is rendered
                }
            });
        }
        // console.log("Cell calculations complete. CellsCollection state:", JSON.parse(JSON.stringify(currentCells)));
    }

    function setupEventListeners() {
        htmlEditor.addEventListener('input', () => {
            clearTimeout(processingTimeout);
            processingTimeout = setTimeout(updatePreviewAndProcessAll, PROCESSING_DELAY);
            Persistence.markUnsavedChanges(); // Mark changes on input
        });

        globalSamplesInput.addEventListener('change', () => {
            console.log('Global samples changed, reprocessing all cells.');
            const newSampleCount = parseInt(globalSamplesInput.value, 10);
            if (window.Config && typeof window.Config.updateGlobalSamples === 'function') {
                Config.updateGlobalSamples(newSampleCount);
            }
            const currentCells = CellsCollectionManager.getCollection();
            Object.values(currentCells).forEach(cell => {
                if (cell.type !== 'constant' && cell.type !== 'formulaOnlyConstant') {
                     cell.samples = []; 
                }
                cell.needsReevaluation = true; // Mark all for re-evaluation
            });
            processCellCalculations(); 
            Persistence.markUnsavedChanges();
        });
        
        if (newDocBtn) newDocBtn.addEventListener('click', Persistence.handleNewDocument);
        if (saveDocBtn) saveDocBtn.addEventListener('click', Persistence.handleSaveDocument);
        if (loadDocBtn) loadDocBtn.addEventListener('click', () => Persistence.promptLoadDocument());
        if (exportDocBtn) exportDocBtn.addEventListener('click', Persistence.handleExportDocument);
        if (importDocBtn) importDocBtn.addEventListener('click', Persistence.handleImportDocument);
        
        if (docNameInput) {
            docNameInput.addEventListener('change', () => {
                // If a document is loaded, update its name in the doc list on change
                if (Persistence.currentDocId) {
                    Persistence._updateDocList(Persistence.currentDocId, docNameInput.value);
                    Persistence.markUnsavedChanges(); // Changing name is an unsaved change
                }
            });
        }
    }

    window.Guesstinote = {
        getEditorContent: () => htmlEditor.value,
        setEditorContent: (html) => {
            htmlEditor.value = html;
            updatePreviewAndProcessAll(); // Update preview and trigger all processing
        },
        getDocName: () => docNameInput.value,
        setDocName: (name) => { docNameInput.value = name; },
        // getGlobalSamples is now primarily managed by Config.js, but Guesstinote might still expose it for convenience
        // if it reads directly from Config or the input. For now, direct input read is fine for Guesstinote API.
        getGlobalSamples: () => parseInt(globalSamplesInput.value, 10) || 5000, 
        refreshEditor: updatePreviewAndProcessAll, 
        getCellsCollection: () => CellsCollectionManager.getCollection(), // Use CellsCollectionManager
        // updateCellDOM is no longer needed; custom elements refresh via Cell.notifyElementsToRefresh
    };

    // Initialize Config if it has an init method and Guesstinote is ready
    if (window.Config && typeof window.Config.initialize === 'function') {
        Config.initialize();
    }
    if (window.Config && typeof window.Config.updateGlobalSamples === 'function') {
        Config.updateGlobalSamples(parseInt(globalSamplesInput.value, 10) || 5000); // Initial sync
    }


    initializeApp();
});
