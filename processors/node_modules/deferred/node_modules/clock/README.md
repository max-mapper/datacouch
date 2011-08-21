# Clock - Indicate and co-ordinate JavaScript time events

Simple functions that helps to deal with time events.  
Can be used in Node.js and browser environments

## Installation

Node & npm:

	$ npm install clock

## Usage

Require what you need individually:

	var interval = require('clock/lib/interval')
	  , nextTick = require('clock/lib/next-tick')

	interval(...)
	nextTick(...)

or grab it all:

	var clock = require('clock');

	clock.inteval(...)
	clock.nextTick(...)

### Available tools

_Each extension is documented at begin of its source file._

* `interval`
* `nextTick`
