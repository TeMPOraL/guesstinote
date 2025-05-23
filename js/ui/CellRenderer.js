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

    _appendValueAndCIDisplay: function(parentElement, effectiveCell, makeValueProminent = false) {
        // Show data if there's no direct error (or it's a dependency error where stale data might be shown)
        // This function now primarily handles non-scalar value/CI display.
        if (!effectiveCell.errorState || effectiveCell.isDependencyError) {
            if (effectiveCell.type === 'dataArray' && Array.isArray(effectiveCell.samples) && effectiveCell.samples.length === 0 && !effectiveCell.errorState) {
                this._createAndAppendSpan(parentElement, 'value', ' []', { fontStyle: 'italic' });
            } else if (effectiveCell.mean !== null && effectiveCell.ci && typeof effectiveCell.ci.lower === 'number' && typeof effectiveCell.ci.upper === 'number') {
                // This block is for distributions (PERT, Normal, non-empty DataArray) with calculated stats
                const valueClassName = makeValueProminent ? 'value distribution-value-prominent' : 'value';
                this._createAndAppendSpan(parentElement, valueClassName, `${effectiveCell.mean.toFixed(1)}`);
                this._createAndAppendSpan(parentElement, 'ci', `${effectiveCell.ci.lower.toFixed(1)} to ${effectiveCell.ci.upper.toFixed(1)}`);
            } else if (!effectiveCell.errorState && effectiveCell.id &&
                       (effectiveCell.type !== 'constant' && effectiveCell.type !== 'formulaOnlyConstant')) { 
                // Fallback for non-scalars if no error, but not enough data (e.g., still calculating)
                this._createAndAppendSpan(parentElement, 'value', ' (Calculating...)', { fontStyle: 'italic' });
            }
        }
    },

    _appendInfoAreaElements: function(infoArea, effectiveCell, displayName, isFullWidth) {
        // Cell ID (hidden by default, shown on hover via CSS)
        this._createAndAppendSpan(infoArea, 'cell-id-display', effectiveCell.id ? `[${effectiveCell.id}]` : '');

        if (!isFullWidth && (effectiveCell.type === 'constant' || effectiveCell.type === 'formulaOnlyConstant')) { // Inline Scalar
            // ID is appended directly to infoArea (done by the caller of this specific block or handled by CSS column flex)
            // For inline scalars, value comes first in the infoMainLine, then name.
            const infoMainLine = document.createElement('div');
            infoMainLine.className = 'info-main-line scalar-info-main-line';

            // Append Scalar Value (large) to infoMainLine
            if (!effectiveCell.errorState || effectiveCell.isDependencyError) {
                if (typeof effectiveCell.value === 'number') {
                    this._createAndAppendSpan(infoMainLine, 'value scalar-value-prominent', `${parseFloat(effectiveCell.value.toFixed(2))}`);
                } else if (!effectiveCell.errorState) { // Constant, but value not ready
                    this._createAndAppendSpan(infoMainLine, 'value', ' (Processing...)', { fontStyle: 'italic' });
                }
                // If direct error, no value span here. Error shows later in infoMainLine.
            }
            
            // Cell Name
            this._createAndAppendSpan(infoMainLine, 'name', displayName);
            // Error Message (if any)
            this._appendErrorDisplay(infoMainLine, effectiveCell);
            // No CI here for inline scalars.
            infoArea.appendChild(infoMainLine);

        } else { // Non-scalar OR Full-width scalar
            const infoMainLine = document.createElement('div');
            infoMainLine.className = 'info-main-line';
            // Cell Name
            this._createAndAppendSpan(infoMainLine, 'name', displayName);
            // Error Message
            this._appendErrorDisplay(infoMainLine, effectiveCell);
            
            // For full-width scalars, regular value display. For non-scalars (inline/full-width), prominent value.
            if (effectiveCell.type === 'constant' || effectiveCell.type === 'formulaOnlyConstant') { // Must be full-width scalar here
                 if (!effectiveCell.errorState || effectiveCell.isDependencyError) {
                    if (typeof effectiveCell.value === 'number') {
                        this._createAndAppendSpan(infoMainLine, 'value', `${parseFloat(effectiveCell.value.toFixed(2))}`);
                    } else if (!effectiveCell.errorState) {
                        this._createAndAppendSpan(infoMainLine, 'value', ' (Processing...)', { fontStyle: 'italic' });
                    }
                }
            } else { // Non-scalar (distribution or data array)
                this._appendValueAndCIDisplay(infoMainLine, effectiveCell, !isFullWidth); // Prominent value only for inline non-scalars
            }
            infoArea.appendChild(infoMainLine);
        }
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
        } else if (!effectiveCell.errorState || effectiveCell.isDependencyError) { 
            // Handle scalar visualization: placeholder for full-width, collapse for inline
            if (effectiveCell.type === 'constant' || effectiveCell.type === 'formulaOnlyConstant') {
                if (isFullWidth) { // Full-width scalar shows placeholder
                    if (effectiveCell.value !== null) { // Only show placeholder if there's a value or potential value
                        this._createAndAppendSpan(vizArea, 'scalar-placeholder', '#');
                    }
                } else { // Inline scalar: vizArea should collapse
                    vizArea.classList.add('scalar-mode');
                }
            }
            // If not a scalar and not rendering histogram (e.g. empty data array), vizArea might be empty.
        }
        // If there's a direct error and no histogram, vizArea might remain empty.
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
        this._appendInfoAreaElements(infoArea, effectiveCell, displayName, isFullWidth); // Pass isFullWidth
        contentWrapper.appendChild(infoArea);
        
        // Formula hint is absolutely positioned relative to contentWrapper (which is relative to g-cell)
        this._appendFormulaHint(contentWrapper, effectiveCell, isReference);
        
        hostElement.appendChild(contentWrapper);
    }
    // _renderHistogram method is removed, now in HistogramRenderer.js
};

window.CellRenderer = CellRenderer; // Expose globally
console.log('js/ui/CellRenderer.js loaded.');
