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
  app.dimensions[key].filterRange([0,1000000])
  var group = app.dimensions[key + " group"]
  var xmax = 0, ymax = 0
  var data = _.map(group.all(), function(g) {
    if (g.key > ymax) ymax = g.key
    if (g.value > xmax) xmax = g.value
    return {y: g.key, x: g.value}
  })
  
  $('#chart').html("")

  var margin = {top: 10, right: 20, bottom: 20, left: 60},
      width = 960 - margin.left - margin.right,
      height = 450 - margin.top - margin.bottom;

  var svg = d3.select("#chart").append("svg")
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
  app.dimensions[key] = app.crossfilter.dimension(function (d) { return +(d[key]) })
  app.dimensions[key + " group"] = app.dimensions[key].group(Math.floor)
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
