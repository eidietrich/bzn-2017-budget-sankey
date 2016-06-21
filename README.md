# Bozeman 2017 Budget visualization

Interactive d3.js sankey visualization for showing how funding moves through a city budget proposal.

Apologies, this documentation in progress.

What's in this repository:
- index.html - primary html files, includes custom stylings
- css/bootstrap.css - partial version of [Bootstrap](http://getbootstrap.com/) style sheet, used for buttons
- js/d3.min.js - [d3.js](https://d3js.org/), widely used javascript data visualization library 
- js/sankey-modified.js - A customized version of d3's [sankey diagram plugin](https://github.com/d3/d3-plugins/tree/master/sankey), modified to allow explict (instead of algorithmic) positioning of nodes
- js/sankey-chart.js - Code for creating a more-or-less self-contained SankeyChart object, modeled after Elliot Bentley's [reusable d3-code tutorial](http://ejb.github.io/2016/05/23/a-better-way-to-structure-d3-code.html)
- scripts/sankey-data-shaper.py - Python script that takes three input data files (one for revenue flows, one for spending flows and one for additional fund information) and wrangles them into the combined.json file that index.html pulls in to use as source data for the visualization
- data/combined.json - Source data for index.html. 
- data/bzn-2017-budget-revenue-hand-compiled.csv - revenue flows, or budgeted transfers, formatted as three-column .csv: "source" (node name for flow source), "target" (node name for flow source) and "value" (how much money is in each flow)
- data/bzn-2017-budget-spending-hand-compiled.csv - same as revenue flows, except for spending.
- node-keys.json - Additional information for nodes (joints between flows): "cols" (which column of the chart), "rank" (vertical sorting), "color" (node draw color), "label-name" (display name for the node).
