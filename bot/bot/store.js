const Promise = require('bluebird');
const Voucher = require('./core/voucher');
const fs = require('fs');
const path = require('path');
var _ = require('lodash');

module.exports = {
	fetchVouchers: function () {
		return new Promise(function (resolve) {
			let vouchersJson = fs.readFileSync(path.join(__dirname, '../data') + '/vouchers.json', { encoding: 'utf8' });
			let loadedVouchers = JSON.parse(vouchersJson);

			let vouchers = _.forEach(loadedVouchers)
				.map(function (loadedVoucher) {
					return new Voucher(loadedVoucher.id, loadedVoucher.title, loadedVoucher.description, loadedVoucher.imageUrl, loadedVoucher.points, loadedVoucher.cta);
				});
			
			resolve(vouchers);
		});
	}
};