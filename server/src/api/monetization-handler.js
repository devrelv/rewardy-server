'use strict';
//const clone = require('clone');
function updateAllCredits(db) {
    return new Promise((resolve, reject) => {
        // Get all the partners
        db.getAllMonetizationPartners();

        // For each partner get the actions in the last 24 hours

        // Update credits in users table and all the actions in the users_monetization tables

    });
}
module.exports = {
    updateAllCredits: updateAllCredits,
};