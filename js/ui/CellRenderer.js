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

    _clearAndPrepareHost: function(hostElement) {
        hostElement.innerHTML = ''; // Clear previous content
        hostElement.classList.remove('error-state-indicator', 'dependency-error-indicator', 'cell-not-found-indicator');
    },

    _renderCellNotFound: function(hostElement, contentWrapper, referenceDisplayName, referenceTargetId) {
        hostElement.classList.add('cell-not-found-indicator');
        const displayName = referenceDisplayName || referenceTargetId;
        this._createAndAppendSpan(contentWrapper, 'name', displayName);
        this._createAndAppendSpan(contentWrapper, 'error-message', ` (Error: Target cell '${referenceTargetId}' not found)`);
        hostElement.appendChild(contentWrapper);
    },

    _renderCellDataUnavailable: function(hostElement, contentWrapper, cellNameFromHost, cellIdFromHost, cellFormulaFromHost) {
        hostElement.classList.add('error-state-indicator');
        const displayName = cellNameFromHost || cellIdFromHost || "Unknown Cell";
        this._createAndAppendSpan(contentWrapper, 'name', displayName);
        this._createAndAppendSpan(contentWrapper, 'error-message', ` (Error: Cell data unavailable. Formula: ${cellFormulaFromHost || 'N/A'})`);
        hostElement.appendChild(contentWrapper);
    },

    _appendErrorDisplay: function(parentElement, effectiveCell) {
        if (effectiveCell.errorState) {
            // The hostElement class is added in the main renderCell function
            this._createAndAppendSpan(parentElement, 'error-message', ` (Error: ${effectiveCell.errorState}${effectiveCell.isDependencyError ? ' - from dependency' : ''})`);
        }
    },

    _appendValueAndCIDisplay: function(parentElement, effectiveCell) {
        // Show data if there's no direct error (or it's a dependency error where stale data might be shown)
        if (!effectiveCell.errorState || effectiveCell.isDependencyError) {
            if (effectiveCell.type === 'constant' || effectiveCell.type === 'formulaOnlyConstant') {
                if (typeof effectiveCell.value === 'number') {
                    this._createAndAppendSpan(parentElement, 'value', `${parseFloat(effectiveCell.value.toFixed(2))}`);
                } else if (!effectiveCell.errorState) { // Constant, but value not ready
                    this._createAndAppendSpan(parentElement, 'value', ' (Processing...)', { fontStyle: 'italic' });
                }
            } else if (effectiveCell.type === 'dataArray' && Array.isArray(effectiveCell.samples) && effectiveCell.samples.length === 0 && !effectiveCell.errorState) {
                this._createAndAppendSpan(parentElement, 'value', ' []', { fontStyle: 'italic' });
            } else if (effectiveCell.mean !== null && effectiveCell.ci && typeof effectiveCell.ci.lower === 'number' && typeof effectiveCell.ci.upper === 'number') {
                this._createAndAppendSpan(parentElement, 'value', `${effectiveCell.mean.toFixed(1)}`);
                this._createAndAppendSpan(parentElement, 'ci', `${effectiveCell.ci.lower.toFixed(1)} to ${effectiveCell.ci.upper.toFixed(1)}`);
            } else if (!effectiveCell.errorState && effectiveCell.id) { // Fallback if no error, but not enough data
                this._createAndAppendSpan(parentElement, 'value', ' (Calculating...)', { fontStyle: 'italic' });
            }
        }
    },

    _appendInfoAreaElements: function(infoArea, effectiveCell, displayName) {
        // Cell ID (hidden by default, shown on hover via CSS) - will be stacked above info-main-line by CSS
        this._createAndAppendSpan(infoArea, 'cell-id-display', effectiveCell.id ? `[${effectiveCell.id}]` : '');

        const infoMainLine = document.createElement('div');
        infoMainLine.className = 'info-main-line';

        // Cell Name
        this._createAndAppendSpan(infoMainLine, 'name', displayName);
        // Error Message (if any) - Appears inline with other info
        this._appendErrorDisplay(infoMainLine, effectiveCell);
        // Value and CI
        this._appendValueAndCIDisplay(infoMainLine, effectiveCell);
        
        infoArea.appendChild(infoMainLine);
    },

    _appendVisualizationArea: function(vizArea, effectiveCell, isFullWidth) {
        const shouldRenderHistogram = (!effectiveCell.errorState || effectiveCell.isDependencyError) &&
                                    effectiveCell.samples && effectiveCell.samples.length > 0 &&
                                    typeof HistogramRenderer !== 'undefined' &&
                                    (effectiveCell.type !== 'constant' && effectiveCell.type !== 'formulaOnlyConstant') &&
                                    ((effectiveCell.mean !== null && effectiveCell.ci && typeof effectiveCell.ci.lower === 'number') || (effectiveCell.type === 'dataArray'));

        if (shouldRenderHistogram) {
            const histogramElement = HistogramRenderer.renderHistogramDisplay(effectiveCell.samples, isFullWidth);
            vizArea.appendChild(histogramElement);
        } else if (!effectiveCell.errorState || effectiveCell.isDependencyError) { // Only show placeholder if not in a direct error state that hides value
            // Show placeholder for scalars or when histogram isn't applicable but there's no overriding error
             if (effectiveCell.type === 'constant' || effectiveCell.type === 'formulaOnlyConstant' || effectiveCell.value !== null) {
                this._createAndAppendSpan(vizArea, 'scalar-placeholder', '#');
            }
        }
        // If there's a direct error and no histogram, vizArea might remain empty, which is fine.
    },

    _appendFormulaHint: function(contentWrapper, effectiveCell, isReference) {
        if (!isReference && effectiveCell.rawFormula && (!effectiveCell.ast || effectiveCell.ast.type !== 'NumberLiteral')) {
            this._createAndAppendSpan(contentWrapper, 'formula-display', `formula="${effectiveCell.rawFormula}"`);
        }
    },

    renderCell: function(renderInput) {
        const {
            hostElement, isReference, isFullWidth, cellData,
            targetCell, referenceDisplayName, referenceTargetId,
            cellIdFromHost, cellNameFromHost, cellFormulaFromHost
        } = renderInput;

        this._clearAndPrepareHost(hostElement);

        const contentWrapper = document.createElement('span');
        contentWrapper.className = 'content-wrapper'; 
        
        const effectiveCell = isReference ? targetCell : cellData;

        if (!effectiveCell && isReference) {
            this._renderCellNotFound(hostElement, contentWrapper, referenceDisplayName, referenceTargetId);
            return;
        }
        
        if (!effectiveCell && !isReference) {
            this._renderCellDataUnavailable(hostElement, contentWrapper, cellNameFromHost, cellIdFromHost, cellFormulaFromHost);
            return;
        }
        
        // Set host class for error states based on effectiveCell
        if (effectiveCell.errorState) {
            hostElement.classList.add(effectiveCell.isDependencyError ? 'dependency-error-indicator' : 'error-state-indicator');
        }

        const displayName = isReference ? (referenceDisplayName || effectiveCell.displayName) : effectiveCell.displayName;

        // Create visualization area (histogram or placeholder)
        const vizArea = document.createElement('div');
        vizArea.className = 'cell-viz-area';
        this._appendVisualizationArea(vizArea, effectiveCell, isFullWidth);
        contentWrapper.appendChild(vizArea);

        // Create info area (ID, name, value, CI, error)
        const infoArea = document.createElement('div');
        infoArea.className = 'cell-info-area';
        this._appendInfoAreaElements(infoArea, effectiveCell, displayName);
        contentWrapper.appendChild(infoArea);
        
        // Formula hint is absolutely positioned relative to contentWrapper (which is relative to g-cell)
        this._appendFormulaHint(contentWrapper, effectiveCell, isReference);
        
        hostElement.appendChild(contentWrapper);
    }
    // _renderHistogram method is removed, now in HistogramRenderer.js
};

window.CellRenderer = CellRenderer; // Expose globally
console.log('js/ui/CellRenderer.js loaded.');
