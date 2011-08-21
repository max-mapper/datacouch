'use strict';

module.exports = function (t, a, d) {
	var x = 1;
	t(function () {
		x = 2;
	});
	a(x, 1, "Run in future");
	setTimeout(function () {
		a(x, 2, "Run on next event loop"); d();
	}, 0);
};
