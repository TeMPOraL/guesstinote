// Responsible for displaying Cells in the editor.

const Renderer = {
    renderCell: function(cellData) {
        // cellData would be an object from Parser or CellModel
        // e.g., { id: "WBK", displayName: "Widget Backend", formula: "PERT(2,5,10)", unit: "days",
        //         mean: 5.2, ci: {lower: 3.2, upper: 7.5}, histogramData: [...], errorState: null }

        // This function would generate the HTML string for a cell.
        // FR3.5.1: Render Name, annotations (mean, CI, unit), histogram.
        
        let html = `<span class="guesstimate-cell" data-cell-id="${cellData.id}">`;
        html += `<span class="name">${cellData.displayName}</span>`;

        if (cellData.errorState === 'error') {
            html = `<span class="guesstimate-cell cell-error" data-cell-id="${cellData.id}">`;
            html += `<span class="name">${cellData.displayName}</span> (Error!)`;
        } else if (cellData.errorState === 'dependent-error') {
            html = `<span class="guesstimate-cell cell-dependent-error" data-cell-id="${cellData.id}">`;
            html += `<span class="name">${cellData.displayName}</span> (Dep. Error)`;
        } else if (cellData.mean !== null && cellData.ci && cellData.ci.lower !== null) {
            html += `<span class="value">${cellData.mean.toFixed(1)} ${cellData.unit || ''}</span>`;
            html += `<span class="ci">(${cellData.ci.lower.toFixed(1)} to ${cellData.ci.upper.toFixed(1)})</span>`;
            // Basic histogram visualization (very rudimentary)
            html += `<span class="histogram" title="${(cellData.histogramData || []).join(', ')}"></span>`; 
        } else if (typeof cellData.value === 'number') { // Constant
             html += `<span class="value">${cellData.value} ${cellData.unit || ''}</span>`;
        } else {
            html += ` (Calculating...)`;
        }
        
        html += `</span>`;
        return html;
    },

    // This function would take the raw editor content and replace cell definitions
    // with their rendered HTML. This is a complex task with contenteditable.
    // A simpler approach might be to find cell syntax and replace it.
    // However, this makes editing the original formula tricky.
    //
    // Alternative: Use a non-editable span for the rendered part, but keep original syntax
    // accessible or stored elsewhere.
    //
    // For now, this is a placeholder.
    renderAllCellsInEditor: function(rawHtml, parsedCells) {
        let newHtml = rawHtml;
        // This is a very naive replacement and will break if cell definitions are inside HTML tags attributes etc.
        // It also doesn't handle updates, only initial rendering.
        // A robust solution needs to be much more careful about HTML structure.

        // Create mock cell data for rendering demonstration
        const cellsToRender = parsedCells.map(pCell => {
            // Mock calculation for demonstration
            let mean = Math.random() * 10;
            let lower = mean - Math.random() * 2;
            let upper = mean + Math.random() * 2;
            if (pCell.formula.startsWith("PERT")) {
                 // more specific mock for PERT
                mean = (parseFloat(pCell.formula.match(/\d+/g)[0]) + parseFloat(pCell.formula.match(/\d+/g)[1]) + parseFloat(pCell.formula.match(/\d+/g)[2])) / 3; // very rough
                lower = mean * 0.8;
                upper = mean * 1.2;
            } else if (!isNaN(parseFloat(pCell.formula))) { // Constant
                mean = parseFloat(pCell.formula);
                lower = mean;
                upper = mean;
                 return {
                    ...pCell,
                    value: mean, // For constants
                    mean: null, ci: null, histogramData: [], errorState: null
                };
            }


            return {
                ...pCell, // id, displayName, formula, unit, rawText
                mean: mean,
                ci: { lower: Math.max(0,lower), upper: upper },
                histogramData: Array(10).fill(0).map(() => Math.random()*10), // mock histogram
                errorState: null // 'error', 'dependent-error'
            };
        });


        // Replace from longest rawText to shortest to avoid issues with substring matches
        cellsToRender.sort((a, b) => b.rawText.length - a.rawText.length);

        cellsToRender.forEach(cellData => {
            // Escape special characters in rawText for use in regex
            const escapedRawText = cellData.rawText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            const regex = new RegExp(escapedRawText, 'g');
            newHtml = newHtml.replace(regex, this.renderCell(cellData));
        });
        
        // This is where Guesstinote.setEditorContent(newHtml) would be called by main.js
        // after this function returns.
        return newHtml; 
    }
};

console.log('renderer.js loaded');
