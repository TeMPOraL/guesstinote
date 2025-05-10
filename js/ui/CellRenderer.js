// Responsible for populating the Shadow DOM of <g-cell> and <g-ref> custom elements.
// Delegates histogram rendering to HistogramRenderer.

const CellRenderer = {
    _createAndAppendSpan: function(parent, className, textContent, options = {}) {
        const span = document.createElement('span');
        if (className) span.className = className;
        if (textContent) span.textContent = textContent;
        if (options.fontStyle) span.style.fontStyle = options.fontStyle;
        // Add other common style properties here if needed in the future, e.g., options.color
        parent.appendChild(span);
        return span;
    },

    renderCell: function(renderInput) {
        const {
            hostElement, isReference, isFullWidth, cellData,
            targetCell, referenceDisplayName, referenceTargetId,
            cellIdFromHost, cellNameFromHost, cellFormulaFromHost
        } = renderInput;

        const shadowRoot = hostElement.shadowRoot;
        shadowRoot.innerHTML = ''; // Clear previous content

        // Styles will be moved to separate CSS files and linked or injected.
        // For now, keeping them here for simplicity during refactor.
        // TODO: Move styles to css/components/cell-widget.css and css/components/histogram.css
        const style = document.createElement('style');
        style.textContent = `
            :host {
                display: inline-block; font-family: sans-serif; padding: 3px 6px; margin: 1px 2px;
                border: 1px solid #ccc; border-radius: 4px; background-color: #f8f9fa;
                vertical-align: middle; line-height: normal; box-sizing: border-box;
            }
            :host([full-width-active]) { 
                display: block; width: auto; margin-top: 0.5em; margin-bottom: 0.5em;
                padding: 8px; background-color: #f1f3f5; border: 1px solid #dee2e6;
            }
            .name { font-weight: bold; color: #333; }
            .value { color: #007bff; margin-left: 5px; }
            .ci { font-size: 0.9em; color: #555; margin-left: 5px; }
            .formula-display { font-size: 0.8em; color: #6c757d; margin-left: 8px; font-style: italic; }
            :host(.error-state-indicator) { background-color: #ffe3e3 !important; border-color: #ffb8b8 !important; }
            :host(.dependency-error-indicator) { background-color: #fff3cd !important; border-color: #ffeeba !important; }
            :host(.cell-not-found-indicator) { background-color: #fce3e3 !important; border-color: #f5c6cb !important; }
            .error-message { color: #d8000c; font-size: 0.9em; margin-left: 5px; }
            /* Histogram specific styles - these should move to histogram.css */
            .histogram-container {
                display: flex; align-items: flex-end; height: 20px; min-width: 50px;
                border: 1px solid #ced4da; background-color: #e9ecef; margin-left: 5px;
                margin-top: 2px; padding: 1px; box-sizing: border-box; vertical-align: middle;
            }
            :host([full-width-active]) .histogram-container { height: 40px; margin-top: 5px; }
            .histogram-bar {
                flex-grow: 1; background-color: #007bff; margin-right: 1px; min-width: 2px;
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
            this._createAndAppendSpan(contentWrapper, 'name', displayName);
            this._createAndAppendSpan(contentWrapper, 'error-message', ` (Error: Target cell '${referenceTargetId}' not found)`);
            shadowRoot.appendChild(contentWrapper);
            return;
        }
        
        if (!effectiveCell && !isReference) {
            hostElement.classList.add('error-state-indicator');
            displayName = cellNameFromHost || cellIdFromHost || "Unknown Cell";
            this._createAndAppendSpan(contentWrapper, 'name', displayName);
            this._createAndAppendSpan(contentWrapper, 'error-message', ` (Error: Cell data unavailable. Formula: ${cellFormulaFromHost || 'N/A'})`);
            shadowRoot.appendChild(contentWrapper);
            return;
        }
        
        displayName = isReference ? (referenceDisplayName || effectiveCell.displayName) : effectiveCell.displayName;
        
        this._createAndAppendSpan(contentWrapper, 'name', displayName);

        // Part 2: Display Error Message (if any)
        if (effectiveCell.errorState) {
            hostElement.classList.add(effectiveCell.isDependencyError ? 'dependency-error-indicator' : 'error-state-indicator');
            this._createAndAppendSpan(contentWrapper, 'error-message', ` (Error: ${effectiveCell.errorState}${effectiveCell.isDependencyError ? ' - from dependency' : ''})`);
        }

        // Part 3: Display Value, CI, Histogram
        // Show data if there's no direct error (i.e., no error at all, or it's a dependency error where stale data might be shown)
        if (!effectiveCell.errorState || effectiveCell.isDependencyError) {
            if (effectiveCell.type === 'constant' || effectiveCell.type === 'formulaOnlyConstant') {
                if (typeof effectiveCell.value === 'number') {
                    this._createAndAppendSpan(contentWrapper, 'value', `${parseFloat(effectiveCell.value.toFixed(2))}`);
                } else if (!effectiveCell.errorState) { // Constant, but value not ready (e.g. still processing)
                    this._createAndAppendSpan(contentWrapper, 'value', ' (Processing...)', { fontStyle: 'italic' });
                }
            } else if (effectiveCell.type === 'dataArray' && Array.isArray(effectiveCell.samples) && effectiveCell.samples.length === 0 && !effectiveCell.errorState) {
                // This case is for explicitly empty arrays, e.g. formula="array()"
                this._createAndAppendSpan(contentWrapper, 'value', ' []', { fontStyle: 'italic' });
            } else if (effectiveCell.mean !== null && effectiveCell.ci && typeof effectiveCell.ci.lower === 'number' && typeof effectiveCell.ci.upper === 'number') {
                // This block is for distributions (PERT, Normal, non-empty DataArray) with calculated stats
                this._createAndAppendSpan(contentWrapper, 'value', `${effectiveCell.mean.toFixed(1)}`);
                this._createAndAppendSpan(contentWrapper, 'ci', `(${effectiveCell.ci.lower.toFixed(1)} to ${effectiveCell.ci.upper.toFixed(1)})`);

                // Delegate to HistogramRenderer
                if (effectiveCell.samples && effectiveCell.samples.length > 0 && typeof HistogramRenderer !== 'undefined') {
                    const histogramElement = HistogramRenderer.renderHistogramDisplay(effectiveCell.samples, isFullWidth);
                    contentWrapper.appendChild(histogramElement); // Histogram is more complex than a simple span
                }
            } else if (!effectiveCell.errorState && effectiveCell.id) { 
                // Fallback if no error, but not enough data for other displays (e.g., still calculating)
                this._createAndAppendSpan(contentWrapper, 'value', ' (Calculating...)', { fontStyle: 'italic' });
            }
        }
        
        // Part 4: Display Formula (for g-cell definitions)
        // Only display the formula if it's not a direct number literal (e.g., show for "10+5" or "CellA", but not for "100")
        if (!isReference && effectiveCell.rawFormula && (!effectiveCell.ast || effectiveCell.ast.type !== 'NumberLiteral')) {
            this._createAndAppendSpan(contentWrapper, 'formula-display', `(Formula: ${effectiveCell.rawFormula})`);
        }
        
        shadowRoot.appendChild(contentWrapper);
    }
    // _renderHistogram method is removed, now in HistogramRenderer.js
};

window.CellRenderer = CellRenderer; // Expose globally
console.log('js/ui/CellRenderer.js loaded.');
