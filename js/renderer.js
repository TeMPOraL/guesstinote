// Responsible for displaying Cells in the editor.

const Renderer = {
    renderCell: function(cellData) {
        // cellData: { id, displayName, formula, unit, rawText, mean, ci, histogramData, errorState, value }
        // FR3.5.1: Render Name, annotations (mean, CI, unit), histogram.
        // The returned span will be contenteditable="false" to act as a "block".
        // The rawText is stored for potential "un-prettifying" later.

        const cellSpan = document.createElement('span');
        cellSpan.classList.add('guesstimate-cell');
        cellSpan.setAttribute('data-cell-id', cellData.id);
        cellSpan.setAttribute('data-raw-text', cellData.rawText); // Store raw text
        cellSpan.setAttribute('contenteditable', 'false'); // Make the cell itself non-editable directly

        const nameSpan = document.createElement('span');
        nameSpan.classList.add('name');
        nameSpan.textContent = cellData.displayName;
        cellSpan.appendChild(nameSpan);

        const hasError = !!cellData.errorState;
        const isDepError = cellData.isDependencyError === true;

        if (hasError) {
            const errorMsgSpan = document.createElement('span');
            errorMsgSpan.classList.add('error-message');
            errorMsgSpan.style.marginLeft = '5px';
            errorMsgSpan.textContent = ` (Error: ${cellData.errorState})`;

            if (isDepError) {
                cellSpan.classList.add('cell-dependent-error');
                errorMsgSpan.style.color = '#c87000'; // Orange for dependent error text
            } else { // Direct error
                cellSpan.classList.add('cell-error');
                errorMsgSpan.style.color = '#d8000c'; // Red for direct error text
            }
            nameSpan.appendChild(errorMsgSpan);
        }

        // Render value/CI/formula if:
        // 1. There's no error OR
        // 2. It's a dependency error (meaning we want to show stale/frozen data)
        if (!hasError || isDepError) {
            if (cellData.mean !== null && cellData.ci && typeof cellData.ci.lower === 'number' && typeof cellData.ci.upper === 'number') {
                const valueSpan = document.createElement('span');
                valueSpan.classList.add('value');
                valueSpan.textContent = `${cellData.mean.toFixed(1)}`;
                cellSpan.appendChild(valueSpan);

                const ciSpan = document.createElement('span');
                ciSpan.classList.add('ci');
                ciSpan.textContent = `(${cellData.ci.lower.toFixed(1)} to ${cellData.ci.upper.toFixed(1)})`;
                cellSpan.appendChild(ciSpan);
                this._appendFormulaDisplay(cellSpan, cellData.rawFormula);

                // TODO: Histogram rendering could also be here for frozen state
            } else if (typeof cellData.value === 'number') { // Constant
                const valueSpan = document.createElement('span');
                valueSpan.classList.add('value');
                valueSpan.textContent = `${cellData.value}`;
                cellSpan.appendChild(valueSpan);
                this._appendFormulaDisplay(cellSpan, cellData.rawFormula);
            } else if (!hasError) { 
                // Only show "Calculating..." if no error at all and no data yet.
                // If it's a depError and no mean/value, it means it never had data or was an empty array.
                // In that case, only the name and error message (added above) will show.
                const statusSpan = document.createElement('span');
                statusSpan.textContent = ' (Calculating...)';
                cellSpan.appendChild(statusSpan);
            }
        }
        // If it's a direct error (hasError && !isDepError), nothing from the block above is rendered.
        
        return cellSpan;
    },

    _appendFormulaDisplay: function(parentSpan, rawFormula) {
        const formulaSpan = document.createElement('span');
        formulaSpan.classList.add('formula-display'); // Add a class for potential styling
        formulaSpan.style.marginLeft = '5px'; // Basic styling
        formulaSpan.style.fontStyle = 'italic';
        formulaSpan.style.color = '#777';
        formulaSpan.textContent = `(Formula: ${rawFormula})`;
        parentSpan.appendChild(formulaSpan);
    }
    // renderAllCellsInEditor is removed as its approach is no longer used.
    // A new function for initial full-document rendering (DOM-based) will be needed later.
};

console.log('renderer.js loaded');
