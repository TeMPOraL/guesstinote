class GCellElement extends HTMLElement {
    constructor() {
        super();
        const shadowRoot = this.attachShadow({ mode: 'open' });
        this._cellIdInternal = null; // Renamed to avoid conflict with HTMLElement's id property
        this._cellInstance = null;
        this._isInitialized = false;

        // Link external stylesheets
        const cellWidgetStyles = document.createElement('link');
        cellWidgetStyles.setAttribute('rel', 'stylesheet');
        cellWidgetStyles.setAttribute('href', 'css/components/cell-widget.css');
        shadowRoot.appendChild(cellWidgetStyles);

        const histogramStyles = document.createElement('link');
        histogramStyles.setAttribute('rel', 'stylesheet');
        histogramStyles.setAttribute('href', 'css/components/histogram.css');
        shadowRoot.appendChild(histogramStyles);
    }

    static get observedAttributes() {
        return ['id', 'name', 'formula', 'full-width'];
    }

    connectedCallback() {
        this._cellIdInternal = this.getAttribute('id');
        // console.log(`g-cell connected: ${this._cellIdInternal}`);

        if (!this._cellIdInternal) {
            this.shadowRoot.innerHTML = `<span style="color:red; font-family: sans-serif;">Error: g-cell requires an 'id' attribute.</span>`;
            return;
        }
        this.updateCellDefinition(); // Create or update the Cell object
        this.renderDisplay();        // Initial render

        // Register this DOM element with the Cell object
        if (this._cellInstance) {
            this._cellInstance.registerElement(this);
        }
        this._isInitialized = true;
    }

    attributeChangedCallback(name, oldValue, newValue) {
        if (!this._isInitialized || oldValue === newValue) return; // Don't run on initial attribute settings or if no change

        // console.log(`g-cell attribute ${name} changed for ${this._cellIdInternal}: ${oldValue} -> ${newValue}`);

        if (name === 'id') {
            // Handle ID change: unregister from old cell instance, update internal ID, update definition, register with new.
            if (this._cellInstance && oldValue) { // Unregister from the cell associated with the old ID
                const oldCell = window.Guesstinote.getCellsCollection()[oldValue];
                if (oldCell) oldCell.unregisterElement(this);
            }
            this._cellIdInternal = newValue;
            if (!this._cellIdInternal) { // New ID is null or empty
                 this.shadowRoot.innerHTML = `<span style="color:red; font-family: sans-serif;">Error: g-cell 'id' attribute cannot be empty.</span>`;
                 // If an old cell instance exists, it might need to be marked as error or removed from collection by main.js pruning
                 if (this._cellInstance) this._cellInstance.setError("ID removed or invalid");
                 this._cellInstance = null; // No longer valid
                 return;
            }
        }
        
        this.updateCellDefinition(); // Re-process the cell's definition with new attributes

        if (this._cellInstance) { // Ensure registration with the potentially new cell instance
            this._cellInstance.registerElement(this);
        }
        
        // Trigger a re-evaluation of the cell itself.
        // The cell's processFormula will handle dependent updates.
        if (this._cellInstance) {
            // Mark for re-evaluation by the main processing loop
            this._cellInstance.needsReevaluation = true; 
            // A global refresh might be too much here, rely on the main processing loop
            // to pick up needsReevaluation. Or, if immediate processing is desired:
            // this._cellInstance.processFormula(window.Guesstinote.getCellsCollection());
            // For now, let main.js handle the processing loop.
            // We must ensure that if a formula attribute changes, the cell is reprocessed.
            if (window.Guesstinote && window.Guesstinote.refreshEditor && (name === 'formula' || name === 'id')) {
                 // If ID or formula changes, it's a structural change that might need full reprocessing
                 // to correctly update dependencies and calculations.
                 // A more targeted approach would be ideal but complex.
                 window.Guesstinote.refreshEditor(); // This will trigger processCellCalculations
            } else {
                 this.renderDisplay(); // For name or full-width changes, just re-render this element
            }

        } else {
            // If cell instance couldn't be found/created, still try to render (will show error)
            this.renderDisplay();
        }
    }
    
    updateCellDefinition() {
        if (!this._cellIdInternal) return;

        const name = this.getAttribute('name') || this._cellIdInternal;
        const formula = this.getAttribute('formula');
        const rawTextRepresentation = `<g-cell id="${this._cellIdInternal}" ...>`;


        if (formula === null) {
            this.shadowRoot.innerHTML = `<span style="color:red; font-family: sans-serif;">Error: g-cell '${this._cellIdInternal}' requires a 'formula' attribute.</span>`;
            if (this._cellInstance) { // If instance exists, mark it
                this._cellInstance.setError("Missing formula attribute", false);
                this._cellInstance.notifyElementsToRefresh();
            } else { // If instance doesn't exist (e.g. ID was just set, formula missing)
                // Try to get/create a placeholder cell in collection to hold the error
                const cells = window.Guesstinote.getCellsCollection();
                if (!cells[this._cellIdInternal]) {
                    cells[this._cellIdInternal] = new Cell(this._cellIdInternal, name, "", rawTextRepresentation); // Empty formula
                }
                cells[this._cellIdInternal].setError("Missing formula attribute", false);
                this._cellInstance = cells[this._cellIdInternal]; // Assign for renderDisplay
            }
            return;
        }

        const cells = window.Guesstinote.getCellsCollection();
        
        // If ID changed, this._cellInstance might point to the old cell.
        // We need to fetch or create based on the new _cellIdInternal.
        if (!cells[this._cellIdInternal]) {
            // console.log(`GCellElement: Creating new Cell ${this._cellIdInternal}`);
            this._cellInstance = new Cell(this._cellIdInternal, name, formula, rawTextRepresentation);
            cells[this._cellIdInternal] = this._cellInstance;
        } else {
            // console.log(`GCellElement: Updating existing Cell ${this._cellIdInternal}`);
            this._cellInstance = cells[this._cellIdInternal]; // Ensure we're working with the correct instance
            this._cellInstance.displayName = name;
            this._cellInstance.rawFormula = formula; 
            this._cellInstance.rawText = rawTextRepresentation;
            // Mark for re-evaluation; actual processing happens in main loop or attributeChangedCallback
            this._cellInstance.needsReevaluation = true;
            this._cellInstance.clearError(); // Clear previous errors before re-evaluation attempt
        }
    }

    renderDisplay() {
        if (!this._cellIdInternal && this._isInitialized) {
             this.shadowRoot.innerHTML = `<span style="color:red; font-family: sans-serif;">Error: g-cell 'id' attribute is missing or invalid.</span>`;
             return;
        }
        if (this.getAttribute('formula') === null && this._isInitialized) {
             this.shadowRoot.innerHTML = `<span style="color:red; font-family: sans-serif;">Error: g-cell '${this._cellIdInternal}' is missing 'formula' attribute.</span>`;
             return;
        }

        // Ensure _cellInstance is up-to-date, especially if ID changed
        if (this._cellIdInternal && window.Guesstinote && window.Guesstinote.getCellsCollection) {
            this._cellInstance = window.Guesstinote.getCellsCollection()[this._cellIdInternal];
        }
        
        const cellToRender = this._cellInstance;
        const isFullWidth = this.hasAttribute('full-width') && this.getAttribute('full-width') !== 'false';
        this.toggleAttribute('full-width-active', isFullWidth);

        if (typeof window.CellRenderer !== 'undefined' && window.CellRenderer) {
            window.CellRenderer.renderCell({
                hostElement: this,
                isReference: false,
                cellData: cellToRender, 
                isFullWidth: isFullWidth,
                // Pass attributes directly for cases where cellToRender might be missing/provisional
                cellIdFromHost: this._cellIdInternal,
                cellNameFromHost: this.getAttribute('name') || this._cellIdInternal,
                cellFormulaFromHost: this.getAttribute('formula')
            });
        } else {
            this.shadowRoot.innerHTML = `<span style="font-family: sans-serif;">${this.getAttribute('name') || this._cellIdInternal} (Renderer not available)</span>`;
        }
    }

    disconnectedCallback() {
        // console.log('g-cell disconnected:', this._cellIdInternal);
        if (this._cellInstance) {
            this._cellInstance.unregisterElement(this);
        }
        // Cell removal from CellsCollection is handled by main.js logic (pruning)
    }

    refreshDisplay() {
        // console.log(`GCellElement ${this._cellIdInternal}: Refreshing display via cell notification`);
        this.renderDisplay();
    }
}
customElements.define('g-cell', GCellElement);
