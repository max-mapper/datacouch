var stream = require('stream')
var events = require('events')
var csv = require('csv')
var util = require('util')
var app = new events.EventEmitter
app.dimensions = {}
var start

function render( template, target, data ) {
  if (! (target instanceof jQuery)) target = $( "." + target + ":first" );
  target.html( $.mustache( $( "." + template + "Template:first" ).html(), data || {} ) );
}

// doesnt work on sparse tabular data yet
function renderDataTable(rows) {
  var headers = _.keys(_.first(rows))
  
  rows = _.map(rows, function(row) {
    var cells = []
    headers.map(function(header) {
      var value = ""
      if (row[header]) {
        value = row[header]
        if (typeof(value) == "object") value = JSON.stringify(value)
      }
      var cell = {header: header, value: value}
      cells.push(cell)
    })
    return {id: "foo", cells: cells}
  })
  
  var headers = headers.map(function(header) {
    var header = {header: header}
    return header
  })
  
  render('dataTable', '#wrapper', {
    rows: rows,
    headers: headers
  })
  
  $('.column-header').click(handleColumnHeaderClick)
}

function getProfile(cb) {
  request('/me', function(err, resp, data) {
    if (err) return cb(err)
    return cb(false, JSON.parse(data))
  })
}

function handleColumnHeaderClick(e) {
  var key = $(e.currentTarget).find('.column-header-name').text()
  createDimensions(key)
  renderHistogram(key)
  renderBoxPlot(key)
}

function renderHistogram(key) {
  var group = app.dimensions[key].group
  var xmax = 0, ymax = 0
  var data = _.map(group.all(), function(g) {
    if (g.key > ymax) ymax = g.key
    if (g.value > xmax) xmax = g.value
    return {y: g.key, x: g.value}
  })
  
  $('#histogram').html("")

  var margin = {top: 10, right: 20, bottom: 20, left: 60},
      width = 960 - margin.left - margin.right,
      height = 450 - margin.top - margin.bottom;

  var svg = d3.select("#histogram").append("svg")
      .attr("width", width + margin.left + margin.right)
      .attr("height", height + margin.top + margin.bottom)
    .append("g")
      .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

  var x = d3.scale.linear()
      .range([0, width]);

  var y = d3.scale.linear()
      .range([height, 0]);

  // Set the scale domains.
  x.domain([0, xmax])
  y.domain([0, ymax])

  svg.selectAll(".bin")
      .data(data)
    .enter().append("line")
      .attr("class", "bin")
      .attr("x1", function(d) { return x(d.x); })
      .attr("x2", function(d) { return x(d.x); })
      .attr("y1", height)
      .attr("y2", function(d) { return y(d.y); });

  svg.append("g")
      .attr("class", "x axis")
      .attr("transform", "translate(0," + height + ")")
      .call(d3.svg.axis()
      .scale(x)
      .orient("bottom"));

  svg.append("g")
      .attr("class", "y axis")
      .call(d3.svg.axis()
      .scale(y)
      .orient("left"))
  
}

function createDimensions(key) {
  var xf = app.crossfilter
  var asc = xf.dimension(function (d) { return d[key] })
  var desc = xf.dimension(function (d) { return -1 * d[key] })
  var sorter = new BucketSort(desc.top(1)[0][key], asc.top(1)[0][key], 100)
  var buckets = xf.dimension(function (d) {
    return sorter.getBucket(d[key])
  })
  var group = buckets.group()
  app.dimensions[key] = {
    asc: asc,
    desc: desc,
    buckets: buckets,
    group: group
  }
}

function filterRange(key, low, high) {
  app.dimensions[key].buckets.filterRange([low, high])
  renderHistogram(key)
}

function BucketSort(min, max, size) {
  var me = this
  var step = (max - min) / size
  me.buckets = []
  _.times(size, function() {
    me.buckets.push(min)
    min += step
  })
}

BucketSort.prototype.getBucket = function(value) {
  var idx = _.sortedIndex(this.buckets, value)
  return this.buckets[idx]
}

