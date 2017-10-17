'use strict';
const MonetizationProvider = require('./monetization-provider');

function Fyber () {
    MonetizationProvider.apply(this, arguments);
}

Fyber.prototype = Object.create(MonetizationProvider.prototype);
Fyber.prototype.constructor = Fyber;

Fyber.prototype.getByDates = function(fromDate, toDate) {
    console.log('Fyber get by dates');
}

module.exports = Fyber;