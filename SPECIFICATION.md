# Guesstinote: Project Specification

## 1. Overall Project Goal

To create a client-side, web-based notepad application that seamlessly integrates rich text editing with reactive, Monte Carlo simulation-powered probabilistic calculations. Users should be able to define, calculate, and display named "cells" containing distributions or scalar values, with results updating automatically upon changes to inputs. The application should prioritize simplicity and ease of use, allowing for quick note-taking and estimation.

## 2. Key Components (Initial High-Level Design)

*   **A. Document Model:**
    *   Represents the entire Guesstinote document.
    *   Holds a unique Document ID (for `localStorage`).
    *   Contains the raw text content (e.g., Markdown or HTML).
    *   Manages a collection of Cell objects.

*   **B. Editor View:**
    *   The primary user interface for text input and rich text formatting.
    *   Responsible for rendering the document content, including the visual representation of Cells.
    *   Captures user input for both text and Cell definitions/modifications.
    *   Implementation to be the simplest approach: `contenteditable` div if sufficient, or a lightweight, dependency-free Markdown editor/parser if it simplifies Cell parsing and rich text features.

*   **C. Parser & Cell Instantiation Logic:**
    *   Scans the document text to identify Cell definition and reference syntax.
    *   Extracts the ID, display name, formula string, and unit string for each Cell definition.
    *   Initiates the creation or update of Cell objects.

*   **D. Cell Model:**
    *   Represents a single computational entity.
    *   Stores:
        *   Unique Cell ID (user-defined or derived).
        *   User-defined display name.
        *   Raw formula string (e.g., "PERT(2, 5, 10, 6)", "2 to 5", "CellA_ID + CellB_ID").
        *   Unit: (Removed for now. Was e.g., "days").
        *   Type (e.g., PERT, Normal, Constant, Data Array, Formula).
        *   Current value (which could be a scalar or an array of Monte Carlo samples).
        *   Dependencies (other Cell IDs it relies on).
        *   Dependents (other Cell IDs that rely on it).
        *   Cached display values (mean, CI, histogram data).
    *   Handles its own parsing of the formula string to determine its type and parameters.

*   **E. Calculation Engine:**
    *   **E1. Expression Evaluator:**
        *   Parses and evaluates the formulas within Cells.
        *   Resolves references to other Cell IDs.
        *   Performs arithmetic operations on scalars and distributions.
        *   Handles functions like PERT, NORMAL, etc., including Cells as arguments.
    *   **E2. Monte Carlo Simulator:**
        *   Generates random samples for different distribution types.
        *   Performs operations on arrays of samples.
        *   Handles upsampling/downsampling for inline data arrays.
        *   Uses a globally configurable number of samples.

*   **F. Reactivity Manager:**
    *   Builds and maintains a dependency graph between Cells (based on IDs).
    *   When a Cell's definition or value changes, it identifies all dependent Cells and triggers their recalculation, respecting error propagation rules.

*   **G. Cell Renderer:**
    *   Responsible for displaying individual Cells within the Editor View.
    *   Renders the Cell's display name.
    *   Displays annotations (mean, CI).
    *   Generates and displays the histogram.
    *   Handles user interactions with a rendered Cell (e.g., click to expand, interact with input sliders).

*   **H. Persistence & Sharing Manager:**
    *   Manages saving/loading documents to/from `localStorage` using a Document ID.
    *   Updates the URL fragment (`#`) with the Document ID for direct access and bookmarking.
    *   Provides functionality to export the current document content as plaintext (e.g., for copy-pasting).
    *   Provides functionality to import a document from plaintext (e.g., pasting).

## 3. Detailed Functional Requirements

### 3.1. Document Management & Persistence
*   **FR3.1.1:** Each document will have a unique ID, used for persistence in `localStorage`.
*   **FR3.1.2:** The Document ID will be reflected in the URL fragment for direct loading (e.g., `guesstinote.html#doc-xyz123`).
*   **FR3.1.3:** The application must allow users to save the current document to `localStorage`.
*   **FR3.1.4:** The application must allow users to load existing documents from `localStorage`.
*   **FR3.1.5:** Users must be able to export the entire document content as plaintext (e.g., via a "Copy to Clipboard" feature).
*   **FR3.1.6:** Users must be able to import a document by pasting plaintext content into the application.
*   **FR3.1.7:** The application should allow the user to assign an editable name to the current document (this name is for display and organization, distinct from the `localStorage` ID).

