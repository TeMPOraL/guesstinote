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

