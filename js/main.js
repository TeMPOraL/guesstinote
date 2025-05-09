
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

    function unprettifyCell(cellElement) {
        if (!cellElement || !cellElement.classList.contains('guesstimate-cell')) return;

        const rawText = cellElement.dataset.rawText;
        if (typeof rawText !== 'string') return;

        const textNode = document.createTextNode(rawText);
        
        // Ensure the editor is focused before manipulating selection
        editor.focus(); 
        const selection = window.getSelection();
        if (!selection) return;

        // Try to place the cellElement's parent in the current selection's focusNode context
        // This helps if the cellElement was not directly in a text flow that had focus
        let parent = cellElement.parentNode;
        if (!parent) return;

        parent.replaceChild(textNode, cellElement);

        // Set cursor at the end of the un-prettified text
        const range = document.createRange();
        range.selectNodeContents(textNode);
        range.collapse(false); // false means collapse to the end
        selection.removeAllRanges();
        selection.addRange(range);
        
        console.log(`Un-prettified cell, raw text: "${rawText}"`);
    }

    function setupEventListeners() {
        if (editor) {
            editor.addEventListener('input', handleContentChange);

            editor.addEventListener('click', function(event) {
                const targetCell = event.target.closest('.guesstimate-cell');
                if (targetCell) {
                    // We don't want to un-prettify if the click is on an interactive element within the cell later
                    // For now, any click on the cell un-prettifies it.
                    console.log('Clicked on a cell, attempting to un-prettify.');
                    unprettifyCell(targetCell);
                    event.preventDefault(); // Prevent any other default click behavior on the cell
                }
            });

            editor.addEventListener('keydown', function(event) {
                if (event.key === 'Backspace') {
                    const selection = window.getSelection();
                    if (!selection || !selection.isCollapsed || selection.rangeCount === 0) return;

                    const range = selection.getRangeAt(0);
                    let potentialCellToUnprettify = null;

                    // Case 1: Cursor is at the beginning of a text node, cell is previous sibling
                    // e.g., <span class="guesstimate-cell">...</span>|textnode
                    if (range.startContainer.nodeType === Node.TEXT_NODE && range.startOffset === 0) {
                        const prevSibling = range.startContainer.previousSibling;
                        if (prevSibling && prevSibling.nodeType === Node.ELEMENT_NODE && prevSibling.classList.contains('guesstimate-cell')) {
                            potentialCellToUnprettify = prevSibling;
                        }
                    } 
                    // Case 2: Cursor is directly after a cell span within the editor container
                    // e.g., <p><span class="guesstimate-cell">...</span>|</p> or <div id="editor"><span class="guesstimate-cell">...</span>|</div>
                    // The range.startContainer would be the parent element (e.g. P or DIV#editor)
                    // and range.startOffset would indicate the position *after* the cell node.
                    else if (range.startContainer.nodeType === Node.ELEMENT_NODE) {
                         // Check if the node immediately before the cursor is a cell
                        if (range.startOffset > 0) {
                            const nodeBeforeCursor = range.startContainer.childNodes[range.startOffset - 1];
                            if (nodeBeforeCursor && nodeBeforeCursor.nodeType === Node.ELEMENT_NODE && nodeBeforeCursor.classList.contains('guesstimate-cell')) {
                                potentialCellToUnprettify = nodeBeforeCursor;
                            }
                        }
                    }

                    if (potentialCellToUnprettify) {
                        console.log('Backspace at cell boundary, attempting to un-prettify.');
                        event.preventDefault();
                        unprettifyCell(potentialCellToUnprettify);
                    }
                }
            });
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

    function handleContentChange(event) {
        // This function is called on 'input' in the editor.
        // It attempts to find and "prettify" newly typed cell definitions.
        console.log('Content change detected.');

        const selection = window.getSelection();
        if (!selection.rangeCount || selection.isCollapsed === false) return;

        const range = selection.getRangeAt(0);
        const currentNode = range.startContainer;

        // We are interested in changes within text nodes, not inside already rendered cells.
        if (currentNode.nodeType !== Node.TEXT_NODE || 
            (currentNode.parentNode && currentNode.parentNode.closest('.guesstimate-cell'))) {
            // If inside a cell or not a text node, do nothing for now.
            // Future: This is where "un-prettifying" logic might go if backspacing into a cell.
            return;
        }

        const textContent = currentNode.textContent;
        Parser.cellDefinitionRegex.lastIndex = 0; // Reset regex state
        let match;

        // Iterate over all matches in the current text node.
        // This is to handle cases where pasting might introduce multiple cells,
        // or multiple cells are typed quickly.
        // We process them in reverse order of appearance in the text node to avoid issues
        // with range offsets changing as we modify the DOM.
        const matches = [];
        while((match = Parser.cellDefinitionRegex.exec(textContent)) !== null) {
            matches.push(match);
        }

        for (let i = matches.length - 1; i >= 0; i--) {
            const currentMatch = matches[i];
            const rawText = currentMatch[0];
            const idPart = currentMatch[1]; // Optional ID before |
            const namePart = currentMatch[2]; // Name, or ID if idPart is null
            const formulaPart = currentMatch[3];
            // const unitPart = currentMatch[4]; // Unit is removed

            const cellId = idPart ? idPart.trim() : namePart.trim();
            const displayName = namePart.trim();
            const formula = formulaPart.trim();
            const unit = null; // Unit is removed

            // Mock data for rendering, actual calculation will come later
            // This structure should align with what Renderer.renderCell expects
            // and eventually what the Cell model provides.
            let mockMean = Math.random() * 10;
            let mockLower = mockMean - Math.random() * 2;
            let mockUpper = mockMean + Math.random() * 2;
             if (formula.startsWith("PERT")) {
                const nums = formula.match(/\d+(\.\d+)?/g);
                if (nums && nums.length >= 2) { // min, likely, max or min, max
                    mockMean = nums.reduce((sum, v) => sum + parseFloat(v), 0) / nums.length; // very rough
                    mockLower = mockMean * 0.8;
                    mockUpper = mockMean * 1.2;
                }
            } else if (!isNaN(parseFloat(formula))) { // Constant
                mockMean = parseFloat(formula);
                mockLower = mockMean;
                mockUpper = mockMean;
            }

            const cellData = {
                id: cellId,
                displayName: displayName,
                formula: formula,
                unit: unit,
                rawText: rawText, // Crucial for potential "un-prettifying"
                // Mock values for now:
                value: (isNaN(parseFloat(formula)) ? null : parseFloat(formula)), // for constants
                mean: (isNaN(parseFloat(formula)) ? mockMean : null), // null for constants if value is set
                ci: (isNaN(parseFloat(formula)) ? { lower: Math.max(0, mockLower), upper: mockUpper } : null),
                histogramData: Array(10).fill(0).map(() => Math.random() * 10),
                errorState: null
            };
            
            // Create a range that covers exactly the matched raw text in the current text node
            const cellRange = document.createRange();
            cellRange.setStart(currentNode, currentMatch.index);
            cellRange.setEnd(currentNode, currentMatch.index + rawText.length);

            // Create the "prettified" cell span
            const cellSpan = Renderer.renderCell(cellData);

            // Replace the raw text with the prettified span
            cellRange.deleteContents();
            cellRange.insertNode(cellSpan);

            // Attempt to move the cursor after the inserted span
            // This is important for a smooth typing experience.
            const newRange = document.createRange();
            newRange.setStartAfter(cellSpan);
            newRange.collapse(true);
            selection.removeAllRanges();
            selection.addRange(newRange);

            console.log(`Replaced raw cell text "${rawText}" with prettified cell.`);
        }
        // Note: The initial rendering of cells on document load is not handled here yet.
        // This handleContentChange is focused on live typing.
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
