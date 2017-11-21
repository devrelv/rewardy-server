'use strict';
var uuid = require('uuid');
const consts = require('./consts');
const requestIp = require('request-ip');
var url = require('url');
const logger = require('../logger');
const serializeError = require('serialize-error');
const lightMailSender = require('./core/light-mail-sender');
var path = require('path');
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
        
            if (process.env.DEVELOPMENT_MODE == '1') {
                // Add this line for debug:
                allowedIPs.push(clientIp);
            }
        
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

            db.addUserAction(innerTransactionId, partner, userId, offerCredits, date, {partnerTransactionId: partnerTransactionId, offerId: offerId, totalCredits: totalCredits}).then(()=> {
                rewardUserWithCredits(db, userId, offerCredits, partner).then(()=> {
                    resolve();
                }).catch(err => {
                    logger.log.error('postback_offerwall: rewardUserWithCredits error', {error: serializeError(err)});
                    reject(err);
                })
            }).catch(err => {
                logger.log.error('postback_superrewards: db.addUserAction error', {error: serializeError(err)});                
                reject(err);
            });
        } catch (err) {
            logger.log.error('postback_superrewards: error occured', {error: serializeError(err), request: req});
            reject(err);
        }
    });
}

function postback_offerwall(db, req, partnerName) {
    /* Query Params
        uid: the user id in rewardy's system
        cy: number of points to add to the user
        type=[TYPE]
        ref=[REF]
        sig: the security hash that proves that this postback comes from us.
    */
    return new Promise((resolve, reject) => {
        try {
            const allowedIPs = ['174.36.92.186', '174.36.92.187', '174.36.96.66', '174.37.14.28']; // allowed IPs as mentioned in http://www.offerwall.com/documentation
            const clientIp = requestIp.getClientIp(req); // TODO: Validate the clientIp is correct
            //var clientIp = req.headers['x-forwarded-for'] || req.connection.remoteAddress || req.socket.remoteAddress ||req.connection.socket.remoteAddress;
        
            if (process.env.DEVELOPMENT_MODE == '1') {
                // Add this line for debug:
                allowedIPs.push(clientIp);
            }
            
        
            // Validating request IP
            if (allowedIPs.indexOf(clientIp) == -1) {
                logger.log.error('postback_offerwall: request IP is not valid, ignoring request. clientIp: ' + clientIp + ' allowed IPs: ' + allowedIPs.join(','), {request: req});
                reject('request IP is not valid');
                return;
            }
        
            var userId = req.query.uid;
            var offerCredits = req.query.cy;
            var offerType = req.query.type;
            var offerRef = req.query.ref;

            var partner = consts.PARTNER_OFFERWALL;
            var date = new Date();
            var innerTransactionId = uuid.v1();

            // Validating key
            var key = req.query.sig
            if (key !== getSigForOfferWall(userId, offerCredits, offerType, offerRef, consts.OFFERWALL_SECRET_KEY)) {
                logger.log.error('postback_offerwall: Signature key is not valid, ignoring request. request key: ' + key, {request: req});
                reject('Signature key is not valid');
                return;
            }
        
            db.addUserAction(innerTransactionId, partner, userId, offerCredits, date, {type: offerType, ref: offerRef}).then(()=> {
                rewardUserWithCredits(db, userId, offerCredits, partner).then(()=> {
                    resolve();
                }).catch(err => {
                    logger.log.error('postback_offerwall: rewardUserWithCredits error', {error: serializeError(err)});
                    reject(err);
                })
            }).catch(err => {
                logger.log.error('postback_offerwall: db.addUserAction error', {error: serializeError(err)});                
                reject(err);
            });
        } catch (err) {
            logger.log.error('postback_offerwall: error occured', {error: serializeError(err), request: req});
            reject(err);
        }
    });
}

function getSigForOfferWall(userId, points, type, ref, secretKey) {
    return md5('' + userId + points + type + ref + secretKey);
}

function getSigForSR(tranId, offerCredits, userId, secretKey) {
    return md5(tranId + ':' + offerCredits + ':' + userId +  ':' + secretKey);
}

function rewardUserWithCredits(db, userId, offerCredits, partner) {
    return new Promise((resolve, reject) => {        
        db.increaseUserCredits(userId, offerCredits).then(()=> {
            checkAndGiveCreditsToReferFriend(db, userId).then(()=> {
                resolve();                        
            }).catch(err => {
                logger.log.error('rewardUserWithCredits: checkAndGiveCreditsToReferFriend error', {error: serializeError(err), userId: userId, partner: partner});                
                reject(err);
            });
            
        }).catch(err => {
            logger.log.error('rewardUserWithCredits: db.increaseUserCredits error', {error: serializeError(err), userId: userId, offerCredits: offerCredits, partner: partner});                
            reject(err);
        });
    });
}

function checkAndGiveCreditsToReferFriend(db, userId) {
    return new Promise((resolve, reject) => {        
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
                            if (goodFriend.proactive_address) {
                                let friendProactiveData = {referralPoints: consts.referral_bonus_points, friendName: actionUser.name};
                                sendProactiveMessage(goodFriend.proactive_address, consts.PROACTIVE_MESSAGES_REFERRAL_BONUS, friendProactiveData, goodFriend.userId);
                            }
                            // send email
                            if (goodFriend.email && goodFriend.email.length>0 && goodFriend.email.indexOf('@')>-1) {
                                var referralHtmlContent = fs.readFileSync(path.dirname(fs.realpathSync(__filename)) + '/../email_templates/referral-bonus.html', 'utf8');                        
                                referralHtmlContent = referralHtmlContent.replace('%REFERAL_BONUS_POINTS%', consts.referral_bonus_points);
                                referralHtmlContent = referralHtmlContent.replace('%FRIEND_NAME%', actionUser.name);
    
                                lightMailSender.sendCustomMail(goodFriend.email, 'Rewardy Friend Referral Bonus!', null, referralHtmlContent).then(()=>{
                                    resolve();
                                }).catch(err => {
                                    logger.log.error('checkAndGiveCreditsToReferal: lightMailSender.sendCustomMail error', {error: serializeError(err), goodFriend: goodFriend});                
                                    reject(err);
                                });
                            } else {
                                resolve();
                            }
                            

                        }).catch(err => {
                            logger.log.error('checkAndGiveCreditsToReferal:db.updateUserSourceAdditionInfo error', {error: serializeError(err), actionUser: actionUser});                
                            reject(err);
                        });                   
                    }).catch(err => {
                        logger.log.error('checkAndGiveCreditsToReferal: db.increaseUserCredits error', {error: serializeError(err), goodFriend: goodFriend});                
                        reject(err);
                    });
                });
            } else {
                resolve();
            }
            
        }).catch (err => {
            logger.log.error('checkAndGiveCreditsToReferal: getBotUserById error', {error: serializeError(err), userId: userId});        
            reject(err);
        });
    });
}

const https = require('https');
function sendProactiveMessage(proactive_address, messageId, messageData, userId) {
    let fullUrl = process.env.BOT_API_URL + 'proactive?message_address=' + encodeURIComponent(proactive_address) + '&message_id=' + messageId + '&message_data=' + encodeURIComponent(messageData) + '&user_id=' + userId;
    https.get(fullUrl);
}

module.exports = {
    updateAllCredits: updateAllCredits,
    insertOffersToDB: insertOffersToDB,
    postback_superrewards: postback_superrewards,
    postback_offerwall: postback_offerwall
};