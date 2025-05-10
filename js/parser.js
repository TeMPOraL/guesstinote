// Responsible for scanning document text and identifying Cell definitions/references

const Parser = {
    // Based on FR3.2.3 and FR3.2.4
    // Cell Definition: [ID|Display Name](Formula)[Unit] or [NameAsIDAndDisplayName](Formula)[Unit]
    // Cell Reference: [#ID] or [#ID|Custom Display Name]

    // This regex aims to find potential cell definitions. It's a starting point and will need refinement.
    // It tries to capture the full structure: [ID|Name](Formula)[Unit] or [Name](Formula)[Unit]
    // And also references: [#ID|Name] or [#ID]
    // This is complex and might be better done with a multi-stage parsing approach or a simpler marker.
    // For now, let's assume a simpler approach for finding raw cell syntax, then parsing that.
    // A very basic regex might just look for `[...]` patterns and then try to parse their content.
    
    // Simpler regex for initial pass: find anything looking like a cell definition or reference
    // This will need to be robust to avoid matching regular markdown links/images if markdown is used.
    // For contenteditable with HTML, we'd be parsing text nodes primarily.
    
    // Let's define a more specific regex for the Guesstinote syntax.
    // Regex for `[ID|Name](Formula)[Unit]` or `[Name](Formula)[Unit]`
    // Breakdown:
    // \[(?:([^\]|]+)\|)?([^\]]+)\]      -> Captures optional ID, required Name/ID_Name part: [ID|Name] or [Name]
    //                                     Group 1: ID (optional)
    //                                     Group 2: Name (or NameAsIDAndDisplayName)
    // \[([^\]]*)\]                    -> Captures Formula part: [Formula]
    //                                     Group 3: Formula (any char except ']')
    // Unit part is now removed.
    // New Group 1: Optional "FW|" for full-width
    // Old Group 1 (optional ID) becomes Group 2
    // Old Group 2 (Name) becomes Group 3
    // Old Group 3 (Formula) becomes Group 4
    cellDefinitionRegex: /\[(FW\|)?(?:([^\]|]+)\|)?([^\]]+)\]\[([^\]]*)\]/g,

    // Regex for `[#ID|DisplayName]` or `[#ID]`
    // New Group 1: Optional "FW|" for full-width
    // Old Group 1 (ID) becomes Group 2
    // Old Group 2 (Optional Custom Display Name) becomes Group 3
    cellReferenceRegex: /\[(FW\|)?\#([^\]|]+)(?:\|([^\]]+))?\]/g,


    parse: function(rawContent) {
        // This is a very naive initial parser.
        // In a real scenario, we'd parse the HTML structure if using contenteditable,
        // or Markdown if using a Markdown editor.
        // For now, let's assume rawContent is the text we want to parse.

        const definitions = [];
        let match;

        // Reset lastIndex for global regex
        this.cellDefinitionRegex.lastIndex = 0; 
        while ((match = this.cellDefinitionRegex.exec(rawContent)) !== null) {
            const fullMatch = match[0];
            const id = match[1]; // Might be undefined
            const nameOrIdName = match[2];
            const formula = match[3];
            // const unit = match[4]; // Unit is removed

            const cellId = id || nameOrIdName;
            const displayName = nameOrIdName;

            definitions.push({
                type: 'definition',
                id: cellId.trim(),
                displayName: displayName.trim(),
                formula: formula.trim(),
                unit: null, // Unit is removed
                rawText: fullMatch
            });
        }
        
        // TODO: Parse references as well and distinguish them.
        // For now, this is a very simplified placeholder.
        // A proper parser would need to handle nesting, escaping, and context.

        return definitions; // Returns an array of found cell definition objects
    },

    parseSingleCellDefinition: function(rawText) {
        // Parses a single, complete cell definition string.
        // e.g., "[ID|Name][Formula]" or "[Name][Formula]"
        this.cellDefinitionRegex.lastIndex = 0; // Reset regex state
        const match = this.cellDefinitionRegex.exec(rawText.trim());

        if (match && match[0].length === rawText.trim().length) { // Ensure the regex consumes the whole string
            const isFullWidth = !!match[1]; // True if "FW|" is present
            const idPart = match[2]; 
            const namePart = match[3];
            const formulaPart = match[4];

            const cellId = idPart ? idPart.trim() : namePart.trim();
            const displayName = namePart.trim();
            const formula = formulaPart.trim();

            return {
                id: cellId,
                displayName: displayName,
                formula: formula,
                rawText: rawText.trim(), // Original rawText
                isFullWidth: isFullWidth
            };
        }
        console.warn("Could not parse single cell definition from rawText:", rawText);
        return null; // Or throw an error
    },

    parseSingleCellReference: function(rawText) {
        // Parses a single, complete cell reference string.
        // e.g., "[#ID]" or "[#ID|Custom Name]"
        this.cellReferenceRegex.lastIndex = 0; // Reset regex state
        const match = this.cellReferenceRegex.exec(rawText.trim());

        if (match && match[0].length === rawText.trim().length) { // Ensure the regex consumes the whole string
            const isFullWidth = !!match[1]; // True if "FW|" is present
            const id = match[2].trim();
            const customDisplayName = match[3] ? match[3].trim() : undefined;

            return {
                id: id,
                customDisplayName: customDisplayName,
                rawText: rawText.trim(), // Original rawText
                isFullWidth: isFullWidth
            };
        }
        return null; // Not a valid reference string
    }
};

console.log('parser.js loaded');
