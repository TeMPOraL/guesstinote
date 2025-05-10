# Extra AI instructions
Here are stored extra guidelins for you.

## Vibe coding
This is a vibe-coded project. That is, I'm relying on you to do a good job here, I won't be touching the code myself if I can avoid it,
and I'm happy to embrace the directions you're giving. Whatever makes it work.

## Evolving your instruction set
If I tell you to remember something, behave differently, or you realize yourself you'd benefit from remembering some specific guideline,
please add it to this file (or modify existing guideline). The format of the guidelines is unspecified, except second-level headers to split
them by categories; otherwise, whatever works best for you is best. You may store information about the project you want to retain long-term,
as well as any instructions for yourself to make your work more efficient and correct.

## Self-Correction Guidelines for Coding Practices

Based on session feedback, I will strive to adhere to the following guidelines to improve code quality and reduce the need for repeated corrections:

1.  **Prefer Proper Parsing over Complex Regex:**
    *   For syntax involving nesting, defined grammar, or operator precedence (e.g., mathematical formulas, structured data), prioritize implementing a tokenizer and a dedicated parser (e.g., recursive descent for AST generation) over attempting to use or patch complex regular expressions.
    *   Use regex primarily for simple pattern matching or initial tokenization steps.

2.  **Proactively Apply DRY and Abstraction:**
    *   Actively identify and refactor repetitive code blocks into helper functions or methods.
    *   For dispatching logic based on type or name (e.g., handling different AST node types, function calls), prefer using dispatch tables (maps/objects) over extended `if/else if` or `switch` statements, especially if the number of cases is likely to grow.

3.  **Favor Fundamental Design Changes Over Incremental Patches for Flawed Approaches:**
    *   If an existing approach requires multiple, increasingly complex fixes to address bugs or new requirements, pause and critically evaluate if the underlying design is sound.
    *   Be ready to propose and implement more fundamental refactoring or a design change if it leads to a more robust, maintainable, and extensible solution, rather than continuing with a series of local patches.

4.  **Design for Foreseeable Complexity (Within Scope):**
    *   While adhering to the immediate task's scope ("do what they ask, but no more"), consider the overall project requirements when designing initial solutions.
    *   If a core feature implies future complexity (e.g., formula evaluation, reactivity), the initial structures should be reasonably accommodating of this, even if the first implementation is a simplified version. This might involve placeholder modules or slightly more robust data structures from the outset.

5.  **Meticulous Code Generation and Diff Accuracy:**
    *   Thoroughly review generated code for syntax errors, logical consistency, and adherence to existing conventions before presenting it.
    *   Ensure `SEARCH/REPLACE` blocks are precise and accurately reflect the changes against the current, exact state of the provided files. Double-check line endings, whitespace, and surrounding context.

6.  **Clear Separation of Concerns:**
    *   Continue to adhere to the project convention of separating concerns into different JavaScript files.
    *   When introducing new, distinct functionalities (like an AST evaluator), propose creating new files for them to maintain modularity.

## Reactivity Implementation Plan (2025-05-10)

To enable robust cell referencing and reactivity, the following aspects need to be ensured:

1.  **Solidify Cell Recognition and Access:**
    *   Ensure all cell definitions are correctly parsed from the document.
    *   Cell IDs must be accurately determined.
    *   Cells must be reliably stored in and retrievable from the global `CellsCollection` using their exact IDs.

2.  **Robust Initial Calculation and Error Recovery:**
    *   The iterative recalculation loop in `processFullDocument` is crucial. It allows cells to calculate successfully even if their dependencies appear later in the document.
    *   Ensure that errors (like "Unknown cell identifier") occurring during an early evaluation attempt (before all dependencies are in `CellsCollection`) are cleared when the cell is reprocessed in a subsequent iteration where dependencies are available.

3.  **Build and Maintain the Dynamic Dependency Map:**
    *   When a cell's formula is processed (`Cell.prototype.processFormula`):
        *   After parsing the formula into an AST, extract all cell IDs it directly depends on (its `dependencies`).
        *   Update the cell's internal list of dependencies.
        *   For each dependency cell, add the current cell's ID to the dependency's list of `dependents`.
    *   This two-way mapping (`dependencies` and `dependents` sets on each cell) must be accurately maintained. The functions `_extractDependencies` and `_updateDependencyLinks` in `js/cell.js` are key here and must be called within `processFormula`.

4.  **Propagate Changes Through the Dependency Map:**
    *   When a cell's value or error state changes:
        *   It consults its list of `dependents`.
        *   It triggers each dependent cell to re-evaluate its own formula.
        *   This re-evaluation will fetch the new value/state of the changed cell, and the process continues down the dependency chain.
    *   The `_triggerDependentsUpdate` function in `js/cell.js` handles this propagation and should be called after a cell successfully recomputes.

## Project Files and Structure
This section outlines the core files of the Guesstinote project, reflecting the modularization.

*   **Editor Implementation**: The HTML editor functionality is provided by CodeMirror 5 (version 5.65.19, vendored in `vendor/codemirror-5.65.19/`). It is configured in `js/main.js` for the `#htmlEditor` textarea.
*   `index.html`: The main HTML file. Defines the layout, UI controls, and includes CSS and JavaScript (including CodeMirror).
*   `css/layout/app-layout.css`: Styles for the main page structure and general UI controls.
*   `css/components/editor.css`: Styles for the HTML editor.
*   `css/components/cell-widget.css`: Styles for `g-cell` and `g-ref` elements and their internal structure.
*   `css/components/histogram.css`: Styles specific to the histogram display.
*   `js/main.js`: Application entry point, UI event listeners, orchestrates main processing loop (delegating to `CalculationManager`). Exposes `Guesstinote` API.
*   `js/config.js`: Manages global settings like Monte Carlo sample count and histogram bin count.
*   `js/cell/Cell.js`: Defines the `Cell` class.
*   `js/cell/CellsCollectionManager.js`: Manages the global collection of `Cell` objects.
*   `js/formula/FormulaParser.js`: Tokenizes and parses formula strings into ASTs.
*   `js/formula/Evaluator.js`: Evaluates ASTs, resolves cell references, handles functions, delegates math.
*   `js/math/DistributionGenerator.js`: Generates sample arrays for statistical distributions.
*   `js/math/DistributionMath.js`: Performs arithmetic operations on sample arrays and scalars.
*   `js/math/StatisticsCalculator.js`: Calculates basic statistics (mean, CI) from sample arrays.
*   `js/calculation/CalculationManager.js`: Manages the calculation lifecycle, runs the iterative processing loop for cells, handles pruning of cells, and maintains the global dependency graph to trigger recalculations.
*   `js/ui/CellRenderer.js`: Generates HTML for `<g-cell>`/`<g-ref>` elements.
*   `js/ui/HistogramRenderer.js`: Calculates histogram bin data and generates HTML for histogram display.
*   `js/elements/GCellElement.js`: Defines the `<g-cell>` custom element (no Shadow DOM).
*   `js/elements/GRefElement.js`: Defines the `<g-ref>` custom element (no Shadow DOM).
*   `js/persistence/Persistence.js`: Handles saving/loading documents, import/export.
*   `js/utils/Tutorial.js`: Provides content for the tutorial document (fetched from `html/tutorial-content.html`).
*   `js/parser.js`: (Largely Obsolete) Minimal role, may be removed later.
*   `html/tutorial-content.html`: Contains the HTML for the tutorial document.

