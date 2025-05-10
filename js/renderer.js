// Responsible for populating the Shadow DOM of <g-cell> and <g-ref> custom elements.

const Renderer = {
    renderCell: function(renderInput) {
        const {
            hostElement,      // The custom element (<g-cell> or <g-ref>)
            isReference,
            isFullWidth,      // Determined by the custom element's attribute
            cellData,         // For <g-cell> (definition), this is the Cell object
            targetCell,       // For <g-ref> (reference), this is the target Cell object
            referenceDisplayName, // For <g-ref>, custom name from attribute
            referenceTargetId,   // For <g-ref>, the ID it's trying to reference
            // Props for when cellData/targetCell might be missing (e.g. during initial render or error)
            cellIdFromHost,
            cellNameFromHost,
            cellFormulaFromHost
        } = renderInput;

        const shadowRoot = hostElement.shadowRoot;
        shadowRoot.innerHTML = ''; // Clear previous content

        const style = document.createElement('style');
        style.textContent = `
            :host {
                display: inline-block; 
                font-family: sans-serif;
                padding: 3px 6px;
                margin: 1px 2px;
                border: 1px solid #ccc;
                border-radius: 4px;
                background-color: #f8f9fa;
                vertical-align: middle; 
                line-height: normal; 
                box-sizing: border-box;
            }
            :host([full-width-active]) { 
                display: block;
                width: auto; 
                margin-top: 0.5em;
                margin-bottom: 0.5em;
                padding: 8px;
                background-color: #f1f3f5; 
                border: 1px solid #dee2e6;
            }
            .name { font-weight: bold; color: #333; }
            .value { color: #007bff; margin-left: 5px; }
            .ci { font-size: 0.9em; color: #555; margin-left: 5px; }
            .formula-display { font-size: 0.8em; color: #6c757d; margin-left: 8px; font-style: italic; }
            
            /* Classes applied to :host for error states */
            :host(.error-state-indicator) { background-color: #ffe3e3 !important; border-color: #ffb8b8 !important; }
            :host(.dependency-error-indicator) { background-color: #fff3cd !important; border-color: #ffeeba !important; }
            :host(.cell-not-found-indicator) { background-color: #fce3e3 !important; border-color: #f5c6cb !important; }

            .error-message { color: #d8000c; font-size: 0.9em; margin-left: 5px; }

            .histogram-container {
                display: flex;
                align-items: flex-end;
                height: 20px; 
                min-width: 50px;
                border: 1px solid #ced4da;
                background-color: #e9ecef;
                margin-left: 5px;
                margin-top: 2px; 
                padding: 1px;
                box-sizing: border-box;
                vertical-align: middle; /* Helps if it's part of an inline flow */
            }
            :host([full-width-active]) .histogram-container {
                height: 40px; 
                margin-top: 5px;
            }
            .histogram-bar {
                flex-grow: 1;
                background-color: #007bff;
                margin-right: 1px;
                min-width: 2px; /* Ensure even small bars are visible */
            }
            .histogram-bar:last-child { margin-right: 0; }
        `;
        shadowRoot.appendChild(style);

        const contentWrapper = document.createElement('span');
        const effectiveCell = isReference ? targetCell : cellData;
        let displayName;

        hostElement.classList.remove('error-state-indicator', 'dependency-error-indicator', 'cell-not-found-indicator');

        if (!effectiveCell && isReference) {
            hostElement.classList.add('cell-not-found-indicator');
            displayName = referenceDisplayName || referenceTargetId;
            const nameSpan = document.createElement('span');
            nameSpan.className = 'name';
            nameSpan.textContent = displayName;
            contentWrapper.appendChild(nameSpan);
            const errorSpan = document.createElement('span');
            errorSpan.className = 'error-message';
            errorSpan.textContent = ` (Error: Target cell '${referenceTargetId}' not found)`;
            contentWrapper.appendChild(errorSpan);
            shadowRoot.appendChild(contentWrapper);
            return;
        }
        
        if (!effectiveCell && !isReference) {
            hostElement.classList.add('error-state-indicator');
            displayName = cellNameFromHost || cellIdFromHost || "Unknown Cell";
            const nameSpan = document.createElement('span');
            nameSpan.className = 'name';
            nameSpan.textContent = displayName;
            contentWrapper.appendChild(nameSpan);
            const errorSpan = document.createElement('span');
            errorSpan.className = 'error-message';
            errorSpan.textContent = ` (Error: Cell data unavailable. Formula: ${cellFormulaFromHost || 'N/A'})`;
            contentWrapper.appendChild(errorSpan);
            shadowRoot.appendChild(contentWrapper);
            return;
        }
        
        displayName = isReference ? (referenceDisplayName || effectiveCell.displayName) : effectiveCell.displayName;
        
        const nameSpan = document.createElement('span');
        nameSpan.className = 'name';
        nameSpan.textContent = displayName;
        contentWrapper.appendChild(nameSpan);

        if (effectiveCell.errorState) {
            hostElement.classList.add(effectiveCell.isDependencyError ? 'dependency-error-indicator' : 'error-state-indicator');
            const errorSpan = document.createElement('span');
            errorSpan.className = 'error-message';
            errorSpan.textContent = ` (Error: ${effectiveCell.errorState})`;
            contentWrapper.appendChild(errorSpan);
        }

        if (!effectiveCell.errorState || effectiveCell.isDependencyError) {
            if (effectiveCell.type === 'constant' || effectiveCell.type === 'formulaOnlyConstant') {
                if (typeof effectiveCell.value === 'number') {
                    const valueSpan = document.createElement('span');
                    valueSpan.className = 'value';
                    valueSpan.textContent = `${parseFloat(effectiveCell.value.toFixed(2))}`;
                    contentWrapper.appendChild(valueSpan);
                }
            } else if (effectiveCell.mean !== null && effectiveCell.ci && typeof effectiveCell.ci.lower === 'number' && typeof effectiveCell.ci.upper === 'number') {
                const valueSpan = document.createElement('span');
                valueSpan.className = 'value';
                valueSpan.textContent = `${effectiveCell.mean.toFixed(1)}`;
                contentWrapper.appendChild(valueSpan);

                const ciSpan = document.createElement('span');
                ciSpan.className = 'ci';
                ciSpan.textContent = `(${effectiveCell.ci.lower.toFixed(1)} to ${effectiveCell.ci.upper.toFixed(1)})`;
                contentWrapper.appendChild(ciSpan);

                if (effectiveCell.histogramData && effectiveCell.histogramData.length > 0) {
                    const histogramElement = this._renderHistogram(effectiveCell.histogramData, isFullWidth);
                    contentWrapper.appendChild(histogramElement);
                }
            } else if (!effectiveCell.errorState && effectiveCell.id) {
                const statusSpan = document.createElement('span');
                statusSpan.className = 'value'; 
                statusSpan.textContent = ' (Calculating...)';
                statusSpan.style.fontStyle = 'italic';
                contentWrapper.appendChild(statusSpan);
            }
        }
        
        if (!isReference && effectiveCell.rawFormula) {
            const formulaSpan = document.createElement('span');
            formulaSpan.className = 'formula-display';
            formulaSpan.textContent = `(Formula: ${effectiveCell.rawFormula})`;
            contentWrapper.appendChild(formulaSpan);
        }
        
        shadowRoot.appendChild(contentWrapper);
    },

    _renderHistogram: function(histogramData, isFullWidth) {
        const container = document.createElement('div');
        container.classList.add('histogram-container');

        if (!histogramData || histogramData.length === 0) {
            return container; 
        }

        const validBins = histogramData.filter(bin => typeof bin.frequency === 'number');
        if (validBins.length === 0) return container;

        const maxCount = Math.max(...validBins.map(bin => bin.frequency), 0);
        if (maxCount === 0) { 
            for (let i = 0; i < Math.min(validBins.length, 10); i++) { 
                const bar = document.createElement('div');
                bar.classList.add('histogram-bar');
                bar.style.height = '1%';
                container.appendChild(bar);
            }
            return container;
        }

        validBins.forEach(bin => {
            const bar = document.createElement('div');
            bar.classList.add('histogram-bar');
            const barHeight = (bin.frequency / maxCount) * 100;
            bar.style.height = `${Math.max(1, barHeight)}%`; 
            bar.title = `Range: ${typeof bin.x0 === 'number' ? bin.x0.toFixed(1) : 'N/A'} to ${typeof bin.x1 === 'number' ? bin.x1.toFixed(1) : 'N/A'}\nCount: ${bin.frequency}`;
            container.appendChild(bar);
        });

        return container;
    }
};

console.log('renderer.js loaded (for custom elements).');
