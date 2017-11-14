'use strict';
const MonetizationProvider = require('./monetization-provider');

function Fyber () {
    MonetizationProvider.apply(this, arguments);
}

Fyber.prototype = Object.create(MonetizationProvider.prototype);
Fyber.prototype.constructor = Fyber;

Fyber.prototype.getUsersConfirmedActionsByDates = function(fromDate, toDate) {
    console.log('Fyber get by dates');
    return new Promise((resolve, reject) => {
        resolve([]);
    });
}

Fyber.prototype.getAvailableOffers = function () {
    //throw new Error("Not implemented");
    return new Promise((resolve, reject) => {
        resolve([]);
    });
}

module.exports = Fyber;