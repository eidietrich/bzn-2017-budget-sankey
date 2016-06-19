/* 
Packaged sankey chart 



TODO:
- Clean up reliance on BOZEMAN_POP global var
- Add sample initialization
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

    // EVENT LISTENERS
    // redraw on window resize
    var that = this;
    d3.select(window).on('resize', function(){
      that.draw();
    });

    var setHighlights = function(pane){
          console.log(that.panes[pane].name);
          var selection = that.panes[pane].nodeSelector;
          var includeNodes = d3.selectAll(".node")
            .filter(function(d){
              // check whether each link object is in highlightLinks
              i = that.panes[pane].includeNodes.indexOf(d);
              return i === -1;
            });
          console.log(includeNodes);
          that.refreshHighlight(includeNodes);
          // TODO: change refreshHighlight so it can handle multiple node selections

        };
    // Pane xfer handling 
    d3.selectAll('#pane-toggle button')
      .on("click", function(){
        d3.selectAll('#pane-toggle button').classed('active', false);
        d3.select(this).classed('active', true);
        setHighlights(this.getAttribute('name')); // THIS NO LONGER WORKS :^(
      });
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

    // add in node titles
    if(this.drawMode === 'desktop') {
      this.node.append("text")
      .filter(function(d) { return d.col === 1 || d.col === 3;})
      .filter(function(d) { return d.value > 3000000; })
        .attr("x", -6)
        .attr("y", function(d) { return d.dy / 2; })
        .attr("dy", ".35em")
        .attr("text-anchor", "end")
        .attr("transform", null)
        .text(function(d) { return d['label-name']; })
        // .call(wrap)
      .filter(function(d) { return d.col > 1; })
        .attr("x", 6 + this.sankey.nodeWidth())
        .attr("text-anchor", "start");
    }
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
  SankeyChart.prototype.writeDescription = function(subhead,text){
    // Replace whatever's in description field with 'subhead' and 'text'

    this.descrElem = document.querySelector('#description');
    this.descrElem.innerHTML = '';
    this.descr = d3.select(this.descrElem);

    this.descr.append("h3")
      .text(subhead);
    this.descr.append("p")
      .text(text);

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
    var holdState = false;
    var that = this;

    var onHighlight = function(){
      if (holdState === false){
        highlightNode = d3.select(this).datum(); // datum call gets to node data as object
        that.refreshHighlight([highlightNode]);
      }
      //TODO: Update these to use datum, so I'm passing objects around between functions
      describeElement = d3.select(this); 
      that.refreshDescription(describeElement);
    };
    var offHighlight = function(){
      if (holdState === false){
        highlightNode = null;
        that.refreshHighlight(highlightNode);
      }
      describeElement = null;
      that.refreshDescription(describeElement);
    };
    var click = function(){
      if (holdState === true) {
        highlightNode = null;
        describeElement = null;
        holdState = false;
        that.refreshHighlight(highlightNode);
        that.refreshDescription(describeElement);
      } 
      else {
        highlightNode = d3.select(this).datum();
        describeElement = d3.select(this);
        holdState = true;
        that.refreshHighlight([highlightNode]);
        that.refreshDescription(describeElement);
      }
    };
    this.plot.selectAll(".node-rect")
      .on("mouseover", onHighlight)
      .on("mouseout", offHighlight)
      .on("click", click);  
  };
  SankeyChart.prototype.refreshHighlight = function(highlightNodes){
    // Takes null, or array of node objects
    // CASE: highlightSelection is null --> demask everything
    // CASE: highlightSelection is a single node --> mask everything else
    // CASE: highlightSelection is an array of nodes --> mask everything but them

    var getLinks = function(node){
      // Goes forward and backwards full length of diagram
      // Links that feed into/from node

      // Walk backward (I may have this mixed up)
      var sourceLinks = node.targetLinks;
      sourceLinks.forEach(function(d){
        d.source.targetLinks.forEach(function(d){
          sourceLinks.push(d);
        });
      });
      // Walk forward
      var targetLinks = node.sourceLinks;
      targetLinks.forEach(function(d){
        d.target.sourceLinks.forEach(function(d){
          targetLinks.push(d);
        });
      });

      return targetLinks.concat(sourceLinks);
    };

    if (highlightNodes !== null){
      highlightLinks = [];
      highlightNodes.forEach(function(node){
        highlightLinks = highlightLinks.concat(getLinks(node));
      });

      d3.selectAll('.link')
        .filter(function(link) {
          // check whether each link object is in highlightLinks
          i = highlightLinks.indexOf(link);
          return i === -1;
        })
        .classed("mask", true);
    } else {
      // If highlightSelection is null, turn off mask universally
      d3.selectAll('.link')
        .classed("mask", false);
    }
  };
  SankeyChart.prototype.refreshDescription = function(describeElement){
    // TODO: Set this so it intelligently applies millions labels
    var formatValue = function(amount){
      return '$' + d3.format(",.0f")(amount);
    };
    
    this.description = document.querySelector('#description');
    this.description.innerHTML = '';
    this.descr = d3.select(this.descrElem);
    var text;
    if (describeElement !== null){
      var elemData = describeElement.datum();
      if (elemData.col === 1){
        text = formatValue(elemData.value) + " in expected revenue, or " + formatValue(elemData.value / BOZEMAN_POP) + " per resident.";
      } else if (elemData.col === 2){
        var fundRevenue = sum(elemData.targetLinks, "value");
        var fundSpending = sum(elemData.sourceLinks, "value");
        text = formatValue(fundRevenue) + " in expected revenue, " +
          formatValue(fundSpending) + " in proposed spending.";
      } else if (elemData.col === 3){
        // Description for spending category
        text = formatValue(elemData.value) + " in proposed spending, or " +  formatValue(elemData.value / BOZEMAN_POP) + " per resident.";
      }
      this.writeDescription(elemData['label-name'], text); 
    } 
    else {
      this.descrElem.innerHTML = DEFAULT_DESCR;
    }
  };

  // UTILITY FUNCTIONS
  var sum = function(items, prop){
    return items.reduce( function(a, b){
      return a + b[prop];
    }, 0);
  };