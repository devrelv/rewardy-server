'use strict';

function MonetizationProvider() {
}

MonetizationProvider.prototype.getUsersConfirmedActionsByDates = function (fromDate, toDate) {
    throw new Error("Abstract method!");    
}
MonetizationProvider.prototype.getAvailableOffers = function () {
    throw new Error("Abstract method!");        
}

module.exports = MonetizationProvider;
