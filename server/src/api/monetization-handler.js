'use strict';
var uuid = require('uuid');
const consts = require('./consts');
const requestIp = require('request-ip');
var url = require('url');

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
                    case consts.PARTNER_FYBER:
                        currentPartner = new Fyber();
                        break;
                    case consts.PARTNER_DAILY_BONUS:
                        currentPartner = new DailyBonus();
                        break;
                    case consts.PARTNER_STUB:
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
                case consts.PARTNER_FYBER:
                    currentPartner = new Fyber();
                    break;
                case consts.PARTNER_DAILY_BONUS:
                    currentPartner = new DailyBonus();
                    break;
                case consts.PARTNER_STUB:
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

function postback_superrewards(db, req, partnerName) {
    /* Query Params
        id: the ID of this transaction, unique to this user event.
        uid: the ID of the user, that you passed us at the beginning of their session.
        oid: the numeric ID of the offer or payment method that they used.
        new: total number of new in-game currency that the user has earned by completing this event. This amount is calculated based on the VC Ratio that you set for this app.
        total: total number of in-game currency that this user has earned on this app.
        sig: the security hash that proves that this postback comes from us.
    */

    const allowedIPs = ['54.85.0.76', '54.84.205.80', '54.84.27.163']; // allowed IPs as mentioned in http://docs.superrewards.com/docs/notification-postbacks
    const clientIp = requestIp.getClientIp(req); // TODO: Validate the clientIp is correct
    //var clientIp = req.headers['x-forwarded-for'] || req.connection.remoteAddress || req.socket.remoteAddress ||req.connection.socket.remoteAddress;

    // Add this line for debug:
    // allowedIPs.push(clientIp);

    // Validating request IP
    if (allowedIPs.indexOf(clientIp) == -1) {
        return;
    }

    // Validating key
    var key = req.query.sig
    if (key !== consts.SUPER_REWARDS_SECRET_KEY) {
        return;
    }

   
    var partnerTransactionId = req.query.id;
    var userId = req.query.uid
    var offerId = req.query.oid
    var offerCredits = req.query.new
    var totalCredits = req.query.total
    
    var partner = consts.PARTNER_SUPER_REWARDS;
    var date = new Date();
    var innerTransactionId = uuid.v1();

    db.addUserAction(partnerTransactionId, userId, offerId, offerCredits, totalCredits, partner, date, innerTransactionId).then(k=> {
        db.increaseUserCredits(userId, offerCredits);
    });

}



module.exports = {
    updateAllCredits: updateAllCredits,
    insertOffersToDB: insertOffersToDB,
    postback_superrewards: postback_superrewards,
};