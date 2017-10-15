var Promise = require('bluebird');

module.exports = {
	searchVouchers: function (destination, checkInDate, checkOutDate) {
		return new Promise(function (resolve) {

			// Filling the voucher results manually just for demo purposes. TODO: Use our server for this.
			var vouchers = [];
			for (var i = 1; i <= 5; i++) {
				vouchers.push({
					
					name: destination + ' Hotel ' + i,
					location: destination,
					rating: Math.ceil(Math.random() * 5),
					numberOfReviews: Math.floor(Math.random() * 5000) + 1,
					priceStarting: Math.floor(Math.random() * 450) + 80,
					image: 'https://placeholdit.imgix.net/~text?txtsize=35&txt=Hotel+' + i + '&w=500&h=260'
				});
			}

			// complete promise with a timer to simulate async response
			setTimeout(function () { resolve(vouchers); }, 1000);
		});
	}
};