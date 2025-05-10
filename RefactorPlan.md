# Guesstinote Code Modularization Plan

This plan outlines a revised file structure and distribution of concerns for
the Guesstinote project, aiming for better modularity and maintainability.

## I. JavaScript Modularization Plan:

The JavaScript code will be reorganized into more focused modules,
typically within subdirectories reflecting their primary domain.

### 1.  Core Application & Orchestration:
    *   `js/main.js`: (Retains name, but delegates more) `[x]`
        *   Responsibilities: Application entry point, initialization, top-level UI event listeners (doc name, global samples, main buttons), orchestration of the main processing loop (delegating to CalculationManager). Manages the Guesstinote global API object.
        *   Why: Centralizes application startup and high-level UI interaction.

### 2.  Cell Model & Management:
    *   `js/cell/Cell.js`: (Replaces `js/cell.js`) `[x]`
        *   Responsibilities: Defines the `Cell` class (ID, formula, AST, value, samples, error state, dependencies, dependents, associated DOM elements). Handles its own state changes and notifications.
        *   Why: Encapsulates the core data and behavior of a single computational unit.
    *   `js/cell/CellsCollectionManager.js`: (New module) `[x]`
        *   Responsibilities: Manages the global collection of `Cell` objects (add, remove, retrieve), prunes cells that are no longer present in the document.
        *   Why: Isolates the logic for managing the set of all cells.

### 3.  Formula Processing Pipeline:
    *   `js/formula/FormulaParser.js`: (Replaces `js/formula_parser.js`) `[x]`
        *   Responsibilities: Tokenizes formula strings and parses them into Abstract Syntax Trees (ASTs).
        *   Why: Dedicated to syntactic analysis of formulas.
    *   `js/formula/Evaluator.js`: (Replaces `js/evaluator.js`) `[x]`
        *   Responsibilities: Evaluates ASTs. Resolves cell references (using CellsCollectionManager), handles function calls, and performs arithmetic operations by delegating to `DistributionMath`.
        *   Why: Dedicated to the semantic evaluation of parsed formulas.

### 4.  Calculation & Math Logic:
    *   `js/config.js`: (New module) `[x]`
        *   Responsibilities: Stores and manages global settings like the number of Monte Carlo samples and the calculated histogram bin count. Provides an interface to get/set these values.
        *   Why: Centralizes application-wide configurable parameters.
    *   `js/math/DistributionGenerator.js`: (New, from `js/calculator.js`) `[x]`
        *   Responsibilities: Generates sample arrays for various statistical distributions (PERT, Normal from CI, etc.), using global settings from `js/config.js`.
        *   Why: Isolates the logic for creating specific types of distributions.
    *   `js/math/DistributionMath.js`: (New, from `js/calculator.js`) `[x]`
        *   Responsibilities: Performs arithmetic operations (element-wise) on sample arrays and scalars (Scalar OP Scalar, Scalar OP Array, Array OP Array).
        *   Why: Centralizes the core mathematical operations for distributions and scalars.
    *   `js/math/StatisticsCalculator.js`: (New, from `js/calculator.js`) `[x]`
        *   Responsibilities: Calculates basic statistics (e.g., mean, confidence intervals) from sample arrays. Does NOT include histogram binning.
        *   Why: Isolates general statistical calculations.

### 5.  Reactivity & Calculation Management:
    *   `js/calculation/CalculationManager.js`: (New module) `[x]`
        *   Responsibilities: Manages the overall calculation lifecycle. Runs the iterative processing loop for all cells. Orchestrates calls to `Cell.processFormula()`. Handles pruning of cells. Builds and maintains the global dependency graph (which cells depend on which, and vice-versa) based on information from `Cell` instances. If a cell's output changes, `CalculationManager` uses this graph to identify and mark its direct dependents for re-evaluation.
        *   Why: Centralizes the complex logic of reactive updates and the calculation flow across all cells.

