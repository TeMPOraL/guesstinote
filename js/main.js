
document.addEventListener('DOMContentLoaded', () => {
    console.log('Guesstinote DOMContentLoaded');

    const editor = document.getElementById('editor');
    const docNameInput = document.getElementById('docName');
    const newDocBtn = document.getElementById('newDocBtn');
    const saveDocBtn = document.getElementById('saveDocBtn');
    const loadDocBtn = document.getElementById('loadDocBtn'); // Will need more complex load UI
    const exportDocBtn = document.getElementById('exportDocBtn');
    const importDocBtn = document.getElementById('importDocBtn');
    const globalSamplesInput = document.getElementById('globalSamples');

    // Initialize the application
    function init() {
        console.log('Initializing Guesstinote...');
        // Load tutorial document or last saved document
        Persistence.loadInitialDocument();
        // Add event listeners
        setupEventListeners();
        // Initial parse and render
        handleContentChange();
    }

    function setupEventListeners() {
        if (editor) {
            // For a contenteditable div, 'input' event is generally best
            editor.addEventListener('input', handleContentChange);
        }

        if (newDocBtn) {
            newDocBtn.addEventListener('click', Persistence.handleNewDocument);
        }
        if (saveDocBtn) {
            saveDocBtn.addEventListener('click', Persistence.handleSaveDocument);
        }
        if (loadDocBtn) {
            // This will likely trigger a modal or a list of documents to load
            loadDocBtn.addEventListener('click', () => Persistence.promptLoadDocument());
        }
        if (exportDocBtn) {
            exportDocBtn.addEventListener('click', Persistence.handleExportDocument);
        }
        if (importDocBtn) {
            importDocBtn.addEventListener('click', Persistence.handleImportDocument);
        }
        if (globalSamplesInput) {
            globalSamplesInput.addEventListener('change', handleContentChange); // Recalculate on sample change
        }
        if (docNameInput) {
            // Potentially save document name on change, or on explicit save
            // For now, it's just a field, Persistence module will read it on save.
        }
    }

    function handleContentChange() {
        // This function will be called whenever the editor content might have changed
        // or when settings like global samples change.
        console.log('Content change detected. Re-parsing and rendering.');
        
        // Old parsing logic - will be replaced by a more robust system
        // const rawContent = editor.innerHTML; 
        // const cells = Parser.parse(rawContent);
        // console.log("Parsed cells:", cells);

        // TODO: Update cell calculations (Calculator) - This will involve creating Cell objects
        // TODO: Update dependency graph (ReactivityManager - might be part of CellModel or a separate module)
        // TODO: Render cells (Renderer) - This will use Cell objects

        // The renderer will eventually modify editor.innerHTML to add annotations,
        // so we need a strategy to avoid re-parsing rendered output or manage it carefully.
        // One common strategy is to parse the raw input, then render into a separate layer
        // or replace specific placeholders.
        // For contenteditable, it might involve finding cell syntax, replacing it with a
        // non-editable span containing the rendered cell, and storing the original syntax.
        
        // Current naive rendering approach:
        const currentHtml = editor.innerHTML;
        // The Parser.parse method currently looks for raw cell definition syntax.
        const parsedCellDefinitions = Parser.parse(currentHtml);

        if (parsedCellDefinitions.length > 0) {
            console.log("Raw cell definitions found for rendering:", parsedCellDefinitions);
            // Renderer.renderAllCellsInEditor replaces raw syntax with styled spans + mock data.
            const newHtml = Renderer.renderAllCellsInEditor(currentHtml, parsedCellDefinitions);
            
            if (editor.innerHTML !== newHtml) {
                // Preserve cursor position if possible (complex with innerHTML changes)
                // For now, this simple update will likely reset cursor.
                editor.innerHTML = newHtml;
            }
        } else {
            // This branch will be hit if no raw un-rendered cell syntax is found.
            // This is expected after initial rendering, or if the document has no cells.
            console.log("No new raw cell definitions found by parser in current content.");
        }
    }

    // Expose some functions globally if needed for modules, or use ES6 modules if preferred later.
    // For now, modules are expected to be globals due to simple script includes.
    // Define Guesstinote object before init() so its methods are available during initialization.
    window.Guesstinote = {
        getEditorContent: () => editor.innerHTML,
        setEditorContent: (html) => { editor.innerHTML = html; },
        getDocName: () => docNameInput.value,
        setDocName: (name) => { docNameInput.value = name; },
        getGlobalSamples: () => parseInt(globalSamplesInput.value, 10) || 5000,
        // Add a function to trigger re-parse and render, e.g., after import
        refreshEditor: handleContentChange 
    };

    init();
});
