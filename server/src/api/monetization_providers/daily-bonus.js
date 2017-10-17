'use strict';
const MonetizationProvider = require('./monetization-provider');

function DailyBonus () {
    MonetizationProvider.apply(this, arguments);
}

DailyBonus.prototype = Object.create(MonetizationProvider.prototype);
DailyBonus.prototype.constructor = DailyBonus;

DailyBonus.prototype.getByDates = function(fromDate, toDate) {
    console.log('DailyBonus get by dates');
}

module.exports = DailyBonus;