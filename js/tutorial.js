// Contains the content for the initial tutorial document (IS1)
// Updated to use <g-cell> and <g-ref> custom HTML element syntax.

window.Tutorial = { // Explicitly attach to window
    getName: function() {
        return "Guesstinote Tutorial (Custom Elements)";
    },

    getContent: function() {
        return `<h1>Welcome to Guesstinote!</h1>
<p>This is a simple notepad for probabilistic estimates. You can write text and embed special "cells" for calculations using custom HTML tags.</p>
<p>Type your content in the left HTML Editor pane, and see the live preview on the right.</p>

<h2>Basic Cells</h2>
<p>Define a cell like this: <code>&lt;g-cell id="CellID" name="Display Name" formula="FormulaString"&gt;&lt;/g-cell&gt;</code></p>
<ul>
    <li>A constant: <code>&lt;g-cell id="FixedCost" formula="1000"&gt;&lt;/g-cell&gt;</code> <br> Renders as: <g-cell id="FixedCost" formula="1000"></g-cell></li>
    <li>A range (90% confidence interval, normal distribution): <code>&lt;g-cell id="UserGrowth" formula="10 to 50"&gt;&lt;/g-cell&gt;</code> <br> Renders as: <g-cell id="UserGrowth" formula="10 to 50"></g-cell></li>
</ul>

<h2>PERT Distribution</h2>
<p>For project estimates, use PERT: <code>PERT(min, likely, max, lambda?)</code>. Lambda defaults to 4.</p>
<ul>
    <li><code>&lt;g-cell id="BackendTask" formula="PERT(2,5,10)"&gt;&lt;/g-cell&gt;</code> <br> Renders as: <g-cell id="BackendTask" formula="PERT(2,5,10)"></g-cell></li>
    <li><code>&lt;g-cell id="FrontendTask" name="FE Task" formula="PERT(3,6,12,6)"&gt;&lt;/g-cell&gt;</code> <br> Renders as: <g-cell id="FrontendTask" name="FE Task" formula="PERT(3,6,12,6)"></g-cell></li>
    <li><code>&lt;g-cell id="QuickTask" formula="PERT(1,3)"&gt;&lt;/g-cell&gt;</code> (likely is (min+max)/2) <br> Renders as: <g-cell id="QuickTask" formula="PERT(1,3)"></g-cell></li>
</ul>

<h2>Formulas</h2>
<p>Cells can reference each other by ID in their formulas.</p>
<p>Example: <code>&lt;g-cell id="TotalTime" name="Total Project Time" formula="BackendTask + FrontendTask + QuickTask"&gt;&lt;/g-cell&gt;</code></p>
<p>This will result in: <g-cell id="TotalTime" name="Total Project Time" formula="BackendTask + FrontendTask + QuickTask"></g-cell></p>
<p><em>Note: Ensure referenced cell IDs like 'BackendTask', 'FrontendTask', 'QuickTask' are defined above.</em></p>

<h2>Cell IDs and Display Names</h2>
<p>The <code>id</code> attribute is mandatory and used for referencing in formulas. The <code>name</code> attribute is for display; if omitted, the <code>id</code> is used as the display name.</p>
<ul>
    <li><code>&lt;g-cell id="BC" name="BaseCost" formula="50"&gt;&lt;/g-cell&gt;</code> results in: <g-cell id="BC" name="BaseCost" formula="50"></g-cell></li>
    <li><code>&lt;g-cell id="TaxRate" formula="0.2"&gt;&lt;/g-cell&gt;</code> results in: <g-cell id="TaxRate" formula="0.2"></g-cell> (name defaults to "TaxRate")</li>
</ul>
<p>Referencing in formulas uses the ID: <code>&lt;g-cell id="TotalWithTax" formula="BC * (1 + TaxRate)"&gt;&lt;/g-cell&gt;</code> <br> Renders as: <g-cell id="TotalWithTax" formula="BC * (1 + TaxRate)"></g-cell></p>

<h2>Displaying Existing Cells (References)</h2>
<p>Reference a cell for display using <code>&lt;g-ref&gt;</code>: <code>&lt;g-ref id="TargetID" name="Custom Text"&gt;&lt;/g-ref&gt;</code></p>
<ul>
    <li><code>&lt;g-ref id="BackendTask"&gt;&lt;/g-ref&gt;</code> will show the BackendTask cell again: <g-ref id="BackendTask"></g-ref></li>
    <li><code>&lt;g-ref id="BackendTask" name="Duration for backend work"&gt;&lt;/g-ref&gt;</code> will show it with custom text: <g-ref id="BackendTask" name="Duration for backend work"></g-ref></li>
</ul>

<h2>Inline Data Array</h2>
<p>Provide an array of numbers using the <code>array()</code> function: <code>&lt;g-cell id="MyData" formula="array(10,12,11,15,13,14,12,16)"&gt;&lt;/g-cell&gt;</code> <br> Renders as: <g-cell id="MyData" formula="array(10,12,11,15,13,14,12,16)"></g-cell></p>
<p>An empty array can be defined as <code>&lt;g-cell id="EmptyArr" formula="array()"&gt;&lt;/g-cell&gt;</code>: <g-cell id="EmptyArr" formula="array()"></g-cell></p>

<h2>Full-Width Display</h2>
<p>Add <code>full-width="true"</code> to a cell or reference for a block display with a larger histogram:</p>
<p><code>&lt;g-cell id="SalesForecast" formula="1000 to 5000" full-width="true"&gt;&lt;/g-cell&gt;</code></p>
<g-cell id="SalesForecast" formula="1000 to 5000" full-width="true"></g-cell>
<p><code>&lt;g-ref id="SalesForecast" name="Sales Forecast (Full Width Ref)" full-width="true"&gt;&lt;/g-ref&gt;</code></p>
<g-ref id="SalesForecast" name="Sales Forecast (Full Width Ref)" full-width="true"></g-ref>

<hr>
<p>Start editing or create a <button onclick="Persistence.handleNewDocument()">New Document</button>.</p>
`;
    }
};

console.log('tutorial.js loaded (with custom element syntax).');
