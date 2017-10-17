'use strict';
const Fyber = require('./monetization_providers/fyber');
const DailyBonus = require('./monetization_providers/daily-bonus');


function updateAllCredits(db) {
    return new Promise((resolve, reject) => {
        // Get all the partners
        db.getAllMonetizationPartners().then(monetizationPartners => {
            console.log('in handler with: ', monetizationPartners);
            // For each partner get the actions in the last 24 hours
            for (var i=0; i<monetizationPartners.length; i++) {
                var currentPartner = null;
                switch (monetizationPartners[i].name) {
                    case 'Fyber':
                        currentPartner = new Fyber();
                        break;
                    case 'Daily Bonus':
                        currentPartner = new DailyBonus();
                        break;
                }

                if (!currentPartner) {
                    console.log('unknown provider: ', monetizationPartners[i]);
                    continue;
                } 
                currentPartner.getByDates('x','y');
            }

            // Update credits in users table and all the actions in the users_monetization tables
        });
    });
}
module.exports = {
    updateAllCredits: updateAllCredits,
};