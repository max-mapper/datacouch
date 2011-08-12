importScripts('underscore.js'); 

onmessage = function(message) {
  function parseCSVLine(line) {
  	line = line.split(',');

  	// check for splits performed inside quoted strings and correct if needed
  	for (var i = 0; i < line.length; i++) {
  		var chunk = line[i].replace(/^[\s]*|[\s]*$/g, "");
  		var quote = "";
  		if (chunk.charAt(0) == '"' || chunk.charAt(0) == "'") quote = chunk.charAt(0);
  		if (quote != "" && chunk.charAt(chunk.length - 1) == quote) quote = "";

  		if (quote != "") {
  			var j = i + 1;

  			if (j < line.length) chunk = line[j].replace(/^[\s]*|[\s]*$/g, "");

  			while (j < line.length && chunk.charAt(chunk.length - 1) != quote) {
  				line[i] += ',' + line[j];
  				line.splice(j, 1);
  				chunk = line[j].replace(/[\s]*$/g, "");
  			}

  			if (j < line.length) {
  				line[i] += ',' + line[j];
  				line.splice(j, 1);
  			}
  		}
  	}

  	for (var i = 0; i < line.length; i++) {
  		// remove leading/trailing whitespace
  		line[i] = line[i].replace(/^[\s]*|[\s]*$/g, "");

  		// remove leading/trailing quotes
  		if (line[i].charAt(0) == '"') line[i] = line[i].replace(/^"|"$/g, "");
  		else if (line[i].charAt(0) == "'") line[i] = line[i].replace(/^'|'$/g, "");
  	}

  	return line;
  }
  
  var rows = message.data.data.split('\n');
  var docs = [];
  var headers = parseCSVLine(_.first(rows));
  _.each(_.rest(rows), function(row, rowIDX) {
    row = parseCSVLine(row);    
    var doc = {};
    _.each(row, function(cell, idx) {      
      doc[headers[idx]] = cell;
    })
    docs.push(doc);
  })

  var req = new XMLHttpRequest();

  req.onprogress = req.upload.onprogress = function(e) {
    if(e.lengthComputable) postMessage(JSON.stringify({ percent: (e.loaded / e.total) * 100 }));
  };
  
  req.onreadystatechange = function() { if (req.readyState == 4) postMessage(JSON.stringify( {done: true} )) };
  req.open('POST', message.data.url);
  req.setRequestHeader('Content-Type', 'application/json');
  req.send(JSON.stringify({docs: docs}));
};