### 6.  Rendering & UI Components:
    *   `js/ui/CellRenderer.js`: (Replaces `js/renderer.js`, with narrower scope) `[x]`
        *   Responsibilities: Generates the HTML content for `<g-cell>` and `<g-ref>` elements (no Shadow DOM), displaying cell name, value/statistics (mean, CI), and error messages. Delegates histogram rendering to `HistogramRenderer`.
        *   Why: Focuses on rendering the textual and basic state of a cell, separating it from complex visualizations.
    *   `js/ui/HistogramRenderer.js`: (New module) `[x]`
        *   Responsibilities:
            1.  Calculates histogram bin data (bin ranges and frequencies) from sample arrays, using the global bin count (Terrell-Scott's rule: ceil(pow(2*N, 1/3))) obtained from `js/config.js`.
            2.  Generates the HTML/SVG structure for displaying the histogram.
        *   Why: Isolates all histogram-related logic (data calculation and visual rendering).
    *   `js/elements/GCellElement.js`: (Largely as-is) `[x]`
        *   Responsibilities: Defines the `<g-cell>` custom element (no Shadow DOM), handles its attributes, interacts with its corresponding `Cell` model instance, and uses `CellRenderer` to populate its content.
        *   Why: Encapsulates the `<g-cell>` web component.
    *   `js/elements/GRefElement.js`: (Largely as-is) `[x]`
        *   Responsibilities: Defines the `<g-ref>` custom element (no Shadow DOM), handles its attributes, interacts with the target `Cell` model instance, and uses `CellRenderer` to populate its content.
        *   Why: Encapsulates the `<g-ref>` web component.

### 7.  Persistence & Utilities:
    *   `js/persistence/Persistence.js`: (Replaces `js/persistence.js`) `[x]`
        *   Responsibilities: Handles saving and loading documents to/from `localStorage`, document import/export functionality.
        *   Why: Well-defined, focused concern.
    *   `js/utils/Tutorial.js`: (Replaces `js/tutorial.js`) `[x]`
        *   Responsibilities: Provides the content for the initial tutorial document (fetched from `html/tutorial-content.html`).
        *   Why: Simple utility, well-isolated.

## II. CSS Modularization Plan:

The single `css/style.css` file will be broken down into multiple, more focused stylesheets.

1.  `css/base/variables.css`: `[x]` (File created and then removed as unused, fulfilling the plan's intent)
    *   Concerns: Defines CSS custom properties for global theme elements (colors for errors, warnings, primary UI elements; font families; common spacing units).
    *   Why: Establishes a common visual language and facilitates easier theming or global style adjustments.

2.  `css/layout/app-layout.css`: `[x]`
    *   Concerns: Styles for the main page structure (`body`, `header`, `main` container for editor/preview, `footer`), and styles for general UI controls in the header/footer.
    *   Why: Separates overall application layout from component-specific styling.

3.  `css/components/cell-widget.css`: `[x]`
    *   Concerns: Styles for the `<g-cell>` and `<g-ref>` host elements and their internal structure (name, value, CI, formula display, error messages). This includes states like error, dependency error, etc.
    *   Why: Encapsulates all styling for the cell widgets. These styles are now global as Shadow DOM was removed.

4.  `css/components/histogram.css`: `[x]`
    *   Concerns: Styles specific to the histogram display (`.histogram-container`, `.histogram-bar`).
    *   Why: Isolates styling for the histogram component. Styles are global.

5.  `css/components/editor.css`: `[x]`
    *   Concerns: Styles for the HTML editor textarea (`#htmlEditor`).
    *   Why: Allows independent styling and potential future enhancements of the text input area.

## III. Histogram Bin Count Update:

*   The number of bins for histograms will be calculated using Terrell-Scott's rule: `ceil(pow(2 * N, 1/3))`, where `N` is the global number of samples. `[x]`
*   This calculation will be performed once (e.g., in `js/config.js` or by `HistogramRenderer` upon initialization) and updated if the global number of samples changes. `[x]`
*   This bin count will be used for all histograms, except for cells representing a single scalar value (which will show one bin/bar). `[x]`

## IV. Rationale for Changes:

*   **Improved Modularity:** Each file/module will have a more clearly defined responsibility.
*   **Reduced Coupling:** Changes within one module (e.g., `DistributionMath`) are less likely to necessitate changes in unrelated modules (e.g., `Persistence`).
*   **Enhanced Maintainability:** Easier to locate and modify code related to a specific feature or bug.
*   **Scalability:** A more organized structure will better accommodate future features and complexity.
*   **Targeted Context for Future Interactions:** Smaller, focused modules mean fewer files will need to be provided in chat for specific modification requests.

This refactoring represents a significant structural change to the project, aiming for long-term benefits in development and maintenance.
