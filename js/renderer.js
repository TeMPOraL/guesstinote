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

        if (cellData.errorState === 'error') {
            cellSpan.classList.add('cell-error');
            nameSpan.textContent += ' (Error!)';
        } else if (cellData.errorState === 'dependent-error') {
            cellSpan.classList.add('cell-dependent-error');
            nameSpan.textContent += ' (Dep. Error)';
        } else if (cellData.mean !== null && cellData.ci && cellData.ci.lower !== null) {
            const valueSpan = document.createElement('span');
            valueSpan.classList.add('value');
            valueSpan.textContent = `${cellData.mean.toFixed(1)} ${cellData.unit || ''}`;
            cellSpan.appendChild(valueSpan);

            const ciSpan = document.createElement('span');
            ciSpan.classList.add('ci');
            ciSpan.textContent = `(${cellData.ci.lower.toFixed(1)} to ${cellData.ci.upper.toFixed(1)})`;
            cellSpan.appendChild(ciSpan);

            const histogramSpan = document.createElement('span');
            histogramSpan.classList.add('histogram');
            histogramSpan.title = (cellData.histogramData || []).join(', ');
            // Actual histogram drawing would go here if not using background color placeholder
            cellSpan.appendChild(histogramSpan);
        } else if (typeof cellData.value === 'number') { // Constant
            const valueSpan = document.createElement('span');
            valueSpan.classList.add('value');
            valueSpan.textContent = `${cellData.value} ${cellData.unit || ''}`;
            cellSpan.appendChild(valueSpan);
        } else {
            const statusSpan = document.createElement('span');
            statusSpan.textContent = ' (Calculating...)';
            cellSpan.appendChild(statusSpan);
        }
        
        return cellSpan; // Return the DOM element
    }
    // renderAllCellsInEditor is removed as its approach is no longer used.
    // A new function for initial full-document rendering (DOM-based) will be needed later.
};

console.log('renderer.js loaded');
