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
This section outlines the core files of the Guesstinote project.

*   `index.html`: The main HTML file. Defines the two-pane layout (HTML editor and preview), UI controls (buttons, inputs), and includes all necessary CSS and JavaScript files.
*   `css/style.css`: Contains all CSS rules for styling the application, including the layout for the editor and preview panes.
*   `js/main.js`: The primary JavaScript entry point. Initializes the application, sets up event listeners for the HTML editor (`<textarea>`) and global controls. Manages the `CellsCollection`, orchestrates the update of the preview pane, prunes deleted cells, and triggers the main processing loop for cell calculations. Exposes the global `Guesstinote` object.
*   `js/cell.js`: Defines the `Cell` class. Each `Cell` instance represents a computational unit, storing its ID, display name, raw formula, parsed AST, calculated value/samples, statistics (mean, CI, histogram data), dependencies, and dependents. It's responsible for processing its own formula (using `FormulaParser` and `Evaluator`) and notifying its associated custom DOM elements (`g-cell`, `g-ref`) of changes.
*   `js/parser.js`: (Largely Obsolete) Previously responsible for finding `[...]` cell syntax. With the custom element approach, its role is minimal. It's kept for now to avoid breaking potential old imports but does not actively parse document content for cells.
*   `js/formula_parser.js`: Contains the `FormulaParser` IIFE. This module is responsible for tokenizing and parsing a formula string (e.g., "PERT(1,2,3) + MyCellID") into an Abstract Syntax Tree (AST), which is then used by the `Evaluator`.
*   `js/evaluator.js`: Contains the `Evaluator` IIFE. This module takes an AST (from `FormulaParser`) and a `CellsCollection` to recursively evaluate the formula, resolve cell dependencies, handle function calls (like PERT, array), and perform arithmetic operations. It returns the calculated result (scalar or an array of samples).
*   `js/calculator.js`: Contains the `Calculator` object. Provides utility functions for generating samples for various distributions (PERT, Normal from CI, inline data arrays via `processInlineDataArray`), calculating statistics (mean, CI, histogram bins) from sample arrays, and performing arithmetic operations on scalars and sample arrays.
*   `js/renderer.js`: Contains the `Renderer` object. Its primary function `renderCell` is responsible for generating the visual content (display name, value/stats, histogram) *within the Shadow DOM* of `<g-cell>` and `<g-ref>` custom elements. It also applies appropriate CSS classes to the host custom element for error states.
*   `js/persistence.js`: Contains the `Persistence` object. Manages saving and loading documents (which are now plaintext HTML containing `<g-cell>` and `<g-ref>` tags) to/from `localStorage`. Handles document IDs, document listing, URL fragment updates, and import/export functionalities.
*   `js/tutorial.js`: Contains the `Tutorial` object. Provides the name and HTML content (using the new `<g-cell>` and `<g-ref>` syntax) for the initial tutorial document.
*   `js/elements/GCellElement.js`: Defines the `GCellElement` custom HTML element (tag: `<g-cell>`). This element is responsible for:
    *   Reading its attributes (`id`, `name`, `formula`, `full-width`).
    *   Creating or updating the corresponding `Cell` object in the global `CellsCollection`.
    *   Registering itself with the `Cell` object for display updates.
    *   Triggering its own rendering by calling `Renderer.renderCell` to populate its Shadow DOM.
*   `js/elements/GRefElement.js`: Defines the `GRefElement` custom HTML element (tag: `<g-ref>`). This element is responsible for:
    *   Reading its attributes (`id` of the target cell, `name`, `full-width`).
    *   Finding the target `Cell` object in `CellsCollection` and subscribing to its updates.
    *   Triggering its own rendering by calling `Renderer.renderCell` to populate its Shadow DOM with the target cell's information.

