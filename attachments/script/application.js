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

// d3 formatters
var formatNumber = d3.format(",d"),
    formatFloat = d3.format(",.2f"),
    formatDate = d3.time.format("%B %d, %Y"),
    formatTime = d3.time.format("%I:%M %p")

function handleColumnHeaderClick(e) {
  var key = $(e.currentTarget).find('.column-header-name').text()
  createDimensions(key)
  var charts = [createBarChart(key)]
  
  render('chart', '#chart', {key: key})
  
  var chartDOM = d3.select(".chart")
    .data(charts)
    .each(function(chart) { chart.on("brush", renderAll).on("brushend", renderAll); });
  
  function renderAll() {
    chartDOM.each(function(method) {
      d3.select(this).call(method)
    })
  }
  renderAll()
  
}

function createDimensions(key) {
  app.dimensions[key] = app.crossfilter.dimension(function (d) { return formatFloat(d[key]) })
  app.dimensions[key + " group"] = app.dimensions[key].group(Math.floor)
}

function createBarChart(key) {
  var max = formatFloat(app.dimensions[key].top(1)[0][key])
  return barChart()
      .dimension(app.dimensions[key])
      .group(app.dimensions[key + " group"])
    .x(d3.scale.linear()
      .domain([0, max + 50])
      .range([0, 1100]))
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

function barChart() {
  if (!barChart.id) barChart.id = 0;

  var margin = {top: 10, right: 10, bottom: 20, left: 10},
      x,
      y = d3.scale.linear().range([300, 0]),
      id = barChart.id++,
      axis = d3.svg.axis().orient("bottom"),
      brush = d3.svg.brush(),
      brushDirty,
      dimension,
      group,
      round;

  function chart(div) {
    var width = x.range()[1],
        height = y.range()[0];

    y.domain([0, group.top(1)[0].value]);

    div.each(function() {
      var div = d3.select(this),
          g = div.select("g");

      // Create the skeletal chart.
      if (g.empty()) {
        div.select(".title").append("a")
            .attr("href", "javascript:reset(" + id + ")")
            .attr("class", "reset")
            .text("reset")
            .style("display", "none");

        g = div.append("svg")
            .attr("width", width + margin.left + margin.right)
            .attr("height", height + margin.top + margin.bottom)
          .append("g")
            .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

        g.append("clipPath")
            .attr("id", "clip-" + id)
          .append("rect")
            .attr("width", width)
            .attr("height", height);

        g.selectAll(".bar")
            .data(["background", "foreground"])
          .enter().append("path")
            .attr("class", function(d) { return d + " bar"; })
            .datum(group.all());

        g.selectAll(".foreground.bar")
            .attr("clip-path", "url(#clip-" + id + ")");

        g.append("g")
            .attr("class", "axis")
            .attr("transform", "translate(0," + height + ")")
            .call(axis);

        // Initialize the brush component with pretty resize handles.
        var gBrush = g.append("g").attr("class", "brush").call(brush);
        gBrush.selectAll("rect").attr("height", height);
        gBrush.selectAll(".resize").append("path").attr("d", resizePath);
      }

      // Only redraw the brush if set externally.
      if (brushDirty) {
        brushDirty = false;
        g.selectAll(".brush").call(brush);
        div.select(".title a").style("display", brush.empty() ? "none" : null);
        if (brush.empty()) {
          g.selectAll("#clip-" + id + " rect")
              .attr("x", 0)
              .attr("width", width);
        } else {
          var extent = brush.extent();
          g.selectAll("#clip-" + id + " rect")
              .attr("x", x(extent[0]))
              .attr("width", x(extent[1]) - x(extent[0]));
        }
      }

      g.selectAll(".bar").attr("d", barPath);
    });

    function barPath(groups) {
      var path = [],
          i = -1,
          n = groups.length,
          d;
      while (++i < n) {
        d = groups[i];
        path.push("M", x(d.key), ",", height, "V", y(d.value), "h9V", height);
      }
      return path.join("");
    }

    function resizePath(d) {
      var e = +(d == "e"),
          x = e ? 1 : -1,
          y = height / 3;
      return "M" + (.5 * x) + "," + y
          + "A6,6 0 0 " + e + " " + (6.5 * x) + "," + (y + 6)
          + "V" + (2 * y - 6)
          + "A6,6 0 0 " + e + " " + (.5 * x) + "," + (2 * y)
          + "Z"
          + "M" + (2.5 * x) + "," + (y + 8)
          + "V" + (2 * y - 8)
          + "M" + (4.5 * x) + "," + (y + 8)
          + "V" + (2 * y - 8);
    }
  }

  brush.on("brushstart.chart", function() {
    var div = d3.select(this.parentNode.parentNode.parentNode);
    div.select(".title a").style("display", null);
  });

  brush.on("brush.chart", function() {
    var g = d3.select(this.parentNode),
        extent = brush.extent();
    if (round) g.select(".brush")
        .call(brush.extent(extent = extent.map(round)))
      .selectAll(".resize")
        .style("display", null);
    g.select("#clip-" + id + " rect")
        .attr("x", x(extent[0]))
        .attr("width", x(extent[1]) - x(extent[0]));
    dimension.filterRange(extent);
  });

  brush.on("brushend.chart", function() {
    if (brush.empty()) {
      var div = d3.select(this.parentNode.parentNode.parentNode);
      div.select(".title a").style("display", "none");
      div.select("#clip-" + id + " rect").attr("x", null).attr("width", "100%");
      dimension.filterAll();
    }
  });

  chart.margin = function(_) {
    if (!arguments.length) return margin;
    margin = _;
    return chart;
  };

  chart.x = function(_) {
    if (!arguments.length) return x;
    x = _;
    axis.scale(x);
    brush.x(x);
    return chart;
  };

  chart.y = function(_) {
    if (!arguments.length) return y;
    y = _;
    return chart;
  };

  chart.dimension = function(_) {
    if (!arguments.length) return dimension;
    dimension = _;
    return chart;
  };

  chart.filter = function(_) {
    if (_) {
      brush.extent(_);
      dimension.filterRange(_);
    } else {
      brush.clear();
      dimension.filterAll();
    }
    brushDirty = true;
    return chart;
  };

  chart.group = function(_) {
    if (!arguments.length) return group;
    group = _;
    return chart;
  };

  chart.round = function(_) {
    if (!arguments.length) return round;
    round = _;
    return chart;
  };

  return d3.rebind(chart, brush, "on");
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
})