function handleCSVUpload() {
  start = new Date()
  var fstream = new FileStream( $('#file')[0].files[0] )
  var fsstream = new FSStream()
  fstream.pipe(fsstream)
  parseCSV(fsstream)
}

function FSStream() {
  var me = this;
  stream.Stream.call(me);
  me.writable = true;
  me.readable = true;
  this.loaded = 0
}

util.inherits(FSStream, stream.Stream);

FSStream.prototype.write = function(data) {
  if (data.loaded === this.loaded) return true
  this.emit('data', data.target.result.slice(this.loaded))
  this.loaded = data.loaded
  if (data.loaded === data.total) this.end()
  return true
};

FSStream.prototype.end = function(){
  this.emit('end')
  return true
};

function parseCSV(fileStream) {
  var headers, rows = []
  c = csv()
    c
    .fromStream(fileStream)
    .on('data',function(data, index) {
      if (!headers) {
        headers = data;
        return;
      }
      var row = {}
      _(_.zip(headers, data)).each(function(tuple) {
        row[_.first(tuple)] = _.last(tuple)
      })
      rows.push(row)
    })
    .on('end', function(count) {
      app.emit('csv', rows)
    })
    .on('error',function(error){
      console.error("csv error!", error.message);
    })
}

function updateDocs(func) {
  app.rows = _.map(app.rows, func)
  renderDataTable(app.rows.slice(0, 9))
  app.crossfilter = crossfilter(app.rows)
}

function renderBoxPlot(key) {
  $('#boxplot').html("")
  
  var margin = {top: 10, right: 50, bottom: 20, left: 50},
      width = 120 - margin.left - margin.right,
      height = 500 - margin.top - margin.bottom;

  var min = Infinity,
      max = -Infinity;

  var chart = boxChart()
      .whiskers(iqr(1.5))
      .width(width)
      .height(height);
      
  var lower = app.dimensions[key].desc.top(1)[0][key]
  var upper = app.dimensions[key].asc.top(1)[0][key]

  chart.domain([lower, upper]);
  var data = app.dimensions[key].buckets.top(Infinity).map(function(r) { return r[key] })
  console.log(data)
  
  var vis = d3.select("#boxplot").selectAll("svg")
      .data([data])
    .enter().append("svg")
      .attr("class", "box")
      .attr("width", width + margin.left + margin.right)
      .attr("height", height + margin.bottom + margin.top)
    .append("g")
      .attr("transform", "translate(" + margin.left + "," + margin.top + ")")
      .call(chart);
}


// 
// chart.duration(1000);
// window.transition = function() {
//   vis.datum().chart();
// };

// Returns a function to compute the interquartile range.
function iqr(k) {
  return function(d, i) {
    var q1 = d.quartiles[0],
        q3 = d.quartiles[2],
        iqr = (q3 - q1) * k,
        i = -1,
        j = d.length;
    while (d[++i] < q1 - iqr);
    while (d[--j] > q3 + iqr);
    return [i, j];
  };
}

