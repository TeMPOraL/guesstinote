class GRefElement extends HTMLElement {
    constructor() {
        super();
        // Shadow DOM is no longer used. Content will be rendered directly into the element.
        this._targetCellId = null;
        this._targetCellInstance = null;
        this._isInitialized = false;
    }

    static get observedAttributes() {
        return ['id', 'name', 'full-width']; // 'id' here refers to the target cell's ID
    }

    connectedCallback() {
        this._targetCellId = this.getAttribute('id');
        // console.log('g-ref connected, target id:', this._targetCellId);

        if (!this._targetCellId) {
            this.innerHTML = `<span style="color:red; font-family: sans-serif;">Error: g-ref requires an 'id' attribute specifying the target cell.</span>`; // Render error directly
            return;
        }
        this.subscribeToTargetCell();
        this.renderDisplay();
        this._isInitialized = true;
    }

    attributeChangedCallback(name, oldValue, newValue) {
        if (!this._isInitialized || oldValue === newValue) return;
        // console.log(`g-ref attribute ${name} changed for target ${this._targetCellId}: ${oldValue} -> ${newValue}`);

        if (name === 'id') {
            if (this._targetCellInstance) { // Unsubscribe from the old target
                this._targetCellInstance.unregisterElement(this);
            }
            this._targetCellId = newValue;
            if (!this._targetCellId) {
                 this.innerHTML = `<span style="color:red; font-family: sans-serif;">Error: g-ref 'id' attribute cannot be empty.</span>`; // Render error directly
                 this._targetCellInstance = null; // No longer valid target
                 return;
            }
            this.subscribeToTargetCell(); // Subscribe to the new target
        }
        this.renderDisplay(); // Re-render if name, full-width, or target ID changes
    }

    subscribeToTargetCell() {
        if (!this._targetCellId || !window.Guesstinote || !window.Guesstinote.getCellsCollection) {
            // console.warn(`GRefElement: Cannot subscribe, target ID or Guesstinote/CellsCollection not available.`);
            this._targetCellInstance = null; // Ensure it's null if can't subscribe
            return;
        }
        const cellsCollection = window.Guesstinote.getCellsCollection();
        const newTargetInstance = cellsCollection[this._targetCellId];

        if (this._targetCellInstance && this._targetCellInstance !== newTargetInstance) {
            this._targetCellInstance.unregisterElement(this); // Unregister from old if different
        }
        
        this._targetCellInstance = newTargetInstance;

        if (this._targetCellInstance) {
            this._targetCellInstance.registerElement(this);
        } else {
            // console.warn(`GRefElement: Target cell '${this._targetCellId}' not found in CellsCollection on connect/subscribe.`);
        }
    }

    renderDisplay() {
        if (!this._targetCellId && this._isInitialized) { 
             this.innerHTML = `<span style="color:red; font-family: sans-serif;">Error: g-ref 'id' attribute is missing.</span>`; // Render error directly
             return;
        }
        
        // Attempt to re-subscribe/get latest instance in case CellsCollection changed
        this.subscribeToTargetCell(); 

        const customDisplayName = this.getAttribute('name');
        const isFullWidth = this.hasAttribute('full-width') && this.getAttribute('full-width') !== 'false';
        this.toggleAttribute('full-width-active', isFullWidth); 
        
        if (typeof window.CellRenderer !== 'undefined' && window.CellRenderer) {
            window.CellRenderer.renderCell({
                hostElement: this,
                isReference: true,
                targetCell: this._targetCellInstance, 
                referenceDisplayName: customDisplayName,
                referenceTargetId: this._targetCellId, 
                isFullWidth: isFullWidth
            });
        } else {
            // CellRenderer is responsible for populating 'this' (hostElement) directly now.
            this.innerHTML = `<span style="font-family: sans-serif;">${customDisplayName || this._targetCellId} (Renderer not available)</span>`;
        }
    }

    disconnectedCallback() {
        // console.log('g-ref disconnected, target id:', this._targetCellId);
        if (this._targetCellInstance) {
            this._targetCellInstance.unregisterElement(this);
        }
    }

    refreshDisplay() {
        // console.log(`GRefElement for ${this._targetCellId}: Refreshing display via cell notification`);
        this.renderDisplay();
    }
}
customElements.define('g-ref', GRefElement);
