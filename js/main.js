
document.addEventListener('DOMContentLoaded', () => {
    console.log('Guesstinote DOMContentLoaded (Two-Pane Editor)');

    const htmlEditorTextArea = document.getElementById('htmlEditor'); // Changed from 'editor'
    let cmEditor; // To store the CodeMirror instance

    const previewPane = document.getElementById('previewPane'); // New element
    const resizer = document.getElementById('resizer');
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

        // Initialize CodeMirror
        cmEditor = CodeMirror.fromTextArea(htmlEditorTextArea, {
            mode: "htmlmixed",
            lineNumbers: true,
            theme: "default" // Optional: you can add themes by including their CSS
        });
        cmEditor.setSize(null, "100%"); // Set height to 100% of parent, width from CSS

        Persistence.loadInitialDocument(); // This will call Guesstinote.setEditorContent
        setupEventListeners();
        // Initial processing is triggered by setEditorContent -> updatePreviewAndProcessAll
    }
    
    function updatePreviewAndProcessAll() {
        const htmlContent = cmEditor.getValue();
        previewPane.innerHTML = htmlContent; 

        // Short delay to allow custom elements to connect and run their connectedCallbacks
        // This is a pragmatic approach. A more robust solution might involve MutationObservers
        // or a ready state from custom elements, but that adds complexity.
        setTimeout(() => {
            CalculationManager.pruneCellsCollection(); // Use CalculationManager
            CalculationManager.processCellCalculations(); // Use CalculationManager
        }, 50); // Small delay, adjust if needed
    }

    // pruneCellsCollection function has been moved to CalculationManager.js

    // processCellCalculations function has been moved to CalculationManager.js

    function setupDragToResize() {
        let isResizing = false;
        let editorWrapperElement; // Store the CodeMirror wrapper

        resizer.addEventListener('mousedown', (e) => {
            e.preventDefault(); // Prevent text selection or other default actions
            isResizing = true;
            editorWrapperElement = cmEditor.getWrapperElement(); // Get CM's main div

            // Apply styles to prevent text selection during drag
            document.body.style.userSelect = 'none';
            document.body.style.cursor = 'col-resize'; // Optional: change cursor globally

            const startX = e.clientX;
            // Get the initial flex-basis as a number.
            // It might be a percentage initially, so convert to pixels for consistent calculation.
            const initialEditorWidth = editorWrapperElement.offsetWidth;


            function onMouseMove(moveEvent) {
                if (!isResizing) return;
                const deltaX = moveEvent.clientX - startX;
                let newEditorWidth = initialEditorWidth + deltaX;
                
                // Optional: Add min/max width constraints
                const mainPanelWidth = editorWrapperElement.parentElement.offsetWidth;
                const resizerWidth = resizer.offsetWidth;
                const minPaneWidth = 50; // Minimum width for editor and preview panes

                if (newEditorWidth < minPaneWidth) {
                    newEditorWidth = minPaneWidth;
                }
                if (newEditorWidth > mainPanelWidth - resizerWidth - minPaneWidth) {
                    newEditorWidth = mainPanelWidth - resizerWidth - minPaneWidth;
                }

                editorWrapperElement.style.flexBasis = `${newEditorWidth}px`;
                // No need to set previewPane's flexBasis if it's flex: 1, it will adjust.
                // cmEditor.refresh(); // Moved to onMouseUp
            }

            function onMouseUp() {
                if (!isResizing) return;
                isResizing = false;
                
                // Remove global styles
                document.body.style.userSelect = '';
                document.body.style.cursor = '';

                cmEditor.refresh(); // Notify CodeMirror to update its layout once at the end

                document.removeEventListener('mousemove', onMouseMove);
                document.removeEventListener('mouseup', onMouseUp);
            }

            document.addEventListener('mousemove', onMouseMove);
            document.addEventListener('mouseup', onMouseUp);
        });
    }

    function setupEventListeners() {
        setupDragToResize(); // Initialize the resizer logic

        cmEditor.on('change', () => {
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
            CalculationManager.processCellCalculations(); // Use CalculationManager
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
        getEditorContent: () => cmEditor.getValue(),
        setEditorContent: (html) => {
            cmEditor.setValue(html);
            // CodeMirror's setValue might trigger its own 'change' event.
            // If it does, the updatePreviewAndProcessAll might run twice.
            // The existing timeout mechanism should handle this gracefully.
            // Explicitly calling it ensures preview updates if setValue doesn't trigger 'change'
            // or if the event is somehow suppressed.
            updatePreviewAndProcessAll(); 
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

    // Initialize CalculationManager
    if (window.CalculationManager && typeof window.CalculationManager.initialize === 'function') {
        CalculationManager.initialize();
    }

    initializeApp();
});
