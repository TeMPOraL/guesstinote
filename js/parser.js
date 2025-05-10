// This file is now largely obsolete for parsing cell definitions from the document.
// Cell definitions (<g-cell>) and references (<g-ref>) are handled by custom HTML elements
// and the browser's HTML parser.

// The FormulaParser, which parses the content of a formula string (e.g., "A1 + PERT(1,2,3)"),
// is located in js/formula_parser.js and is used by Cell.js.

const Parser = {
    // This method is no longer used for finding cells in the main document.
    // It's kept as a no-op to prevent errors if anything old still calls it.
    parse: function(rawContent, cellsCollection) {
        // console.warn("Legacy Parser.parse() called. This function is deprecated and does nothing for document parsing.");
        return { definitions: [], references: [] }; // Return empty, as expected by old calls
    },

    // These methods are also obsolete for document parsing.
    parseSingleCellDefinition: function(rawText) {
        // console.warn("Legacy Parser.parseSingleCellDefinition() called. Deprecated.");
        return null;
    },

    parseSingleCellReference: function(rawText) {
        // console.warn("Legacy Parser.parseSingleCellReference() called. Deprecated.");
        return null;
    }
};

console.log('parser.js loaded (role significantly reduced).');
