'use strict';
const MonetizationProvider = require('./monetization-provider');

function DailyBonus () {
    MonetizationProvider.apply(this, arguments);
}

DailyBonus.prototype = Object.create(MonetizationProvider.prototype);
DailyBonus.prototype.constructor = DailyBonus;

DailyBonus.prototype.getUsersConfirmedActionsByDates = function(fromDate, toDate) {
    console.log('DailyBonus get by dates');
    return new Promise((resolve, reject) => {
        resolve([]);
    });
}

DailyBonus.prototype.getAvailableOffers = function () {
    throw new Error("Not implemented");
}

module.exports = DailyBonus;