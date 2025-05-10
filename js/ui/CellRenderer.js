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

        // Shadow DOM is no longer used. Styles are applied globally.
        // hostElement.shadowRoot would be null.
        hostElement.innerHTML = ''; // Clear previous content directly from the host element

        const contentWrapper = document.createElement('span');
        // Add a class to the content wrapper if you need to target it specifically,
        // though direct children of g-cell/g-ref can also be styled.
        contentWrapper.className = 'content-wrapper'; // Ensure this class is defined in cell-widget.css
        const effectiveCell = isReference ? targetCell : cellData;
        let displayName;

        hostElement.classList.remove('error-state-indicator', 'dependency-error-indicator', 'cell-not-found-indicator');

        if (!effectiveCell && isReference) {
            hostElement.classList.add('cell-not-found-indicator');
            displayName = referenceDisplayName || referenceTargetId;
            this._createAndAppendSpan(contentWrapper, 'name', displayName);
            this._createAndAppendSpan(contentWrapper, 'error-message', ` (Error: Target cell '${referenceTargetId}' not found)`);
            hostElement.appendChild(contentWrapper); // Append to host
            return;
        }
        
        if (!effectiveCell && !isReference) {
            hostElement.classList.add('error-state-indicator');
            displayName = cellNameFromHost || cellIdFromHost || "Unknown Cell";
            this._createAndAppendSpan(contentWrapper, 'name', displayName);
            this._createAndAppendSpan(contentWrapper, 'error-message', ` (Error: Cell data unavailable. Formula: ${cellFormulaFromHost || 'N/A'})`);
            hostElement.appendChild(contentWrapper); // Append to host
            return;
        }
        
        displayName = isReference ? (referenceDisplayName || effectiveCell.displayName) : effectiveCell.displayName;

        const topRow = document.createElement('div');
        topRow.className = 'cell-top-row';

        // Cell ID (hidden by default, shown on hover via CSS)
        this._createAndAppendSpan(topRow, 'cell-id-display', effectiveCell.id ? `[${effectiveCell.id}]` : '');
        
        // Cell Name
        this._createAndAppendSpan(topRow, 'name', displayName);

        // Part 2: Display Error Message (if any) - Placed within topRow for alignment
        if (effectiveCell.errorState) {
            hostElement.classList.add(effectiveCell.isDependencyError ? 'dependency-error-indicator' : 'error-state-indicator');
            this._createAndAppendSpan(topRow, 'error-message', ` (Error: ${effectiveCell.errorState}${effectiveCell.isDependencyError ? ' - from dependency' : ''})`);
        }

        // Part 3: Display Value, CI (inside topRow if no overriding error)
        // Show data if there's no direct error (i.e., no error at all, or it's a dependency error where stale data might be shown)
        if (!effectiveCell.errorState || effectiveCell.isDependencyError) {
            if (effectiveCell.type === 'constant' || effectiveCell.type === 'formulaOnlyConstant') {
                if (typeof effectiveCell.value === 'number') {
                    this._createAndAppendSpan(topRow, 'value', `${parseFloat(effectiveCell.value.toFixed(2))}`);
                } else if (!effectiveCell.errorState) { // Constant, but value not ready (e.g. still processing)
                    this._createAndAppendSpan(topRow, 'value', ' (Processing...)', { fontStyle: 'italic' });
                }
            } else if (effectiveCell.type === 'dataArray' && Array.isArray(effectiveCell.samples) && effectiveCell.samples.length === 0 && !effectiveCell.errorState) {
                // This case is for explicitly empty arrays, e.g. formula="array()"
                this._createAndAppendSpan(topRow, 'value', ' []', { fontStyle: 'italic' });
            } else if (effectiveCell.mean !== null && effectiveCell.ci && typeof effectiveCell.ci.lower === 'number' && typeof effectiveCell.ci.upper === 'number') {
                // This block is for distributions (PERT, Normal, non-empty DataArray) with calculated stats
                this._createAndAppendSpan(topRow, 'value', `${effectiveCell.mean.toFixed(1)}`);
                // CSS adds parentheses for .ci, so just provide the content.
                this._createAndAppendSpan(topRow, 'ci', `${effectiveCell.ci.lower.toFixed(1)} to ${effectiveCell.ci.upper.toFixed(1)}`);
            } else if (!effectiveCell.errorState && effectiveCell.id) { 
                // Fallback if no error, but not enough data for other displays (e.g., still calculating)
                this._createAndAppendSpan(topRow, 'value', ' (Calculating...)', { fontStyle: 'italic' });
            }
        }
        contentWrapper.appendChild(topRow); // Add the top row to the main content wrapper

        // Histogram (appended to contentWrapper, after topRow)
        // Show histogram if:
        // 1. No direct error (or it's a dependency error, allowing stale data display).
        // 2. Samples exist and are not empty.
        // 3. HistogramRenderer is available.
        // 4. Cell type is not 'constant' or 'formulaOnlyConstant'.
        // 5. Either mean/CI are calculated (indicating a distribution ready for display) OR it's a dataArray (which should show its samples).
        if ((!effectiveCell.errorState || effectiveCell.isDependencyError) &&
            effectiveCell.samples && effectiveCell.samples.length > 0 &&
            typeof HistogramRenderer !== 'undefined' &&
            (effectiveCell.type !== 'constant' && effectiveCell.type !== 'formulaOnlyConstant') &&
            ( (effectiveCell.mean !== null && effectiveCell.ci && typeof effectiveCell.ci.lower === 'number') || (effectiveCell.type === 'dataArray') )
           ) {
            const histogramElement = HistogramRenderer.renderHistogramDisplay(effectiveCell.samples, isFullWidth);
            contentWrapper.appendChild(histogramElement);
        }
        
        // Part 4: Display Formula (for g-cell definitions, appended to contentWrapper, after histogram)
        // Formula is absolutely positioned by CSS.
        // Only display the formula if it's not a direct number literal.
        if (!isReference && effectiveCell.rawFormula && (!effectiveCell.ast || effectiveCell.ast.type !== 'NumberLiteral')) {
            // The text content for formula-display should be what's shown in the tooltip.
            this._createAndAppendSpan(contentWrapper, 'formula-display', `formula="${effectiveCell.rawFormula}"`);
        }
        
        hostElement.appendChild(contentWrapper); // Append to host
    }
    // _renderHistogram method is removed, now in HistogramRenderer.js
};

window.CellRenderer = CellRenderer; // Expose globally
console.log('js/ui/CellRenderer.js loaded.');
