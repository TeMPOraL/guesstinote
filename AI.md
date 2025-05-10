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

## Project Files and Structure
This section outlines the core files of the Guesstinote project.

*   `index.html`: The main HTML file for the application. Contains the basic page structure, UI elements (editor, buttons, inputs), and links to CSS and JS files.
*   `css/style.css`: Contains all CSS rules for styling the application.
*   `js/main.js`: The main JavaScript entry point. Initializes the application, sets up event listeners, and coordinates interactions between different modules. Exposes a global `Guesstinote` object for inter-module communication and control.
*   `js/cell.js`: (Placeholder) Intended to define the `Cell` class/object, representing a single computational entity with its properties (ID, formula, value, dependencies, etc.) as per `SPECIFICATION.md`.
*   `js/parser.js`: (Basic Implementation) Contains the `Parser` object responsible for scanning document content (currently from `editor.innerHTML`) and identifying cell definitions using regular expressions. Aims to extract raw cell syntax.
*   `js/calculator.js`: (Basic Implementation with Placeholders) Contains the `Calculator` object. It will handle Monte Carlo simulations (PERT, Normal from CI, inline data) and expression evaluation. Currently has placeholder logic for sample generation and basic stats.
*   `js/renderer.js`: (Basic Implementation) Contains the `Renderer` object. Responsible for generating the HTML representation of cells (display name, mean, CI, histogram) and updating the editor content. Current implementation is a naive find-and-replace.
*   `js/persistence.js`: (Basic Implementation) Contains the `Persistence` object. Manages saving and loading documents to/from `localStorage`, handling document IDs, URL fragments, and import/export functionalities.
*   `js/tutorial.js`: (Content Provided) Contains the `Tutorial` object, which provides the name and HTML content for the initial tutorial document loaded on first use or when creating a new document.

