'use strict';

function MonetizationProvider() {
}

MonetizationProvider.prototype.getByDates = function (fromDate, toDate) {
    throw new Error("Abstract method!");    
}

module.exports = MonetizationProvider;
