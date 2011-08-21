'use strict';

module.exports = function (t, a, d) {
	var o = t(100)
	  , count = 0
	  , listener = function () {
			++count;
		};
	o.on('tick', listener);
	setTimeout(function () {
		a(count, 0, "Does not start automatically");
		o.start();
		setTimeout(function () {
			a(count, 0, "Keeps time #1");
			setTimeout(function () {
				a(count, 1, "Keeps time #2");
				setTimeout(function () {
					a(count, 2, "Keeps time #3");
					o.restart();
					setTimeout(function () {
						a(count, 2, "Restarts #1");
						setTimeout(function () {
							a(count, 3, "Restarts #2");
							o.stop();
							setTimeout(function () {
								a(count, 3, "Stops");

								count = 0;
								o = t(50, true);
								o.on('tick', listener);
								setTimeout(function () {
									a(count, 1, "Starts automatically");
									o.stop(); d();
								}, 80);
							}, 150);
						}, 100);
					}, 80);
				}, 100);
			}, 100);
		}, 50);
	}, 150);
};
