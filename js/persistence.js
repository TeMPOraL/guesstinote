// Handles saving/loading documents to/from localStorage and import/export.

const Persistence = {
    STORAGE_KEY_PREFIX: 'guesstinote_doc_',
    LAST_OPENED_KEY: 'guesstinote_last_opened_doc_id',
    DOC_LIST_KEY: 'guesstinote_doc_list', // Stores an array of {id, name}

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
                // IS1: Load tutorial document
                this.loadTutorialDocument();
            }
        }
    },

    loadTutorialDocument: function() {
        console.log("Loading tutorial document...");
        if (window.Tutorial && typeof window.Tutorial.getContent === 'function') {
            const tutorialContent = window.Tutorial.getContent();
            const tutorialName = window.Tutorial.getName ? window.Tutorial.getName() : "Tutorial";
            
            window.Guesstinote.setEditorContent(tutorialContent);
            window.Guesstinote.setDocName(tutorialName);
            // Don't set a docId for the tutorial unless it's saved.
            // Or, give it a special non-persistent ID? For now, treat as unsaved.
            window.history.replaceState(null, null, '#'); // Clear hash for tutorial
            localStorage.removeItem(this.LAST_OPENED_KEY); // Don't make tutorial "last opened" by default
            
            if (window.Guesstinote && typeof window.Guesstinote.refreshEditor === 'function') {
                window.Guesstinote.refreshEditor();
            }
        } else {
            console.warn("Tutorial content not available.");
            window.Guesstinote.setEditorContent("<h1>Welcome to Guesstinote!</h1><p>Edit this document or create a new one.</p><p>[MyExample](10 to 20)[units]</p>");
            window.Guesstinote.setDocName("Unsaved Document");
            if (window.Guesstinote && typeof window.Guesstinote.refreshEditor === 'function') {
                window.Guesstinote.refreshEditor();
            }
        }
    },

    handleNewDocument: function() {
        if (confirm("Create a new document? Any unsaved changes will be lost.")) {
            Persistence.loadTutorialDocument(); // Or a blank template
            // Clear currentDocId as it's a new, unsaved document
            Persistence.currentDocId = null; 
            window.history.replaceState(null, null, '#'); // Clear hash
        }
    },

    currentDocId: null, // Store the ID of the currently loaded/saved document

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
            window.history.replaceState(null, null, '#' + this.currentDocId); // Update URL hash
            alert(`Document "${docName}" saved!`);
            console.log(`Document saved with ID: ${this.currentDocId}`);
        } catch (e) {
            console.error("Error saving document to localStorage:", e);
            alert("Error saving document. LocalStorage might be full or disabled.");
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
                console.log(`Document loaded with ID: ${docId}`);
                if (window.Guesstinote && typeof window.Guesstinote.refreshEditor === 'function') {
                    window.Guesstinote.refreshEditor();
                }
            } else {
                alert(`Document with ID "${docId}" not found.`);
                this.loadTutorialDocument(); // Fallback
            }
        } catch (e) {
            console.error("Error loading document from localStorage:", e);
            alert("Error loading document.");
            this.loadTutorialDocument(); // Fallback
        }
    },
    
    promptLoadDocument: function() {
        // FR3.1.4: Allow users to load existing documents.
        // This could be a simple prompt for now, or a modal with a list.
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
        // FR3.1.5: Export as plaintext
        const content = window.Guesstinote.getEditorContent();
        try {
            navigator.clipboard.writeText(content).then(() => {
                alert("Document content copied to clipboard!");
            }, (err) => {
                console.error('Failed to copy document content: ', err);
                alert("Failed to copy content. Please copy manually from the editor.");
                // As a fallback, could display content in a textarea for manual copy.
            });
        } catch (e) {
            console.error("Clipboard API not available or error:", e);
            // Fallback: show in a textarea
            const textarea = document.createElement('textarea');
            textarea.value = content;
            textarea.style.position = 'fixed';
            textarea.style.left = '-9999px'; // Move out of screen
            document.body.appendChild(textarea);
            textarea.select();
            try {
                document.execCommand('copy');
                alert("Document content copied to clipboard (fallback method)!");
            } catch (err) {
                alert("Failed to copy. Please select and copy the content from the editor directly.");
            }
            document.body.removeChild(textarea);
        }
    },

    handleImportDocument: function() {
        // FR3.1.6: Import from plaintext
        const pastedContent = prompt("Paste your Guesstinote document content here:");
        if (pastedContent !== null) { // User didn't cancel prompt
            if (confirm("Importing this content will replace the current document. Continue?")) {
                window.Guesstinote.setEditorContent(pastedContent);
                window.Guesstinote.setDocName("Imported Document"); // Or try to parse a name
                this.currentDocId = null; // Imported doc is unsaved initially
                window.history.replaceState(null, null, '#'); // Clear hash
                if (window.Guesstinote && typeof window.Guesstinote.refreshEditor === 'function') {
                    window.Guesstinote.refreshEditor();
                }
                alert("Document imported. Save it to keep changes.");
            }
        }
    }
};

console.log('persistence.js loaded');
