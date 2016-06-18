var SankeyChart = function(opts) {
    this.data = opts.data;
    this.element = opts.element;
    this.panes = opts.panes;

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
        setHighlights(this.getAttribute('name'));
      });


  };
  SankeyChart.prototype.draw = function(){
    
    this.width = this.element.offsetWidth;
    this.height = this.width;
    this.margin = {
        top: 25,
        right: 0,
        bottom: 10,
        left: 0
      };
    
    this.nodeWidth = 30;
    this.nodePadding = 2;

    // Decide whether to draw in mobile or desktop mode
    this.drawMode = this.checkSize();

    // Adjust for desktop display
    if (this.drawMode === 'desktop'){
      this.height = this.width * (2/3);
      this.margin.right = 100;
      this.margin.left = 100;
      this.nodeWidth = 15;

    }

    this.plotWidth = this.width - this.margin.left - this.margin.right;
    this.plotHeight = this.height - this.margin.top - this.margin.bottom;

    // append the svg canvas to the page
    this.element.innerHTML = '';
    this.svg = d3.select(this.element).append("svg")
      .attr("width", this.width)
      .attr("height", this.height)

    // Add labels across the chart top
    var labels = [
      {text: 'Revenues', position: 0, anchor: 'start'},
      {text: 'Fund', position: 0.5, anchor: 'middle'},
      {text: 'Spending', position: 1, anchor: 'end' }
    ];
    var that = this;
    this.label = this.svg.append('g')
      .selectAll('text')
      .data(labels).enter()
      .append('text')
        .text(function(d){ return d.text; })
        .attr("class","label")
        .attr("x", function(d){ return d.position * that.width; })
        .attr("y", 15)
        .attr("text-anchor", function(d){ return d.anchor; });
      
    
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

    // add the rectangles for the nodes
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

    // add in the title for the nodes
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

    this.addListeners();
    
  };
  SankeyChart.prototype.checkSize = function(){
      return this.width > MOBILE_BREAK ? 'desktop' : 'mobile';
  };
  SankeyChart.prototype.addListeners = function(){
    /*
    Interaction logic: 
    Hover on/off select works by default
    Click on node turns on hold state, selects node
    Click on any node turns off hold state, deselects
    Hover changes description but not highlight during hold state
    */

    var highlightElement = null;
    var describeElement = null;
    var holdState = false;
    var that = this;

    var onHighlight = function(){
      if (holdState === false){
        highlightElement = d3.select(this);
        that.refreshHighlight(highlightElement);
      }
      describeElement = d3.select(this);
      that.refreshDescription(describeElement);
    };
    var offHighlight = function(){
      if (holdState === false){
        highlightElement = null;
        that.refreshHighlight(highlightElement);
      }
      describeElement = null;
      that.refreshDescription(describeElement);
    };
    var click = function(){
      if (holdState === true) {
        highlightElement = null;
        describeElement = null;
        holdState = false;
        that.refreshHighlight(highlightElement);
        that.refreshDescription(describeElement);
      } 
      else {
        highlightElement = d3.select(this);
        describeElement = d3.select(this);
        holdState = true;
        that.refreshHighlight(highlightElement);
        that.refreshDescription(describeElement);
      }
    };
    this.plot.selectAll(".node-rect")
      .on("mouseover", onHighlight)
      .on("mouseout", offHighlight)
      .on("click", click);  
  };
  SankeyChart.prototype.refreshHighlight = function(highlightElement){
    // if highlightElement = null, turn everything back
    // else mask everything except highlight node links
    if (highlightElement !== null){
      var sourceLinks = highlightElement.datum().targetLinks;
      var targetLinks = highlightElement.datum().sourceLinks;
      // add links one node removed 
      sourceLinks.forEach(function(d){
        d.source.targetLinks.forEach(function(d){
          sourceLinks.push(d);
        });
      });
      targetLinks.forEach(function(d){
        d.target.sourceLinks.forEach(function(d){
          targetLinks.push(d);
        });
      });

      var highlightLinks = targetLinks.concat(sourceLinks);
      
      d3.selectAll('.link')
        .filter(function(link) {
          // check whether each link object is in highlightLinks
          i = highlightLinks.indexOf(link);
          return i === -1;
        })
        .classed("mask", true);
      // console.log(highlightElement.datum().targetLinks);
    }
    else {
      d3.selectAll('.link')
        .classed("mask", false);
    }
  };

  SankeyChart.prototype.refreshDescription = function(describeElement){
    var formatValue = function(d){
      return '$' + d3.format(",.0f")(d);
    };
    
    this.descrElem = document.querySelector('#description');
    this.descrElem.innerHTML = '';
    this.descr = d3.select(this.descrElem);
    var text;

    if (describeElement !== null){
      var elemData = describeElement.datum();
      this.descr.append("h3")
        .text(elemData['label-name']);
      if (elemData.col === 1){
        // Description for funding source
        text = formatValue(elemData.value) + " in expected revenue, or " + formatValue(elemData.value / BOZEMAN_POP) + " per resident.";
        this.descr.append("p")
          .text(text);

      } else if (elemData.col === 2){
        // Description for fund
        var fundRevenue = sum(elemData.targetLinks, "value");
        var fundSpending = sum(elemData.sourceLinks, "value");
        this.descr.append("p")
          .text(formatValue(fundRevenue) + " in expected revenue");
        this.descr.append("p")
          .text(formatValue(fundSpending) + " in proposed spending.");

      } else if (elemData.col === 3){
        // Description for spending category
        text = formatValue(elemData.value) + " in proposed spending, or " +  formatValue(elemData.value / BOZEMAN_POP) + " per resident.";
        this.descr.append("p")
          .text(text);
      } else {
        this.descr.append("p")
          .text("This is an error.");
      } 

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