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

    _appendTopRowElements: function(topRow, effectiveCell, displayName) {
        // Cell ID (hidden by default, shown on hover via CSS)
        this._createAndAppendSpan(topRow, 'cell-id-display', effectiveCell.id ? `[${effectiveCell.id}]` : '');
        // Cell Name
        this._createAndAppendSpan(topRow, 'name', displayName);
        // Error Message (if any)
        this._appendErrorDisplay(topRow, effectiveCell);
        // Value and CI
        this._appendValueAndCIDisplay(topRow, effectiveCell);
    },

    _appendHistogramDisplay: function(contentWrapper, effectiveCell, isFullWidth) {
        if ((!effectiveCell.errorState || effectiveCell.isDependencyError) &&
            effectiveCell.samples && effectiveCell.samples.length > 0 &&
            typeof HistogramRenderer !== 'undefined' &&
            (effectiveCell.type !== 'constant' && effectiveCell.type !== 'formulaOnlyConstant') &&
            ((effectiveCell.mean !== null && effectiveCell.ci && typeof effectiveCell.ci.lower === 'number') || (effectiveCell.type === 'dataArray'))) {
            const histogramElement = HistogramRenderer.renderHistogramDisplay(effectiveCell.samples, isFullWidth);
            contentWrapper.appendChild(histogramElement);
        }
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

        const topRow = document.createElement('div');
        topRow.className = 'cell-top-row';
        this._appendTopRowElements(topRow, effectiveCell, displayName);
        contentWrapper.appendChild(topRow);

        this._appendHistogramDisplay(contentWrapper, effectiveCell, isFullWidth);
        
        this._appendFormulaHint(contentWrapper, effectiveCell, isReference);
        
        hostElement.appendChild(contentWrapper);
    }
    // _renderHistogram method is removed, now in HistogramRenderer.js
};

window.CellRenderer = CellRenderer; // Expose globally
console.log('js/ui/CellRenderer.js loaded.');
