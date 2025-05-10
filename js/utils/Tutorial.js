// Contains the content for the initial tutorial document (IS1)
// Updated to use <g-cell> and <g-ref> custom HTML element syntax.

window.Tutorial = { // Explicitly attach to window
    getName: function() {
        return "Guesstinote Tutorial (Custom Elements)";
    },

    getContent: async function() { // Changed to an async function
        try {
            const response = await fetch('html/tutorial-content.html'); // Path to the new HTML file
            if (!response.ok) {
                console.error("Failed to load tutorial content:", response.status, response.statusText);
                // Return a fallback error message as HTML
                return "<h1>Error</h1><p>Tutorial content could not be loaded. Status: " + response.status + "</p>";
            }
            const htmlContent = await response.text();
            return htmlContent;
        } catch (error) {
            console.error("Error fetching tutorial content:", error);
            // Return a fallback error message as HTML
            return "<h1>Error</h1><p>Tutorial content could not be loaded due to a network or fetch error.</p>";
        }
    }
};

console.log('js/utils/Tutorial.js loaded (now fetches content).');
