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
    cellDefinitionRegex: /\[(?:([^\]|]+)\|)?([^\]]+)\]\[([^\]]*)\]/g,

    // Regex for `[#ID|DisplayName]` or `[#ID]`
    // \[\#(?:([^\]|]+)\|)?([^\]]+)\]      -> Captures reference: [#ID|Name] or [#ID]
    //                                     Group 5: Referenced ID (if display name is custom)
    //                                     Group 6: ID (if no custom display name) or Custom Display Name
    // This needs to be smarter. Let's try:
    // \[\#([^\]|]+)(?:\|([^\]]+))?\]
    // Group 1: ID
    // Group 2: Optional Custom Display Name
    cellReferenceRegex: /\[\#([^\]|]+)(?:\|([^\]]+))?\]/g,


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
    }
};

console.log('parser.js loaded');