### 3.2. Rich Text Editing & Cell Embedding
*   **FR3.2.1:** Users must be able to create and edit rich text content using a simple interface.
*   **FR3.2.2:** Basic formatting options must be supported:
    *   Headlines (e.g., H1, H2, H3)
    *   Paragraphs
    *   Bold
    *   Italic
    *   Monospace (for code/formulas)
    *   Basic tables
    *   Code blocks
*   **FR3.2.3: Cell Definition Syntax:**
    *   `[ID|Display Name][Formula]` (e.g., `[WBK|Widget Backend][PERT(2,5,10)]`)
        *   `ID`: The unique identifier for the Cell, used in formulas.
        *   `Display Name`: The text shown when rendering the Cell.
        *   `Formula`: The expression defining the Cell's value. (Delimited by `[` and `]`)
        *   `Unit`: (Removed for now).
    *   `[NameAsIDAndDisplayName][Formula]` (e.g., `[Widget Frontend][2 to 5]`)
        *   `NameAsIDAndDisplayName`: Serves as both the Cell ID and its initial Display Name.
*   **FR3.2.4: Cell Reference Syntax (for display):**
    *   `[#ID]` : Displays the Cell with ID `ID` using its defined `Display Name`.
    *   `[#ID|Custom Display Name]` : Displays the Cell with ID `ID` using the provided `Custom Display Name`.
*   **FR3.2.5: Full-Width Cell Display:**
    *   A mechanism (e.g., a specific Cell reference type or a property of a Cell definition) should allow a Cell to be rendered as its own paragraph, with a larger, full-width histogram.

### 3.3. Cell Definition & Input Types
*   **FR3.3.1: Cell IDs in Formulas:** Formulas will reference other Cells by their `ID` (e.g., `[TotalCost][WBK + Widget_Frontend * InflationRate]` where `TotalCost` is the cell being defined, and `WBK` etc. are IDs used in its formula).
*   **FR3.3.2: Constant Input:**
    *   Syntax: `[MyConstantID|My Constant][42]` or `[MyConstantID][42]`
    *   Represents a single, fixed numerical value.
*   **FR3.3.3: PERT Distribution Input:**
    *   `PERT(min, most_likely, max, lambda)`: Modified PERT with `min`, `most_likely`, `max` values, and `lambda` shape parameter.
    *   `PERT(min, most_likely, max)`: Lambda defaults to 4.
    *   `PERT(min, max)`: `most_likely` defaults to `(min + max) / 2`, lambda defaults to 4.
    *   The formula for a PERT cell would look like: `[MyTask][PERT(1,2,3)]`.
    *   Arguments to PERT (and other functions) can be constants or other Cell IDs. If Cell IDs are distributions, the behavior needs to be well-defined (e.g., sample from the argument distributions to generate parameters for each main simulation sample, or take the mean of argument distributions). *Initial approach: for function parameters that are distributions, use their mean value.*
*   **FR3.3.4: Normal Distribution (from 90% CI) Input:**
    *   Syntax: `[EstimateB_ID][value1 to value2]` (e.g., `[MyEstimate][2 to 5]`)
    *   Represents a normal distribution where `value1` and `value2` form a 90% confidence interval, symmetric around the mean. Mean = `(value1 + value2) / 2`. Std.dev. ≈ `(value2 - mean) / 1.645`.
*   **FR3.3.5: Inline Data Array Input:**
    *   Syntax: `[DataSetC_ID][[d1, d2, ..., dn]]` (e.g., `[MyData][[10,12,11,15,13]]`)
    *   Represents a distribution defined by an explicit array of numerical samples. Upsampled/downsampled to global sample count. Syntax should be easily changeable. The inner `[]` are part of the formula content.
