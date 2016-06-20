/* 
Packaged sankey chart 

Hat tip to http://ejb.github.io/2016/05/23/a-better-way-to-structure-d3-code.html for design pattern.

TERMINOLOGY:
panes: views of the graphic (defined by opts.panes) --> include highlight conditions and description
nodes: diagram nodes, with height value representing greater of in- or out-flows
links: paths representing node to node flow, width proportional to flow 

EXPECTED DATA STRUCTURE:
TODO

TODO:
- Clean up reliance on BOZEMAN_POP global var
- Add example initialization to this documentation
- Make buttons set scroll to button top on press (so whole description below chart is visible)
- Add label position control to opts.layout
- - show/hide value threshold
- - inner/outer display
*/

var SankeyChart = function(opts) {
    this.data = opts.data;
    this.element = opts.element;
    this.topLabels = opts.topLabels;
    this.panes = opts.panes;
    this.layout = opts.layout;

    

    // // Add buttons across the top
    // // TODO: Figure out how to make this work
    // this.buttonGroup = d3.select('#viz-container').append("div")
    //   .attr({
    //     class: "btn-group",
    //     id: "pane-toggle",
    //     role: "group"
    //   });

    // this.buttonGroup.data(this.panes).enter()
    //   .append("button")
    //     .attr({
    //       type: "button",
    //       name: function(d){ return d.name; },
    //       class: "btn btn-default"
    //     })
    //     .text( function(d) { return d.name; });

    this.draw();
    this.initializeDescription();

    // EVENT LISTENERS
    // redraw on window resize
    var that = this;
    d3.select(window).on('resize', function(){
      that.draw();
    });
    
    // NOTES: Making an effort to pass nodes / link references around as their data objects. Not sure how consistent I'm being.
    
  };
  SankeyChart.prototype.draw = function(){
    this.configLayout();

    // Clear viz element
    this.element.innerHTML = '';

    // append the svg canvas to the page
    this.svg = d3.select(this.element).append("svg")
      .attr("width", this.width)
      .attr("height", this.height);

    this.drawSankey();
    this.addTopLabels();
    this.addListeners();
  };
  SankeyChart.prototype.initializeDescription = function(){
    this.currentPane = this.panes[0];
    this.holdState = false; // Locking flow highlight state
    this.setDescription(this.currentPane.subhead, this.currentPane.description);
  };
  SankeyChart.prototype.configLayout = function(){
    this.width = this.element.offsetWidth;

    this.drawMode = this.width > this.layout.mobileBreak ? 'desktop' : 'mobile';
    var layoutConfig = this.layout[this.drawMode];

    this.height = this.width * layoutConfig.aspect;
    this.margin = layoutConfig.margins;
    this.nodeWidth = layoutConfig.nodeWidth;
    this.nodePadding = layoutConfig.nodePadding;

    this.plotWidth = this.width - this.margin.left - this.margin.right;
    this.plotHeight = this.height - this.margin.top - this.margin.bottom;
  };
  SankeyChart.prototype.drawSankey = function(){
    var that = this;
    this.plot = this.svg.append('g')
      .attr("transform",
          "translate(" + this.margin.left + "," + this.margin.top + ")");

    // Set the sankey diagram properties
    this.sankey = d3.sankey()
      .nodeWidth(this.nodeWidth)
      .nodePadding(this.nodePadding)
      .size([this.plotWidth, this.plotHeight]);

    this.path = this.sankey.link();

    this.sankey
      .nodes(this.data.nodes)
      .links(this.data.links)
      .layout(0);

    // Add link elements
    this.link = this.plot.append('g').selectAll(".link")
      .data(this.data.links);

    // Draw links
    this.link.enter().append("path")
      .attr("class", "link")
      .attr("d", this.path)
      .style("stroke-width", function(d) { return Math.max(1, d.dy);})
      .style("stroke", function(d) { return d3.rgb(d.source.color).darker(0); })
      .sort(function(a, b) {
          return b.dy - a.dy;
      });

    // Add node elements
    this.node = this.plot.append("g").selectAll(".node")
      .data(this.data.nodes)
      .enter().append("g")
      .attr("class", "node")
      .attr("transform", function(d) {
        return "translate(" + d.x + "," + d.y + ")";
      });

    // draw rectangles for the nodes
    this.node.append("rect")
      .attr("height", function(d) {
        return d.dy;
      })
      .attr("width", this.sankey.nodeWidth())
      .attr("class", "node-rect")
      .style("fill", function(d) {
        // return '#888'
        return d.color;
      })
      .style("stroke", function(d) {
        // return '#555'
        return d3.rgb(d.color).darker(0.5);
      });

    console.log(this.layout[this.drawMode]);
    var labelOpts = {
      'mobile': {
        '1': {
          // right position
          'display': true, 'filterValue': 5000000,
          'x': 6 + that.sankey.nodeWidth(), 'text-anchor': 'start'
        },
        '2': {
          // no display
          'display': false, 'filterValue': 3000000,
        },
        '3': {
          // left position
          'display': true, 'filterValue': 5000000,
          'x': -6, 'text-anchor': 'end'
        }
      },
      'desktop': {
       '1': {
        // left position
          'display': true, 'filterValue': 3000000,
          'x': -6, 'text-anchor': 'end'
       },
       '2': {
          'display': false, 'filterValue': 3000000,
       },
       '3': {
          'display': true, 'filterValue': 3000000,
          'x': 6 + that.sankey.nodeWidth(), 'text-anchor': 'start'

       }
      }
    };



    // add in node titles
      this.node.append("text")
      // .filter(function(d) { return d.col === 1 || d.col === 3;})
      // .filter(function(d) { return d.value > that.layout[that.drawMode].filterValue; })
      .filter(function(d) {
        var opts = labelOpts[that.drawMode][String(d.col)];
        var displayFilter = opts.display;
        var valueFilter = d.value > opts.filterValue;

        console.log(opts);
        console.log(displayFilter && valueFilter);

        return displayFilter && valueFilter;
      })
        .attr("transform", null)
        .attr("y", function(d) { return d.dy / 2; })
        .attr("dy", ".35em")
        .attr('x', function(d) { return labelOpts[that.drawMode][String(d.col)].x; })
        .attr('text-anchor', function(d){ return labelOpts[that.drawMode][String(d.col)]['text-anchor']; })
        // .attr("x", -6)
        // .attr("text-anchor", "end")
        .text(function(d) { return d['label-name']; })
        // .call(wrap)
      // .filter(function(d) { return d.col > 1; })
      //   .attr("x", 6 + this.sankey.nodeWidth())
      //   .attr("text-anchor", "start");
  };
  SankeyChart.prototype.addTopLabels = function(){
    var that = this;
    this.svg.append('g')
      .selectAll('text')
      .data(this.topLabels).enter()
      .append('text')
        .text(function(d){ return d.text; })
        .attr("class","label")
        .attr("x", function(d){ return d.position * that.width; })
        .attr("y", 15)
        .attr("text-anchor", function(d){ return d.anchor; });
  };
  SankeyChart.prototype.setDescription = function(subhead,textArray){
    // Replace whatever's in description field with 'subhead' and 'text'

    this.descrElem = document.querySelector('#description');
    this.descr = d3.select(this.descrElem);
    var that = this;

    var change = function(){
      that.descrElem.innerHTML = '';
      that.descr.append("h3")
        .text(subhead);
      that.descr.selectAll("p")
        .data(textArray).enter()
        .append('p')
        .text(function(d){ return d;});
    };

    // Fade-out-change-fade-in transition
    this.descr
      .transition().duration(100)
        .style("opacity", 0)
        .each("end", change)
      .transition().duration(100)
        .style("opacity", 1);
  };
  SankeyChart.prototype.addListeners = function(){
    /*
    Interaction logic: 
    Hover on/off select works by default
    Click on node turns on hold state, selects node
    Click on any node turns off hold state, deselects
    Hover changes description but not highlight during hold state
    */

    var highlightNode = null;
    var describeElement = null;

    var that = this;

    var onHighlight = function(){
      if (that.holdState === false){
        highlightNode = d3.select(this).datum(); // datum call gets to node data as object
        that.setHighlight([highlightNode]);
      }
      //TODO: Update these to use datum, so I'm passing objects around between functions
      describeElement = d3.select(this); 
      that.changeDescriptionTo(describeElement);
    };
    var offHighlight = function(){
      if (that.holdState === false){
        highlightNode = null;
        that.setHighlight(highlightNode);
      }
      describeElement = null;
      that.changeDescriptionTo(describeElement);
    };
    var click = function(){
      if (that.holdState === true) {
        highlightNode = null;
        describeElement = null;
        that.holdState = false;
        that.setPane(that.panes[0]) // Set to first/default pane
        that.setHighlight(highlightNode);
        that.changeDescriptionTo(describeElement);
      } 
      else {
        highlightNode = d3.select(this).datum();
        describeElement = d3.select(this);
        that.holdState = true;
        that.setHighlight([highlightNode]);
        that.changeDescriptionTo(describeElement);
      }      
    };
    this.plot.selectAll(".node-rect")
      .on("mouseover", onHighlight)
      .on("mouseout", offHighlight)
      .on("click", click); 


    // Pane xfer handling
    var getPaneByName = function(name){
      var that = this, match = null;
      this.panes.forEach(function(d){
        if (d.name == name) {
          match = d;
        }
      });
      return match;
    };
    
    d3.selectAll('#pane-toggle button')
      .on("click", function(){
        // var toggleButton = function(newButton){
        //   d3.selectAll('#pane-toggle button').classed('active', false);
        //   d3.select(newButton).classed('active', true);
        // };

        var pane = getPaneByName(this.getAttribute('name'));

        that.setPane(pane);
        console.log(this.getBoundingClientRect().top);
      }); 
  };
  SankeyChart.prototype.setPane = function(pane){
    var getNodeByName = function(name){
      var node = d3.selectAll('.node')
        .filter(function(d){
          // console.log(d.name, d.name === name);
          return d.name === name;
        });
      return node.datum();
    };
    var getButtonByName = function(name){
      return d3.select('#pane-toggle').select('[name="' + name + '"]')
    };

    var button = getButtonByName(pane.name);


    // Change button states

    d3.selectAll('#pane-toggle button').classed('active', false);
    button.classed('active', true);

    // Set this.currentPane (data object)
    this.currentPane = pane;

    // Change description
    this.setDescription(pane.subhead, pane.description);

    // Change chart appearance
    if (pane.includeNodes == '$ALL'){
      this.holdState = false;
      this.setHighlight(null);
    } else {
      this.holdState = true;
      var nodes = [];
      pane.includeNodes.forEach(function(d){
        nodes.push(getNodeByName(d));
      });
      this.setHighlight(nodes);
    }
  };
  SankeyChart.prototype.setHighlight = function(highlightNodes){
    // Takes null, or array of node objects
    // CASE: highlightSelection is null --> demask everything
    // CASE: highlightSelection is a single node --> mask everything else
    // CASE: highlightSelection is an array of nodes --> mask everything but them

    var getConnections = function(node){
      // Walks forward and backwards full length of diagram,
      // returning nodes and links connected to single node
      var connections = { nodes: [node], links: [] };

      var backLinks = node.targetLinks;
      backLinks.forEach(function(link){
        connections.links.push(link);
        connections.nodes.push(link.source);
        link.source.targetLinks.forEach(function(link){ 
          connections.links.push(link);
          connections.nodes.push(link.source);
          backLinks.push(link); // Allows further iteration, I think
        });
      });
      var forwLinks = node.sourceLinks;
      forwLinks.forEach(function(link){
        connections.links.push(link);
        connections.nodes.push(link.target);
        link.target.sourceLinks.forEach(function(link){
          connections.links.push(link);
          connections.nodes.push(link.target);
          forwLinks.push(link);
        });
      });

      return connections;
    };

    // Clear highlight
    d3.selectAll('.link')
      .classed("mask", false);
    d3.selectAll('.node')
      .classed("mask", false);

    // Apply highlight unless highlightNodes is null
    if (highlightNodes !== null){
      var highlights = {nodes: [], links: []};
      highlightNodes.forEach(function(node){
        var connections = getConnections(node);
        highlights.nodes = highlights.nodes.concat(connections.nodes);
        highlights.links = highlights.links.concat(connections.links);
      });

      d3.selectAll('.link')
        .filter(function(link) {
          // check whether each link object is in highlightLinks
          i = highlights.links.indexOf(link);
          return i === -1;
        })
        .classed("mask", true);
      d3.selectAll('.node')
        .filter(function(node){
          i = highlights.nodes.indexOf(node);
          return i === -1;
        })
        .classed("mask", true);
    }
  };
  SankeyChart.prototype.changeDescriptionTo = function(describeElement){
    // TODO: Change this function name

    // TODO: Set this so it intelligently applies millions labels
    var formatValue = function(amount){
      return '$' + d3.format(",.0f")(amount);
    };
    
    var description = [];
    if (describeElement !== null){
      var elemData = describeElement.datum();
      if (elemData.col === 1){
        description.push(formatValue(elemData.value) + " in expected revenue, or " + formatValue(elemData.value / BOZEMAN_POP) + " per resident.");
      } else if (elemData.col === 2){
        var fundRevenue = sum(elemData.targetLinks, "value");
        var fundSpending = sum(elemData.sourceLinks, "value");
        description.push(formatValue(fundRevenue) + " in expected revenue, " +
          formatValue(fundSpending) + " in proposed spending.");
      } else if (elemData.col === 3){
        // Description for spending category
        description.push(formatValue(elemData.value) + " in proposed spending, or " +  formatValue(elemData.value / BOZEMAN_POP) + " per resident.");
      }
      if (elemData.description){
        description.push(elemData.description);
      }

      this.setDescription(elemData['label-name'], description); 
    } 
    else {
      this.setDescription(this.currentPane.subhead, this.currentPane.description);
    }
  };

  // UTILITY FUNCTIONS
  var sum = function(items, prop){
    return items.reduce( function(a, b){
      return a + b[prop];
    }, 0);
  };