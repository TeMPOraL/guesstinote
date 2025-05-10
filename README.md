# Guesstinote: A Client-Side Probabilistic Notepad

**Guesstinote** is a web-based notepad that lets you seamlessly blend rich text with powerful Monte Carlo simulations. Define "cells" with values, distributions (like PERT or Normal), or formulas that reference other cells. Results update reactively as you type!

**It's all about quick, insightful estimation, right in your browser.**

*   **No Backend Needed:** Runs entirely client-side.
*   **No Build Step:** Pure HTML, CSS, and JavaScript.
*   **Vibe-Coded:** Developed with the cutting-edge "trust the process" methodology of 2025.

## Key Features

*   **Reactive Calculations:** Cells update automatically when their inputs or formulas change.
*   **Rich Text Editing:** Combine your notes with dynamic calculations.
*   **Probabilistic Inputs:**
    *   Constants: `[CellA][100]`
    *   Normal Distributions (90% CI): `[CellB][10 to 50]`
    *   PERT Distributions: `[CellC][PERT(2, 5, 10)]` or `[CellD][PERT(1, 3)]`
    *   Inline Data Arrays: `[CellE][array(1,2,3,4,5)]`
*   **Formula Support:** Create complex models by referencing other cells (e.g., `[Total][CellA + CellB * CellC]`).
*   **Visualizations:** Inline histograms provide a quick glance at distributions.
*   **Full-Width Cells:** Expand cells for a more detailed view and larger histogram.
*   **Persistence:** Save and load your documents using browser `localStorage`.
*   **Import/Export:** Easily share your work as plain text.
*   **Customizable Cell Display:** Use `id` for references and `name` for a clean display label.

## How to Use

1.  **Clone the repository (or download the files).**
2.  **Open `index.html` in your web browser.**
    *   That's it! No servers to run, no dependencies to install (beyond what's vendored).
3.  A tutorial document will load by default, showcasing various features.
4.  Edit the HTML in the left pane. The preview on the right will update live.
5.  Use the controls in the header to manage your documents (New, Save, Load, Import/Export).
6.  Adjust the global number of Monte Carlo samples in the footer.

## Cell Syntax Quick Reference

*   **Define a cell:** `<g-cell id="UniqueID" name="Optional Display Name" formula="your_formula_string"></g-cell>`
    *   Example: `<g-cell id="TaskEffort" formula="PERT(2,5,10)"></g-cell>`
    *   Example: `<g-cell id="FixedVal" name="Fixed Value" formula="120"></g-cell>`
*   **Reference a cell for display:** `<g-ref id="UniqueID" name="Optional Custom Display Name"></g-ref>`
    *   Example: `<g-ref id="TaskEffort"></g-ref>`

See `html/tutorial-content.html` (loaded by default) for more examples.

## Development

This project is "vibe-coded." Contributions that enhance the vibe are welcome. Check out `CONVENTIONS.md` and `AI.md` for more insights into the development philosophy.

The core logic is structured into modules within the `js/` directory, covering areas like:
*   `js/cell/`: Cell definition and management.
*   `js/formula/`: Parsing and evaluation of formulas.
*   `js/math/`: Statistical calculations and distribution generation.
*   `js/ui/`: Rendering of cells and histograms.
*   `js/calculation/`: Orchestration of the reactive calculation loop.

---

Happy Guesstimating!

