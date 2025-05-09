// Contains the content for the initial tutorial document (IS1)

window.Tutorial = { // Explicitly attach to window
    getName: function() {
        return "Guesstinote Tutorial";
    },

    getContent: function() {
        return `<h1>Welcome to Guesstinote!</h1>
<p>This is a simple notepad for probabilistic estimates. You can write text and embed special "cells" for calculations.</p>

<h2>Basic Cells</h2>
<p>Define a cell like this: <code>[CellName](Formula)[Unit]</code></p>
<ul>
    <li>A constant: <code>[FixedCost](1000)[USD]</code> becomes [FixedCost](1000)[USD]</li>
    <li>A range (90% confidence interval, normal distribution): <code>[UserGrowth](10 to 50)[users/day]</code> becomes [UserGrowth](10 to 50)[users/day]</li>
</ul>

<h2>PERT Distribution</h2>
<p>For project estimates, use PERT: <code>PERT(min, likely, max, lambda?)</code>. Lambda defaults to 4.</p>
<ul>
    <li><code>[BackendTask](PERT(2,5,10))[days]</code> becomes [BackendTask](PERT(2,5,10))[days]</li>
    <li><code>[FrontendTask](PERT(3,6,12,6))[days]</code> becomes [FrontendTask](PERT(3,6,12,6))[days]</li>
    <li><code>[QuickTask](PERT(1,3))[days]</code> becomes [QuickTask](PERT(1,3))[days] (likely is (min+max)/2)</li>
</ul>

<h2>Formulas</h2>
<p>Cells can reference each other by ID. If no ID is specified with <code>|</code>, the display name is the ID.</p>
<p>Example: <code>[TotalTime|Total Project Time](BackendTask + FrontendTask + QuickTask)[days]</code></p>
<p>This will result in: [TotalTime|Total Project Time](BackendTask + FrontendTask + QuickTask)[days]</p>
<p><em>Note: Ensure referenced cell IDs like 'BackendTask', 'FrontendTask', 'QuickTask' are defined above. The parser is simple for now.</em></p>

<h2>Cell IDs and Display Names</h2>
<ul>
    <li><code>[ID|Display Name](Formula)</code>: e.g., <code>[BC|BaseCost](50)[USD]</code> results in [BC|BaseCost](50)[USD]</li>
    <li><code>[NameIsID](Formula)</code>: e.g., <code>[TaxRate](0.2)</code> results in [TaxRate](0.2)</li>
</ul>
<p>Referencing in formulas uses the ID: <code>[TotalWithTax](BC * (1 + TaxRate))[USD]</code> becomes [TotalWithTax](BC * (1 + TaxRate))[USD]</p>

<h2>Displaying Existing Cells</h2>
<p>Reference a cell for display: <code>[#ID]</code> or <code>[#ID|Custom Text]</code></p>
<ul>
    <li><code>[#BackendTask]</code> will show the BackendTask cell again.</li>
    <li><code>[#BackendTask|Duration for backend work]</code> will show it with custom text.</li>
</ul>

<h2>Inline Data Array</h2>
<p>Provide an array of numbers: <code>[MyData]([10,12,11,15,13,14,12,16])[points]</code> becomes [MyData]([10,12,11,15,13,14,12,16])[points]</p>

<p>Start editing or create a <button onclick="Persistence.handleNewDocument()">New Document</button>.</p>
`;
    }
};

console.log('tutorial.js loaded');
