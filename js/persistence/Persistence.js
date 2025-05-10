// Handles saving/loading documents to/from localStorage and import/export.

const Persistence = {
    STORAGE_KEY_PREFIX: 'guesstinote_doc_',
    LAST_OPENED_KEY: 'guesstinote_last_opened_doc_id',
    DOC_LIST_KEY: 'guesstinote_doc_list', // Stores an array of {id, name}

    hasUnsavedChanges: false,

    markUnsavedChanges: function() {
        this.hasUnsavedChanges = true;
        // console.log("Persistence: Marked unsaved changes.");
    },

    generateNewDocId: function() {
        return `doc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    },

    _getDocList: function() {
        try {
            const listStr = localStorage.getItem(this.DOC_LIST_KEY);
            return listStr ? JSON.parse(listStr) : [];
        } catch (e) {
            console.error("Error getting doc list from localStorage:", e);
            return [];
        }
    },

    _saveDocList: function(list) {
        try {
            localStorage.setItem(this.DOC_LIST_KEY, JSON.stringify(list));
        } catch (e) {
            console.error("Error saving doc list to localStorage:", e);
        }
    },

    _updateDocList: function(docId, docName) {
        let list = this._getDocList();
        const existingDocIndex = list.findIndex(doc => doc.id === docId);
        if (existingDocIndex > -1) {
            list[existingDocIndex].name = docName;
        } else {
            list.push({ id: docId, name: docName });
        }
        this._saveDocList(list);
    },
    
    _removeDocFromList: function(docId) {
        let list = this._getDocList();
        list = list.filter(doc => doc.id !== docId);
        this._saveDocList(list);
    },

    loadInitialDocument: function() {
        const urlFragment = window.location.hash.substring(1);
        if (urlFragment) {
            this.loadDocument(urlFragment);
        } else {
            const lastOpenedId = localStorage.getItem(this.LAST_OPENED_KEY);
            if (lastOpenedId) {
                this.loadDocument(lastOpenedId);
            } else {
                this.loadTutorialDocument();
            }
        }
    },

    loadTutorialDocument: async function() { // Changed to an async function
        console.log("Loading tutorial document...");
        // Assumes Tutorial is globally available
        if (window.Tutorial && typeof window.Tutorial.getContent === 'function') {
            try {
                const tutorialContent = await window.Tutorial.getContent(); // Await the promise
                const tutorialName = window.Tutorial.getName ? window.Tutorial.getName() : "Tutorial";
            
                window.Guesstinote.setEditorContent(tutorialContent);
                window.Guesstinote.setDocName(tutorialName);
                window.history.replaceState(null, null, '#'); 
                localStorage.removeItem(this.LAST_OPENED_KEY); 
                this.hasUnsavedChanges = false;
            
                if (window.Guesstinote && typeof window.Guesstinote.refreshEditor === 'function') {
                    window.Guesstinote.refreshEditor();
                }
            } catch (error) {
                console.error("Error setting up tutorial document from fetched content:", error);
                window.Guesstinote.setEditorContent("<h1>Error</h1><p>Failed to display tutorial content after loading.</p>");
                window.Guesstinote.setDocName("Error");
                this.hasUnsavedChanges = false;
                 if (window.Guesstinote && typeof window.Guesstinote.refreshEditor === 'function') {
                    window.Guesstinote.refreshEditor();
                }
            }
        } else {
            console.warn("Tutorial content provider (Tutorial.getContent) not available."); // Updated log
            window.Guesstinote.setEditorContent("<h1>Error</h1><p>Tutorial module is not available.</p>"); // Updated fallback
            window.Guesstinote.setDocName("Error"); // Updated fallback
            this.hasUnsavedChanges = false; 
            if (window.Guesstinote && typeof window.Guesstinote.refreshEditor === 'function') {
                window.Guesstinote.refreshEditor();
            }
        }
    },

    handleNewDocument: async function() { // Changed to async to allow awaiting loadTutorialDocument
        if (this.hasUnsavedChanges && !confirm("You have unsaved changes. Create a new document anyway?")) {
            return;
        }
        await Persistence.loadTutorialDocument(); // Await the async tutorial loading
        Persistence.currentDocId = null; 
        window.history.replaceState(null, null, '#');
    },

    currentDocId: null,

    handleSaveDocument: function() {
        const content = window.Guesstinote.getEditorContent();
        const docName = window.Guesstinote.getDocName() || "Untitled Guesstimate";

        if (!this.currentDocId) {
            this.currentDocId = this.generateNewDocId();
        }

        try {
            localStorage.setItem(this.STORAGE_KEY_PREFIX + this.currentDocId, content);
            localStorage.setItem(this.LAST_OPENED_KEY, this.currentDocId);
            this._updateDocList(this.currentDocId, docName);
            window.history.replaceState(null, null, '#' + this.currentDocId); 
            this.hasUnsavedChanges = false;
            alert(`Document "${docName}" saved!`);
        } catch (e) {
            console.error("Error saving document to localStorage:", e);
            alert("Error saving document.");
        }
    },

    loadDocument: function(docId) {
        try {
            const content = localStorage.getItem(this.STORAGE_KEY_PREFIX + docId);
            if (content !== null) {
                const docList = this._getDocList();
                const docInfo = docList.find(d => d.id === docId);
                const docName = docInfo ? docInfo.name : "Untitled Document";

                window.Guesstinote.setEditorContent(content);
                window.Guesstinote.setDocName(docName);
                this.currentDocId = docId;
                localStorage.setItem(this.LAST_OPENED_KEY, docId);
                window.history.replaceState(null, null, '#' + docId);
                this.hasUnsavedChanges = false;
                if (window.Guesstinote && typeof window.Guesstinote.refreshEditor === 'function') {
                    window.Guesstinote.refreshEditor();
                }
            } else {
                alert(`Document with ID "${docId}" not found.`);
                this.loadTutorialDocument(); 
            }
        } catch (e) {
            console.error("Error loading document from localStorage:", e);
            alert("Error loading document.");
            this.loadTutorialDocument();
        }
    },
    
    promptLoadDocument: function() {
        const docList = this._getDocList();
        if (docList.length === 0) {
            alert("No saved documents found.");
            return;
        }
        let message = "Enter the number of the document to load:\n";
        docList.forEach((doc, index) => {
            message += `${index + 1}. ${doc.name} (ID: ${doc.id})\n`;
        });
        const choiceStr = prompt(message);
        if (choiceStr) {
            const choice = parseInt(choiceStr, 10) - 1;
            if (choice >= 0 && choice < docList.length) {
                this.loadDocument(docList[choice].id);
            } else {
                alert("Invalid selection.");
            }
        }
    },

    handleExportDocument: function() {
        const content = window.Guesstinote.getEditorContent();
        try {
            navigator.clipboard.writeText(content).then(() => {
                alert("Document content copied to clipboard!");
            }, (err) => {
                console.error('Failed to copy document content: ', err);
                alert("Failed to copy content.");
            });
        } catch (e) {
            console.error("Clipboard API not available or error:", e);
            alert("Failed to copy. Please select and copy the content from the editor directly.");
        }
    },

    handleImportDocument: function() {
        const pastedContent = prompt("Paste your Guesstinote document content here:");
        if (pastedContent !== null) { 
            if (confirm("Importing this content will replace the current document. Continue?")) {
                window.Guesstinote.setEditorContent(pastedContent);
                window.Guesstinote.setDocName("Imported Document"); 
                this.currentDocId = null; 
                this.markUnsavedChanges(); 
                window.history.replaceState(null, null, '#'); 
                if (window.Guesstinote && typeof window.Guesstinote.refreshEditor === 'function') {
                    window.Guesstinote.refreshEditor();
                }
                alert("Document imported. Save it to keep changes.");
            }
        }
    }
};

window.Persistence = Persistence; // Expose globally
console.log('js/persistence/Persistence.js loaded');
