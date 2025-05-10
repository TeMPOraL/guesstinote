
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

    const CellsCollection = {}; // Global store for Cell objects

    function _createOrUpdateCell(id, displayName, formula, rawText) {
        let cell = CellsCollection[id];
        if (!cell) {
            cell = new Cell(id, displayName, formula, rawText);
            CellsCollection[id] = cell;
        } else {
            // Cell exists, update its formula and rawText, then reprocess
            cell.displayName = displayName; // Display name might change if ID part was absent
            cell.updateFormula(formula, rawText);
        }
        return cell;
    }

    function _replaceTextRangeWithNode(textNode, startIndex, length, replacementNode) {
        const range = document.createRange();
        range.setStart(textNode, startIndex);
        range.setEnd(textNode, startIndex + length);
        range.deleteContents();
        range.insertNode(replacementNode);
        return replacementNode; // Return the inserted node for convenience (e.g., cursor placement)
    }

    // Initialize the application
    function init() {
        console.log('Initializing Guesstinote...');
        // Load tutorial document or last saved document
        Persistence.loadInitialDocument(); // This will call Guesstinote.refreshEditor -> processFullDocument
        // Add event listeners
        setupEventListeners();
        // Initial parse and render is now handled by refreshEditor called from Persistence
    }
    
    function processFullDocument() {
        console.log('Processing full document content...');
        const editorContent = editor.innerHTML;
        // We need to parse text nodes and replace cell definitions.
        // This is a simplified initial pass. A robust solution would traverse the DOM.
        // For now, we'll assume content is primarily text or simple P tags.
        
        // Clear existing cells from collection before reprocessing full doc
        // to avoid issues with stale cells if definitions are removed from text.
        // This is a blunt approach; a more refined one would diff.
        for (const key in CellsCollection) {
            delete CellsCollection[key];
        }

        let newHtml = editorContent; // Start with current HTML
        
        // Create a temporary div to parse and manipulate HTML structure safely
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = editorContent;

        // Walk the DOM tree of tempDiv
        const walk = document.createTreeWalker(tempDiv, NodeFilter.SHOW_TEXT, null, false);
        let node;
        const nodesToProcess = [];
        while(node = walk.nextNode()) {
            nodesToProcess.push(node);
        }

        let modified = false;
        // Process text nodes in reverse to handle modifications safely
        for (let i = nodesToProcess.length - 1; i >= 0; i--) {
            const textNode = nodesToProcess[i];
            if (textNode.parentNode && textNode.parentNode.closest('.guesstimate-cell')) {
                continue; // Skip text inside already rendered cells
            }

            const textContent = textNode.textContent;
            Parser.cellDefinitionRegex.lastIndex = 0;
            let match;
            const cellMatchesInNode = [];
            while((match = Parser.cellDefinitionRegex.exec(textContent)) !== null) {
                cellMatchesInNode.push(match);
            }

            for (let j = cellMatchesInNode.length - 1; j >= 0; j--) {
                const currentMatch = cellMatchesInNode[j];
                const rawText = currentMatch[0];
                const idPart = currentMatch[1];
                const namePart = currentMatch[2];
                const formulaPart = currentMatch[3];

                const cellId = idPart ? idPart.trim() : namePart.trim();
                const displayName = namePart.trim();
                const formula = formulaPart.trim();

                const cell = _createOrUpdateCell(cellId, displayName, formula, rawText);
                const cellSpan = Renderer.renderCell(cell);
                _replaceTextRangeWithNode(textNode, currentMatch.index, rawText.length, cellSpan);
                modified = true;
            }
        }
        
        if (modified) {
            // If modifications happened, update the actual editor's content
            // This replaces the entire content, so cursor position is lost.
            // This is acceptable for initial load.
            window.Guesstinote.setEditorContent(tempDiv.innerHTML);
        }
        
        // Iterative recalculation to handle dependencies
        // This is a simple approach. A more sophisticated one would use a dirty flag or topological sort.
        const maxIterations = Object.keys(CellsCollection).length + 5; // Heuristic for iterations
        console.log(`Starting iterative recalculation, max iterations: ${maxIterations}`);
        for (let i = 0; i < maxIterations; i++) {
            let changedInIteration = false;
            for (const cellId in CellsCollection) {
                const cell = CellsCollection[cellId];
                // cell.processFormula() now returns true if the cell's state changed,
                // and handles its own DOM update and triggers dependents.
                if (cell.processFormula()) {
                    changedInIteration = true;
                }
            }
            if (!changedInIteration && i > 0) { // Ensure at least one full pass after initial, then check for convergence
                console.log(`Recalculation converged after ${i + 1} iterations.`);
                break;
            }
            if (i === maxIterations - 1) {
                console.warn("Recalculation reached max iterations. Possible complex dependency or instability.");
            }
        }
        
        // Final render pass after all calculations have settled
        // This is needed because cell.processFormula() might trigger updates,
        // but the DOM for the *current* cell being processed in the loop above
        // isn't updated until its turn. This ensures all DOM elements reflect final state.
        // This is inefficient and will be improved with targeted rendering.
        console.log("Performing final render pass after iterative calculations.");
        const finalEditorContent = document.createElement('div');
        finalEditorContent.innerHTML = window.Guesstinote.getEditorContent(); // Get current state which might have raw text
        
        const finalWalk = document.createTreeWalker(finalEditorContent, NodeFilter.SHOW_TEXT, null, false);
        let finalNode;
        const finalTextNodes = [];
        while(finalNode = finalWalk.nextNode()) {
            finalTextNodes.push(finalNode);
        }
        let finalRenderModified = false;
        for (let i = finalTextNodes.length - 1; i >= 0; i--) {
            const textNode = finalTextNodes[i];
            if (textNode.parentNode && textNode.parentNode.closest('.guesstimate-cell')) continue;

            const textContent = textNode.textContent;
            Parser.cellDefinitionRegex.lastIndex = 0;
            let match;
            const cellMatchesInNode = [];
            while((match = Parser.cellDefinitionRegex.exec(textContent)) !== null) cellMatchesInNode.push(match);

            for (let j = cellMatchesInNode.length - 1; j >= 0; j--) {
                const currentMatch = cellMatchesInNode[j];
                const rawText = currentMatch[0];
                const idPart = currentMatch[1];
                const namePart = currentMatch[2];
                // formulaPart is not needed here as cell already exists and has its formula

                const cellId = idPart ? idPart.trim() : namePart.trim();
                const cell = CellsCollection[cellId];
                if (cell) { // Only render if cell exists in collection
                    const cellSpan = Renderer.renderCell(cell);
                    _replaceTextRangeWithNode(textNode, currentMatch.index, rawText.length, cellSpan);
                    finalRenderModified = true;
                }
            }
        }
        if (finalRenderModified) {
             window.Guesstinote.setEditorContent(finalEditorContent.innerHTML);
        }


        console.log("Full document processing complete. CellsCollection:", CellsCollection);
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
            // When global samples change, all cells need to be reprocessed.
            globalSamplesInput.addEventListener('change', () => {
                console.log('Global samples changed, reprocessing full document.');
                if (window.Guesstinote && typeof window.Guesstinote.refreshEditor === 'function') {
                    window.Guesstinote.refreshEditor();
                }
            });
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

            const cell = _createOrUpdateCell(cellId, displayName, formula, rawText);
            const cellSpan = _replaceTextRangeWithNode(
                currentNode, 
                currentMatch.index, 
                rawText.length, 
                Renderer.renderCell(cell)
            );

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
        // refreshEditor will now process the whole document
        refreshEditor: processFullDocument,
        getCellsCollection: () => CellsCollection, // Expose CellsCollection for Evaluator via Cell
        updateCellDOM: (cellId) => { // New function to update a specific cell's DOM
            const cell = CellsCollection[cellId];
            if (!cell) {
                console.warn(`updateCellDOM: Cell ${cellId} not found in CellsCollection.`);
                return;
            }

            const editorNode = document.getElementById('editor');
            if (!editorNode) return;

            const cellInstances = editorNode.querySelectorAll(`.guesstimate-cell[data-cell-id="${cellId}"]`);

            if (cellInstances.length === 0) {
                // This can occur if a cell is part of a formula but not directly rendered,
                // or if its definition was just typed and initial render is in progress.
                // console.log(`updateCellDOM: No DOM instances found for cell ${cellId}.`);
                return;
            }

            // console.log(`updateCellDOM: Updating ${cellInstances.length} DOM instance(s) for cell ${cellId}`);
            cellInstances.forEach(cellSpan => {
                const newCellSpan = Renderer.renderCell(cell); // cell object has all data
                if (cellSpan.parentNode) {
                    cellSpan.parentNode.replaceChild(newCellSpan, cellSpan);
                }
            });
        }
    };

    init();
});