*   **FR3.3.6: Formula Input (Referencing Other Cells):**
    *   Syntax: `[Total_ID|Total Cost][CostA_ID + CostB_ID * Factor_ID]`
    *   Allows basic arithmetic operations using constants and references to other Cell IDs.

### 3.4. Cell Computation & Reactivity
*   **FR3.4.1:** All non-constant Cells not defined by inline data arrays will have their values (distributions) computed via Monte Carlo simulation.
*   **FR3.4.2:** A global, configurable number of samples (default: 5000) will be used for all Monte Carlo simulations.
*   **FR3.4.3:** Supported arithmetic operators for formulas: Addition (`+`), Subtraction (`-`), Multiplication (`*`), Division (`/`), Exponentiation (`^`).
*   **FR3.4.4:** Operators must work correctly between: Scalar-Scalar, Scalar-Distribution, Distribution-Distribution (element-wise).
*   **FR3.4.5:** The system must implement a reactive calculation model.
    *   Changes to a Cell's definition (formula, parameters) must trigger recalculation of that Cell and its dependents.
    *   If a Cell's `ID` is changed in its definition, existing references in other formulas to the *old ID* will break (they are not automatically updated).

### 3.5. Cell Display & Interaction
*   **FR3.5.1:** When a Cell definition (e.g., `[WBK|Widget Backend][PERT(2,5,10)]`) is processed:
    *   It should be rendered primarily as its `Display Name` (e.g., "Widget Backend").
    *   Annotations (mean, 90% CI) and a small histogram should be displayed. Unit is removed.
*   **FR3.5.2:** Constant Cells should be rendered with their numerical value. Unit is removed.
*   **FR3.5.3:** The original definition of a Cell must remain editable.
*   **FR3.5.4:** Cells should be selectable/expandable to view more details (larger histogram, quantiles).
*   **FR3.5.5: Interactive Inputs:** Numeric parameters within Cell definitions (e.g., in `PERT(min, likely, max)`, `X to Y`, or constants) should be interactively adjustable, possibly via sliders or similar UI elements that appear on focus/selection of the cell or parameter. These changes should trigger reactivity.

### 3.6. UX Features
*   **FR3.6.1: Autocomplete for Cell IDs:** When typing a formula, provide autocomplete suggestions for existing Cell IDs.
*   **FR3.6.2: Jump to Definition:** Allow navigation from a Cell reference (in formula or display) to its definition.

### 3.7. Error Handling
*   **FR3.7.1:** The system must not enter infinite loops due to circular dependencies (detection and error reporting needed).
*   **FR3.7.2:** If a Cell encounters an error during calculation (e.g., syntax error, undefined ID reference, division by zero, math overflow/underflow):
    *   The erroneous Cell itself (and all its display references) should be highlighted (e.g., red border/background).
    *   Its display name should still be rendered.
    *   Its calculated values (mean, CI) and histogram may be absent or show an error state.
*   **FR3.7.3:** Cells that depend on an erroneous Cell:
    *   Should be highlighted differently (e.g., yellow border/background).
    *   Should "freeze" their last successfully computed values and histogram.
    *   Should not attempt to recalculate until all their dependencies are error-free. This behavior applies recursively down the dependency chain.

## 4. Non-Functional Requirements (from CONVENTIONS.md)

*   **NFR1:** All code must run entirely client-side in the browser.
*   **NFR2:** Solutions should not require a build step (vanilla HTML/JS/CSS preferred).
*   **NFR3:** Minimize dependencies; if used, they must be vendored (local copies).
*   **NFR4:** Use modern HTML, CSS, and JavaScript features supported by recent versions of Firefox and Chrome.
*   **NFR5:** Separate concerns into different JavaScript files (e.g., math logic, DOM manipulation, application flow).

## 5. Initial Document State

*   **IS1:** On first load, or when creating a new document, or if a document ID from the URL fragment is not found in `localStorage`, the application should display a pre-defined tutorial document. This tutorial should showcase key features and syntax.

This specification should serve as a good guide for development.
