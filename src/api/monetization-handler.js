'use strict';
var uuid = require('uuid');
const consts = require('./consts');
const requestIp = require('request-ip');
var url = require('url');
const logger = require('../logger');
const serializeError = require('serialize-error');
const lightMailSender = require('./core/light-mail-sender');
var fs = require('fs');
var md5 = require('md5');

const Stub = require('./monetization_providers/stub');
const Fyber = require('./monetization_providers/fyber');
const DailyBonus = require('./monetization_providers/daily-bonus');



function updateAllCredits(db) {
    return new Promise((resolve, reject) => {
        try {
            // Get all the partners
            db.getAllMonetizationPartners().then(monetizationPartners => {
                logger.log.debug('in handler with: ', monetizationPartners);
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
                        logger.log.error('in updateAllCredits: Unknown provider', {monetizationPartner: monetizationPartners[i]});
                        continue;
                    } 
                    currentPartner.getUsersConfirmedActionsByDates('x','y').then(res => {
                        console.log('res: ', res);
                    });
                    
                }

                // Update credits in users table and all the actions in the users_monetization tables
            });
        } catch (err) {
            logger.log.error('updateAllCredits: error occured', {error: serializeError(err)});        
            reject(err);
        }
        
    });
}

function insertOffersToDB(db) {
    try {
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
                        logger.log.error('in updateAllCredits: Unknown provider', {monetizationPartner: monetizationPartners[i]});
                        console.log('unknown provider: ', monetizationPartners[i]);
                    continue;
                }

                // Getting the offers
                logger.log.debug('calling getOffers with ', {partnerName: currentPartner.name});
                currentPartner.getAvailableOffers().then(offers => {
                    for (let i=0; i<offers.length; i++) {
                        offers[i].partnerId = currentPartner.id;
                        offers[i].fetchDate = fetchDate;
                        offers[i].id = uuid.v1();
                    }
                    logger.log.debug('in getAvailableOffers for ' + currentPartner.name, {offers: offers});
                    // Save all offers to DB
                    db.saveOffers(offers);
                });
            }

            
            
        });
    } catch (err) {
        logger.log.error('insertOffersToDB: error occured', {error: serializeError(err)});        
    }
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
    return new Promise((resolve, reject) => {
        try {
            const allowedIPs = ['54.85.0.76', '54.84.205.80', '54.84.27.163']; // allowed IPs as mentioned in http://docs.superrewards.com/docs/notification-postbacks
            const clientIp = requestIp.getClientIp(req); // TODO: Validate the clientIp is correct
            //var clientIp = req.headers['x-forwarded-for'] || req.connection.remoteAddress || req.socket.remoteAddress ||req.connection.socket.remoteAddress;
        
            // Add this line for debug:
            allowedIPs.push(clientIp);
        
            // Validating request IP
            if (allowedIPs.indexOf(clientIp) == -1) {
                logger.log.error('postback_superrewards: request IP is not valid, ignoring request. clientIp: ' + clientIp + ' allowed IPs: ' + allowedIPs.join(','), {request: req});
                reject('request IP is not valid');
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

            // Validating key
            var key = req.query.sig
            if (key !== getSigForSR(partnerTransactionId, offerCredits, userId, consts.SUPER_REWARDS_SECRET_KEY)) {
                logger.log.error('postback_superrewards: Signature key is not valid, ignoring request. request key: ' + key, {request: req});
                reject('Signature key is not valid');
                return;
            }
        
            db.addUserAction(partnerTransactionId, userId, offerId, offerCredits, totalCredits, partner, date, innerTransactionId).then(()=> {
                db.increaseUserCredits(userId, offerCredits);
                checkAndGiveCreditsToReferFriend(db, userId);
                resolve();
            });
        } catch (err) {
            logger.log.error('postback_superrewards: error occured', {error: serializeError(err), request: req});
            reject(err);
        }
    });
}

function getSigForSR(tranId, offerCredits, userId, secretKey) {
    return md5(tranId + ':' + offerCredits + ':' + userId +  ':' + secretKey);
}

function checkAndGiveCreditsToReferFriend(db, userId) {
    // getting the user
    db.getBotUserById(userId).then(actionUser => {
        // check if the referal didn't received already bonus for this user
        if (actionUser.source && actionUser.source.type == consts.botUser_source_friendReferral && 
            (!actionUser.source.additional_data || !actionUser.source.additional_data.referralReceivedBonusDate)) {
            // get the user who referred this user
            db.getBotUserById(actionUser.source.id).then(goodFriend => {
                // give referral bonus
                db.increaseUserCredits(goodFriend.user_id, consts.referral_bonus_points, false).then(()=> {
                    //update the referred user that we gave the bonus
                    actionUser.source.additional_data = actionUser.source.additional_data || {};
                    actionUser.source.additional_data.referralReceivedBonusDate = new Date();
                    db.updateUserSourceAdditionInfo(actionUser.user_id, actionUser.source.additional_data).then(()=> {
                        // send email
                        var referralHtmlContent = fs.readFileSync('./email_templates/referral-bonus.html', 'utf8');                        
                        referralHtmlContent = referralHtmlContent.replace('%REFERAL_BONUS_POINTS%', consts.referral_bonus_points);
                        referralHtmlContent = referralHtmlContent.replace('%FRIEND_NAME%', actionUser.name);

                        lightMailSender.sendCustomMail(goodFriend.email, 'Rewardy Friend Referral Bonus!', null, referralHtmlContent);
                    }).catch(err => {
                        logger.log.error('checkAndGiveCreditsToReferal:db.updateUserSourceAdditionInfo error', {error: serializeError(err), goodFriend: goodFriend});                
                    });                   
                }).catch(err => {
                    logger.log.error('checkAndGiveCreditsToReferal: db.increaseUserCredits error', {error: serializeError(err), goodFriend: goodFriend});                
                });
            });
        }
        
    }).catch (err => {
        logger.log.error('checkAndGiveCreditsToReferal: getBotUserById error', {error: serializeError(err), userId: userId});        
    });

    // if referal exists and did not received the bonus for this user - give the bonus & send mail


}

module.exports = {
    updateAllCredits: updateAllCredits,
    insertOffersToDB: insertOffersToDB,
    postback_superrewards: postback_superrewards,
};