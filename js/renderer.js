// Responsible for displaying Cells in the editor.

const Renderer = {
    renderCell: function(renderInput) {
        // renderInput contains:
        // - isReference (boolean)
        // - isFullWidth (boolean)
        // - If isReference: targetCell, referenceRawText, referenceDisplayName?
        // - Else (definition): cellData (Cell object), definitionRawText

        const cellSpan = document.createElement('span');
        cellSpan.classList.add('guesstimate-cell');
        cellSpan.setAttribute('contenteditable', 'false');

        let cellToRenderData; 
        let displayName;
        let rawTextForAttribute; 
        let formulaForDisplay;   

        if (renderInput.isReference) {
            cellToRenderData = renderInput.targetCell;
            rawTextForAttribute = renderInput.referenceRawText;
            displayName = renderInput.referenceDisplayName || cellToRenderData.displayName;
            formulaForDisplay = cellToRenderData.rawFormula; 

            cellSpan.setAttribute('data-cell-id', cellToRenderData.id);
            cellSpan.setAttribute('data-raw-text', rawTextForAttribute);
            if (renderInput.referenceDisplayName) {
                cellSpan.setAttribute('data-ref-display-name', renderInput.referenceDisplayName);
            }
        } else { // It's a definition
            cellToRenderData = renderInput.cellData;
            rawTextForAttribute = renderInput.definitionRawText; 
            displayName = cellToRenderData.displayName;
            formulaForDisplay = cellToRenderData.rawFormula;

            cellSpan.setAttribute('data-cell-id', cellToRenderData.id);
            cellSpan.setAttribute('data-raw-text', rawTextForAttribute);
        }

        const nameSpan = document.createElement('span');
        nameSpan.classList.add('name');
        nameSpan.textContent = displayName;
        cellSpan.appendChild(nameSpan);

        const hasError = !!cellToRenderData.errorState;
        const isDepError = cellToRenderData.isDependencyError === true;

        if (hasError) {
            const errorMsgSpan = document.createElement('span');
            errorMsgSpan.classList.add('error-message');
            errorMsgSpan.style.marginLeft = '5px';
            errorMsgSpan.textContent = ` (Error: ${cellToRenderData.errorState})`;

            if (isDepError) {
                cellSpan.classList.add('cell-dependent-error');
                errorMsgSpan.style.color = '#c87000'; 
            } else { // Direct error
                cellSpan.classList.add('cell-error');
                errorMsgSpan.style.color = '#d8000c'; 
            }
            nameSpan.appendChild(errorMsgSpan);
        }

        if (!hasError || isDepError) { // Show data if no error or if it's a dependency error (frozen data)
            if (cellToRenderData.mean !== null && cellToRenderData.ci && typeof cellToRenderData.ci.lower === 'number' && typeof cellToRenderData.ci.upper === 'number') {
                const valueSpan = document.createElement('span');
                valueSpan.classList.add('value');
                valueSpan.textContent = `${cellToRenderData.mean.toFixed(1)}`;
                cellSpan.appendChild(valueSpan);

                const ciSpan = document.createElement('span');
                ciSpan.classList.add('ci');
                ciSpan.textContent = `(${cellToRenderData.ci.lower.toFixed(1)} to ${cellToRenderData.ci.upper.toFixed(1)})`;
                cellSpan.appendChild(ciSpan);
                if (formulaForDisplay) { // Only append formula if it exists
                    this._appendFormulaDisplay(cellSpan, formulaForDisplay);
                }
                // Add histogram for distributions
                if (cellToRenderData.histogramData && cellToRenderData.histogramData.length > 0) {
                    const histogramElement = this._renderHistogram(cellToRenderData.histogramData, renderInput.isFullWidth);
                    cellSpan.appendChild(histogramElement);
                }
            } else if (typeof cellToRenderData.value === 'number') { // Constant
                const valueSpan = document.createElement('span');
                valueSpan.classList.add('value');
                valueSpan.textContent = `${cellToRenderData.value}`;
                cellSpan.appendChild(valueSpan);
                if (formulaForDisplay) {
                    this._appendFormulaDisplay(cellSpan, formulaForDisplay);
                }
            } else if (!hasError && cellToRenderData.id) { // Only show "Calculating..." if no error and not a placeholder for a missing reference target
                const statusSpan = document.createElement('span');
                statusSpan.textContent = ' (Calculating...)';
                cellSpan.appendChild(statusSpan);
            }
        }

        if (renderInput.isFullWidth) {
            const wrapperDiv = document.createElement('div');
            wrapperDiv.classList.add('guesstimate-cell-full-width-wrapper');
            // data-is-full-width might be useful for _updateSpansForCell if we didn't re-parse rawText
            // but since we re-parse rawText there, it's not strictly needed on the DOM element itself.
            // However, it can be useful for CSS or direct DOM debugging/selection.
            wrapperDiv.setAttribute('data-is-full-width', 'true'); 
            wrapperDiv.appendChild(cellSpan);
            return wrapperDiv;
        } else {
            return cellSpan;
        }
    },

    _appendFormulaDisplay: function(parentSpan, rawFormula) {
        const formulaSpan = document.createElement('span');
        formulaSpan.classList.add('formula-display'); // Add a class for potential styling
        formulaSpan.style.marginLeft = '5px'; // Basic styling
        formulaSpan.style.fontStyle = 'italic';
        formulaSpan.style.color = '#777';
        formulaSpan.textContent = `(Formula: ${rawFormula})`;
        parentSpan.appendChild(formulaSpan);
    },

    _renderHistogram: function(histogramData, isFullWidth) {
        const container = document.createElement('div');
        container.classList.add('histogram-container');
        if (isFullWidth) {
            container.classList.add('full-width');
        }

        if (!histogramData || histogramData.length === 0) {
            // container.textContent = '[No histogram data]'; // Optional: for debugging
            return container; // Return empty container if no data
        }

        const maxCount = Math.max(...histogramData, 0); // Ensure maxCount is at least 0
        if (maxCount === 0) { // All bins are zero
            // Render empty bars or a placeholder message
            for (let i = 0; i < histogramData.length; i++) {
                const bar = document.createElement('span');
                bar.classList.add('histogram-bar');
                bar.style.height = '1%'; // Minimal height for empty bar
                container.appendChild(bar);
            }
            return container;
        }

        histogramData.forEach(count => {
            const bar = document.createElement('span');
            bar.classList.add('histogram-bar');
            // Scale height relative to maxCount. Max height is 100% of container.
            const barHeight = (count / maxCount) * 100;
            bar.style.height = `${Math.max(1, barHeight)}%`; // Ensure at least 1% height to be visible
            // title attribute can show the count on hover
            bar.title = `Count: ${count}`; 
            container.appendChild(bar);
        });

        return container;
    }
};

console.log('renderer.js loaded');