// Inspired by http://informationandvisualization.de/blog/box-plot
function boxChart() {
  var width = 1,
      height = 1,
      duration = 0,
      domain = null,
      value = Number,
      whiskers = boxWhiskers,
      quartiles = boxQuartiles,
      tickFormat = null;

  // For each small multiple…
  function box(g) {
    g.each(function(d, i) {
      d = d.map(value).sort(d3.ascending);
      var g = d3.select(this),
          n = d.length,
          min = d[0],
          max = d[n - 1];

      // Compute quartiles. Must return exactly 3 elements.
      var quartileData = d.quartiles = quartiles(d);

      // Compute whiskers. Must return exactly 2 elements, or null.
      var whiskerIndices = whiskers && whiskers.call(this, d, i),
          whiskerData = whiskerIndices && whiskerIndices.map(function(i) { return d[i]; });

      // Compute outliers. If no whiskers are specified, all data are "outliers".
      // We compute the outliers as indices, so that we can join across transitions!
      var outlierIndices = whiskerIndices
          ? d3.range(0, whiskerIndices[0]).concat(d3.range(whiskerIndices[1] + 1, n))
          : d3.range(n);

      // Compute the new x-scale.
      var x1 = d3.scale.linear()
          .domain(domain && domain.call(this, d, i) || [min, max])
          .range([height, 0]);

      // Retrieve the old x-scale, if this is an update.
      var x0 = this.__chart__ || d3.scale.linear()
          .domain([0, Infinity])
          .range(x1.range());

      // Stash the new scale.
      this.__chart__ = x1;

      // Note: the box, median, and box tick elements are fixed in number,
      // so we only have to handle enter and update. In contrast, the outliers
      // and other elements are variable, so we need to exit them! Variable
      // elements also fade in and out.

      // Update center line: the vertical line spanning the whiskers.
      var center = g.selectAll("line.center")
          .data(whiskerData ? [whiskerData] : []);

      center.enter().insert("svg:line", "rect")
          .attr("class", "center")
          .attr("x1", width / 2)
          .attr("y1", function(d) { return x0(d[0]); })
          .attr("x2", width / 2)
          .attr("y2", function(d) { return x0(d[1]); })
          .style("opacity", 1e-6)
        .transition()
          .duration(duration)
          .style("opacity", 1)
          .attr("y1", function(d) { return x1(d[0]); })
          .attr("y2", function(d) { return x1(d[1]); });

      center.transition()
          .duration(duration)
          .style("opacity", 1)
          .attr("y1", function(d) { return x1(d[0]); })
          .attr("y2", function(d) { return x1(d[1]); });

      center.exit().transition()
          .duration(duration)
          .style("opacity", 1e-6)
          .attr("y1", function(d) { return x1(d[0]); })
          .attr("y2", function(d) { return x1(d[1]); })
          .remove();

      // Update innerquartile box.
      var box = g.selectAll("rect.box")
          .data([quartileData]);

      box.enter().append("svg:rect")
          .attr("class", "box")
          .attr("x", 0)
          .attr("y", function(d) { return x0(d[2]); })
          .attr("width", width)
          .attr("height", function(d) { return x0(d[0]) - x0(d[2]); })
        .transition()
          .duration(duration)
          .attr("y", function(d) { return x1(d[2]); })
          .attr("height", function(d) { return x1(d[0]) - x1(d[2]); });

      box.transition()
          .duration(duration)
          .attr("y", function(d) { return x1(d[2]); })
          .attr("height", function(d) { return x1(d[0]) - x1(d[2]); });

      // Update median line.
      var medianLine = g.selectAll("line.median")
          .data([quartileData[1]]);

      medianLine.enter().append("svg:line")
          .attr("class", "median")
          .attr("x1", 0)
          .attr("y1", x0)
          .attr("x2", width)
          .attr("y2", x0)
        .transition()
          .duration(duration)
          .attr("y1", x1)
          .attr("y2", x1);

      medianLine.transition()
          .duration(duration)
          .attr("y1", x1)
          .attr("y2", x1);

      // Update whiskers.
      var whisker = g.selectAll("line.whisker")
          .data(whiskerData || []);

      whisker.enter().insert("svg:line", "circle, text")
          .attr("class", "whisker")
          .attr("x1", 0)
          .attr("y1", x0)
          .attr("x2", width)
          .attr("y2", x0)
          .style("opacity", 1e-6)
        .transition()
          .duration(duration)
          .attr("y1", x1)
          .attr("y2", x1)
          .style("opacity", 1);

      whisker.transition()
          .duration(duration)
          .attr("y1", x1)
          .attr("y2", x1)
          .style("opacity", 1);

      whisker.exit().transition()
          .duration(duration)
          .attr("y1", x1)
          .attr("y2", x1)
          .style("opacity", 1e-6)
          .remove();

      // Update outliers.
      var outlier = g.selectAll("circle.outlier")
          .data(outlierIndices, Number);

      outlier.enter().insert("svg:circle", "text")
          .attr("class", "outlier")
          .attr("r", 5)
          .attr("cx", width / 2)
          .attr("cy", function(i) { return x0(d[i]); })
          .style("opacity", 1e-6)
        .transition()
          .duration(duration)
          .attr("cy", function(i) { return x1(d[i]); })
          .style("opacity", 1);

      outlier.transition()
          .duration(duration)
          .attr("cy", function(i) { return x1(d[i]); })
          .style("opacity", 1);

      outlier.exit().transition()
          .duration(duration)
          .attr("cy", function(i) { return x1(d[i]); })
          .style("opacity", 1e-6)
          .remove();

      // Compute the tick format.
      var format = tickFormat || x1.tickFormat(8);

      // Update box ticks.
      var boxTick = g.selectAll("text.box")
          .data(quartileData);

      boxTick.enter().append("svg:text")
          .attr("class", "box")
          .attr("dy", ".3em")
          .attr("dx", function(d, i) { return i & 1 ? 6 : -6 })
          .attr("x", function(d, i) { return i & 1 ? width : 0 })
          .attr("y", x0)
          .attr("text-anchor", function(d, i) { return i & 1 ? "start" : "end"; })
          .text(format)
        .transition()
          .duration(duration)
          .attr("y", x1);

      boxTick.transition()
          .duration(duration)
          .text(format)
          .attr("y", x1);

      // Update whisker ticks. These are handled separately from the box
      // ticks because they may or may not exist, and we want don't want
      // to join box ticks pre-transition with whisker ticks post-.
      var whiskerTick = g.selectAll("text.whisker")
          .data(whiskerData || []);

      whiskerTick.enter().append("svg:text")
          .attr("class", "whisker")
          .attr("dy", ".3em")
          .attr("dx", 6)
          .attr("x", width)
          .attr("y", x0)
          .text(format)
          .style("opacity", 1e-6)
        .transition()
          .duration(duration)
          .attr("y", x1)
          .style("opacity", 1);

      whiskerTick.transition()
          .duration(duration)
          .text(format)
          .attr("y", x1)
          .style("opacity", 1);

      whiskerTick.exit().transition()
          .duration(duration)
          .attr("y", x1)
          .style("opacity", 1e-6)
          .remove();
    });
    d3.timer.flush();
  }

  box.width = function(x) {
    if (!arguments.length) return width;
    width = x;
    return box;
  };

  box.height = function(x) {
    if (!arguments.length) return height;
    height = x;
    return box;
  };

  box.tickFormat = function(x) {
    if (!arguments.length) return tickFormat;
    tickFormat = x;
    return box;
  };

  box.duration = function(x) {
    if (!arguments.length) return duration;
    duration = x;
    return box;
  };

  box.domain = function(x) {
    if (!arguments.length) return domain;
    domain = x == null ? x : d3.functor(x);
    return box;
  };

  box.value = function(x) {
    if (!arguments.length) return value;
    value = x;
    return box;
  };

  box.whiskers = function(x) {
    if (!arguments.length) return whiskers;
    whiskers = x;
    return box;
  };

  box.quartiles = function(x) {
    if (!arguments.length) return quartiles;
    quartiles = x;
    return box;
  };

  return box;
};

function boxWhiskers(d) {
  return [0, d.length - 1];
}

function boxQuartiles(d) {
  return [
    d3.quantile(d, .25),
    d3.quantile(d, .5),
    d3.quantile(d, .75)
  ];
}

$(function() {
  app.on('csv', function(rows) {
    app.rows = rows
    renderDataTable(rows.slice(0, 9))
    app.crossfilter = crossfilter(rows)
  })
  
  getProfile(function(err, profile) {
    if (err) profile = {}
    render('nav', '#navigation', profile)
    render('uploadForm', '#wrapper')
    $('#upload').click(handleCSVUpload)
  })
  
  $('textarea').val("function(doc) {\n  \n  return doc;\n}");  
  
  $('.transformButton').click(function(e) {
    e.preventDefault()
    eval("var func = " + $('textarea').val())
    updateDocs(func)
    return false
  })
})
