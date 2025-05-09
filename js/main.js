
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
        
        const rawContent = editor.innerHTML; // Or .innerText if we prefer plain text parsing
        const cells = Parser.parse(rawContent);
        
        // TODO: Update cell calculations (Calculator)
        // TODO: Update dependency graph (ReactivityManager - might be part of CellModel or a separate module)
        // TODO: Render cells (Renderer)

        // For now, just log parsed cells
        console.log("Parsed cells:", cells);

        // The renderer will eventually modify editor.innerHTML to add annotations,
        // so we need a strategy to avoid re-parsing rendered output or manage it carefully.
        // One common strategy is to parse the raw input, then render into a separate layer
        // or replace specific placeholders.
        // For contenteditable, it might involve finding cell syntax, replacing it with a
        // non-editable span containing the rendered cell, and storing the original syntax.
    }

    // Expose some functions globally if needed for modules, or use ES6 modules if preferred later.
    // For now, modules are expected to be globals due to simple script includes.
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
