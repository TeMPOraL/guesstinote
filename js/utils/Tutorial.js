// Provides the content for the initial tutorial document.
// Content for this file should be moved from the original js/tutorial.js

// Placeholder if original content is not available:
const Tutorial = {
    getName: function() {
        return "Guesstinote Tutorial";
    },
    getContent: function() {
        return `<h1>Welcome to Guesstinote!</h1>
<p>This is a simple notepad for probabilistic estimates.</p>
<p>Define a cell like this: <code>&lt;g-cell id="MyCell" name="My Display Name" formula="10 to 20"&gt;&lt;/g-cell&gt;</code></p>
<p>Reference it like this: <code>&lt;g-ref id="MyCell"&gt;&lt;/g-ref&gt;</code></p>
<p>Example: <g-cell id="Cost" name="Project Cost" formula="PERT(100, 150, 250)"></g-cell></p>
<p>Referenced Cost: <g-ref id="Cost"></g-ref></p>
`;
    }
};

window.Tutorial = Tutorial; // Expose globally
console.log('js/utils/Tutorial.js loaded (placeholder).');
