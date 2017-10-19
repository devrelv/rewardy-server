'use strict';
var uuid = require('uuid');


const Stub = require('./monetization_providers/stub');
const Fyber = require('./monetization_providers/fyber');
const DailyBonus = require('./monetization_providers/daily-bonus');


function updateAllCredits(db) {
    return new Promise((resolve, reject) => {
        // Get all the partners
        db.getAllMonetizationPartners().then(monetizationPartners => {
            console.log('in handler with: ', monetizationPartners);
            // For each partner get the actions in the last 24 hours
            for (var i=0; i<monetizationPartners.length; i++) {
                var currentPartner;
                switch (monetizationPartners[i].name) {
                    case 'Fyber':
                        currentPartner = new Fyber();
                        break;
                    case 'Daily Bonus':
                        currentPartner = new DailyBonus();
                        break;
                    case 'Stub':
                        currentPartner = new Stub();
                        break;
                }
                currentPartner.name = monetizationPartners[i].name;
                currentPartner.id = monetizationPartners[i].id;

                if (!currentPartner) {
                    console.log('unknown provider: ', monetizationPartners[i]);
                    continue;
                } 
                currentPartner.getUsersConfirmedActionsByDates('x','y').then(res => {
                    console.log('res: ', res);
                });
                
            }

            // Update credits in users table and all the actions in the users_monetization tables
        });
    });
}

function insertOffersToDB(db) {
    // TODO: Finish implementation
    // Get monetization partners with offers
    db.getAllMonetizationPartnersWithOffers().then(monetizationPartners => {
        let fetchDate = new Date().toJSON().split('T')[0]; // YYYY-MM-DD
        
        // For each partner get the offers (use MonetizationProviders class)
        for (let i=0; i<monetizationPartners.length; i++) {
            let currentPartner;
            switch (monetizationPartners[i].name) {
                case 'Fyber':
                    currentPartner = new Fyber();
                    break;
                case 'Daily Bonus':
                    currentPartner = new DailyBonus();
                    break;
                case 'Stub':
                    currentPartner = new Stub();
                    break;
            }
            currentPartner.name = monetizationPartners[i].name;
            currentPartner.id = monetizationPartners[i].id;


            if (!currentPartner) {
                console.log('unknown provider: ', monetizationPartners[i]);
                continue;
            }

            // Getting the offers
            console.log('calling getOffers with ', currentPartner.name);
            currentPartner.getAvailableOffers().then(offers => {
                for (let i=0; i<offers.length; i++) {
                    offers[i].partnerId = currentPartner.id;
                    offers[i].fetchDate = fetchDate;
                    offers[i].id = uuid.v1();
                }
                console.log('getAvailableOffers for ' + currentPartner.name + ' :', offers);
                // Save all offers to DB
                db.saveOffers(offers);
            });
        }

        
        
    });


}
module.exports = {
    updateAllCredits: updateAllCredits,
    insertOffersToDB: insertOffersToDB,
};