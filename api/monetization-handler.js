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
const dal = require('../dal');
const rp = require('request-promise');

const Stub = require('./monetization_providers/stub');
const Fyber = require('./monetization_providers/fyber');
const DailyBonus = require('./monetization_providers/daily-bonus');
const Offer = require('./core/models/offer');


function updateAllCredits(db) {
    return new Promise((resolve, reject) => {
        try {
            // Get all the partners
            dal.getAllMonetizationPartners().then(monetizationPartners => {
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
        dal.getAllMonetizationPartnersWithOffers().then(monetizationPartners => {
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
                    dal.saveOffers(offers);
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

            dal.addUserAction(innerTransactionId, partner, userId, offerCredits, date, {partnerTransactionId: partnerTransactionId, offerId: offerId, totalCredits: totalCredits}).then(()=> {
                rewardUserWithCredits(db, userId, offerCredits, partner).then(()=> {
                    resolve();
                }).catch(err => {
                    logger.log.error('postback_superrewards: rewardUserWithCredits error', {error: serializeError(err)});
                    reject(err);
                })
            }).catch(err => {
                logger.log.error('postback_superrewards: dal.addUserAction error', {error: serializeError(err)});                
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
        currency: number of points to add to the user
        type: type of postback (0 - Regular payment/offer completion ; 1 - Product/Virtual Currency is given by customer service ; 2 - Chargeback by customer service)
        ref: Transaction reference ID, alphanumeric (max length: 11)
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
            var offerCredits = req.query.currency;
            var offerType = req.query.type;
            var offerRef = req.query.ref;

            var partner = consts.PARTNER_OFFERWALL;
            var date = new Date();
            var innerTransactionId = uuid.v1();

            // Validating key
            var key = req.query.sig
            if (key !== getSigForOfferWall_v2(req.query, consts.OFFERWALL_SECRET_KEY)) {
                logger.log.error('postback_offerwall: Signature key is not valid, ignoring request. request key: ' + key, {request: req});
                reject('Signature key is not valid');
                return;
            }
        
            dal.addUserAction(innerTransactionId, partner, userId, offerCredits, date, {type: offerType, ref: offerRef}).then(()=> {
                if (offerType == 2) {
                    // Oh no.... Chargeback
                    let chargebackHTML = 'We received a chargeback of ' + offerCredits + ' points for user ' + userId + '!<br/><br/>All Details(as saved to UserAction collection):<br/>';
                    chargebackHTML += JSON.stringify({id: innerTransactionId, partner: partner, userId: userId, offerCredits: offerCredits, date: date, extended_data: {type: offerType, ref: offerRef}});
                    lightMailSender.sendCustomMail('yaari.tal@gmail.com', 'Offerwall ' + offerCredits +' Points Chargeback For User ' + userId, null, chargebackHTML).then(()=>{
                        resolve();
                    }).catch(err => {
                        logger.log.error('checkAndGiveCreditsToReferal: lightMailSender.sendCustomMail error', {error: serializeError(err), goodFriend: goodFriend});                
                        resolve();
                    });

                } else {
                    rewardUserWithCredits(db, userId, offerCredits, partner).then(()=> {
                        resolve();
                    }).catch(err => {
                        logger.log.error('postback_offerwall: rewardUserWithCredits error', {error: serializeError(err)});
                        reject(err);
                    })
                }
                
            }).catch(err => {
                logger.log.error('postback_offerwall: dal.addUserAction error', {error: serializeError(err)});                
                reject(err);
            });
        } catch (err) {
            logger.log.error('postback_offerwall: error occured', {error: serializeError(err), request: req});
            reject(err);
        }
    });
}

// generating sig for offerwall with pingback version 2
function getSigForOfferWall_v2(query, secretKey) {
    let queryString = '';
    let keys = [];
    for (let key in query) {
        if (query.hasOwnProperty(key) && key != 'sig') {
            keys.push(key);
        }
    }
    keys.sort();
    for (let i=0; i<keys.length; i++) {
        queryString += keys[i] + '=' + query[keys[i]];
    }

    let calculatedSig = md5(queryString+secretKey);
    return calculatedSig;
}

// generating sig for offerwall with pingback version 1 (deprecated)
function getSigForOfferWall_v1(userId, points, type, ref, secretKey) {
    // uid=1currency=2type=0ref=33b5949e0c26b87767a4752a276de9570
    return md5('uid=' + userId + 'currency=' + points + 'type=' + type + 'ref=' + ref + secretKey);
}

function getSigForSR(tranId, offerCredits, userId, secretKey) {
    return md5(tranId + ':' + offerCredits + ':' + userId +  ':' + secretKey);
}

function rewardUserWithCredits(db, userId, offerCredits, partner) {
    return new Promise((resolve, reject) => {
        dal.increaseUserCredits(userId, offerCredits).then(()=> {
            Promise.all([checkAndGiveCreditsToReferFriend(db, userId).catch(e=>e), notifyRewardedUser(db, userId, offerCredits).catch(e=>e)]).then((first, second)=>{
                resolve(); // user already received the points, we don't want to reject it
            }).catch(err=>{
                logger.log.error('rewardUserWithCredits: Promise.any error', {error: serializeError(err), userId: userId, offerCredits: offerCredits, partner: partner});                
                resolve(); // user already received the points, we don't want to reject it
            });
        }).catch(err => {
            logger.log.error('rewardUserWithCredits: dal.increaseUserCredits error', {error: serializeError(err), userId: userId, offerCredits: offerCredits, partner: partner});                
            reject(err);
        });
    });
}

function notifyRewardedUser(db, userId, points) {
    return new Promise((resolve, reject) => {
        dal.getBotUserById(userId).then(botUser => {
                let proactiveData = {points: points};
                sendProactiveMessage(botUser.proactive_address, consts.PROACTIVE_MESSAGES_OFFER_COMPLETED, proactiveData, botUser.userId).then(()=>{
                    resolve();
                }).catch(err => {
                    logger.log.error('notifyRewardedUser: sendProactiveMessage error', {error: serializeError(err), userId: userId});                
                    reject(err);
                })
        }).catch(err =>{
            logger.log.error('notifyRewardedUser: dal.getBotUserById error', {error: serializeError(err), userId: userId});                
            reject(err);
        })
    });
}

function checkAndGiveCreditsToReferFriend(db, userId) {
    return new Promise((resolve, reject) => {        
        // getting the user
        dal.getBotUserById(userId).then(actionUser => {
            // check if the referal didn't received already bonus for this user
            if (actionUser.source && actionUser.source.type == consts.botUser_source_friendReferral && 
                (!actionUser.source.additional_data || !actionUser.source.additional_data.referralReceivedBonusDate)) {
                // get the user who referred this user
                dal.getBotUserById(actionUser.source.id).then(goodFriend => {
                    // give referral bonus
                    dal.increaseUserCredits(goodFriend.user_id, consts.referral_bonus_points, false).then(()=> {
                        //update the referred user that we gave the bonus
                        actionUser.source.additional_data = actionUser.source.additional_data || {};
                        actionUser.source.additional_data.referralReceivedBonusDate = new Date();
                        dal.updateUserSourceAdditionInfo(actionUser.user_id, actionUser.source.additional_data).then(()=> {
                            if (!actionUser.name || actionUser.name.length == 0) {
                                actionUser.name = 'your friend';
                            }
                            // TODO: Refactoring: use Promise.any
                            if (goodFriend.proactive_address) {
                                let friendProactiveData = {referralPoints: consts.referral_bonus_points, friendName: actionUser.name};
                                sendProactiveMessage(goodFriend.proactive_address, consts.PROACTIVE_MESSAGES_REFERRAL_BONUS, friendProactiveData, goodFriend.userId).then(()=>{
                                    // send email
                                    sendEmailForReferrerFriend(goodFriend.email, actionUser.name).then(() => {
                                        resolve();
                                    }).catch((err)=> {
                                        logger.log.error('sendEmailForReferrerFriend error', {error: serializeError(err), actionUser: actionUser});                                                                                            
                                        reject(); // We don't want to reject because the user already received the credits!                            
                                    })
                                }).catch(()=>{
                                    // send email
                                    sendEmailForReferrerFriend(goodFriend.email, actionUser.name).then(() => {
                                        resolve();
                                    }).catch((err)=> {
                                        logger.log.error('sendEmailForReferrerFriend error', {error: serializeError(err), actionUser: actionUser});                                                    
                                        reject(); // We don't want to reject because the user already received the credits!                            
                                    })
                                });
                            } else {
                                // send email
                                sendEmailForReferrerFriend(goodFriend.email, actionUser.name).then(() => {
                                    resolve();
                                }).catch((err)=> {
                                    logger.log.error('sendEmailForReferrerFriend error', {error: serializeError(err), actionUser: actionUser});                
                                    reject(); // We don't want to reject because the user already received the credits!                            
                                })
                            }
                        }).catch(err => {
                            logger.log.error('checkAndGiveCreditsToReferal:dal.updateUserSourceAdditionInfo error', {error: serializeError(err), actionUser: actionUser});                
                            reject(); // We don't want to reject because the user already received the credits!
                        });                   
                    }).catch(err => {
                        logger.log.error('checkAndGiveCreditsToReferal: dal.increaseUserCredits error', {error: serializeError(err), goodFriend: goodFriend});                
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

function sendEmailForReferrerFriend(email, friendName) {
    return new Promise((resolve, reject) => {
        if (email && email.length>0 && email.indexOf('@')>-1) {
            var referralHtmlContent = fs.readFileSync(path.dirname(fs.realpathSync(__filename)) + '/../email_templates/referral-bonus.html', 'utf8');                        
            referralHtmlContent = referralHtmlContent.replace('%REFERAL_BONUS_POINTS%', consts.referral_bonus_points);
            referralHtmlContent = referralHtmlContent.replace('%FRIEND_NAME%', friendName);

            lightMailSender.sendCustomMail(email, 'Rewardy Friend Referral Bonus!', null, referralHtmlContent).then(()=>{
                resolve();
            }).catch(err => {
                logger.log.error('checkAndGiveCreditsToReferal: lightMailSender.sendCustomMail error', {error: serializeError(err), goodFriendEmail: email});                
                reject(err);
            });
        } else {
            resolve();
        }
    });
}

function sendProactiveMessage(proactive_address, messageId, messageData, userId) {
    return new Promise((resolve, reject) => {
        let fullUrl = process.env.BOT_API_URL + 'proactive?message_address=' + encodeURIComponent(JSON.stringify(proactive_address)) + '&message_id=' + messageId + '&message_data=' + encodeURIComponent(JSON.stringify(messageData)) + '&user_id=' + userId;
        rp(fullUrl)
        .then(function (htmlString) {
            // No need to process the html result...
            resolve(htmlString);
        })
        .catch(function (err) {
            logger.log.error('sendProactiveMessage: unable to send proactive message error', {error: serializeError(err), userId: userId});
            reject(err);
        });
    });    
}

function getBotUserById(req) {
    return new Promise((resolve, reject) => {
        try {
            let userId = req.query.userId;
            dal.getBotUserById(userId).then(user => {
                resolve(user);
            }).catch (err => {
                logger.log.error('getBotUserById: error on dal.getBotUserById', {error: serializeError(err), userId: userId});
                reject(err);
            })
        }
        catch (err) {
            logger.log.error('getBotUserById: error occured', {error: serializeError(err)});
            reject(err);            
        }
        
    });
}

function updateUserEmail(req) {
    return new Promise((resolve, reject) => {
        try {
            let userId = req.query.userId;
            let email = req.query.email;

            if (!consts.EMAIL_REGEX.test(email)) {
                reject('invalid email address');
            } else {
                dal.updateUserEmail(userId, email).then(user => {
                    resolve(user);
                }).catch (err => {
                    logger.log.error('getBotUserById: error on dal.getBotUserById', {error: serializeError(err), userId: userId});
                    reject(err);
                })
            }
        }
        catch (err) {
            logger.log.error('getBotUserById: error occured', {error: serializeError(err)});
            reject(err);            
        }
        
    });
}

function getUserAgentDetails(req) {
    return new Promise((resolve, reject) => {
        try {            
            let countryCode = getCounteryCode(req);
            let deviceData = getPlatformAndDeviceFromUA(req.headers['user-agent']);
            let platform = deviceData.osType;
            let device = deviceData.device;

           resolve({countryCode, platform, device})
        }
        catch (err) {
            logger.log.error('getUserAgentDetails: error occured', {error: serializeError(err)});
            reject(err);            
        }
        
    });    
}

/*
    Query arguments:
    partner - partner Id (i.e Applift)
    uid - Rewardy user Id
    stub - use stub data (0 default OR 1)
*/
function getAvailableOffers(req) {
    return new Promise((resolve, reject) => {
        try {
            let stub = req.query.stub || 0;
            let partner = req.query.partner;
            let userId = req.query.uid;
            
            let countryCode = getCounteryCode(req);
            let deviceData = getPlatformAndDeviceFromUA(req.headers['user-agent']);
            let platform = deviceData.osType;
            let device = deviceData.device;

            dal.updateUserUADetails(userId, platform, device, countryCode).then(()=>{
                getOffers(stub, partner, userId, countryCode, deviceData, platform, device).then(data => resolve(data)).catch(err => reject(err));
            }).catch(err => {
                getOffers(stub, partner, userId, countryCode, deviceData, platform, device).then(data => resolve(data)).catch(err => reject(err));;
            });
        }
        catch (err) {
            logger.log.error('getAvailableOffers: error occured', {error: serializeError(err)});
            reject(err);            
        }
        
    });    
}

function getOffers(stub, partner, userId, countryCode, deviceData, platform, device) {
    return new Promise((resolve, reject) => {
        if (stub != 0) {
            let offersResult = stubForApplift();
            resolve(offersResult);
        } else {
            let offersPromise = [];
            offersPromise.push(getMobilitrInHouseAvailableOffersWithParams(userId, countryCode, platform).catch(e=>e));            
             offersPromise.push(getAppliftAvailableOffersWithParams(userId, countryCode, platform, device).catch(e=>e));
            //offersPromise.push(getCpaLeadAvailableOffersWithParams(userId, countryCode, platform, device).catch(e=>e));
            Promise.all(offersPromise).then(offers => {
                let allOffers = [];
                for (let i=0; i<offers.length; i++) {
                    if (Array.isArray(offers[i])) {
                        allOffers = allOffers.concat(offers[i]);
                    }
                }
                resolve(allOffers);
            }).catch(err => {
                logger.log.error('getAvailableOffers: error occured on calling to getAppliftAvailableOffersWithParams', {error: serializeError(err)});
                reject(err);     
            })
        }
    });
}

const geoip = require('geoip-lite');
function getCounteryCode(req) {
    const clientIp = requestIp.getClientIp(req);
    let geo = geoip.lookup(clientIp);
    if (!geo) {
        logger.log.error('getCounteryCode: geo is null - returning US', {clientIp: clientIp});        
        return 'US';
    }
    return geo.country;
}

const MobileDetect = require('mobile-detect');
function getPlatformAndDeviceFromUA(userAgent) {
    let md = new MobileDetect(userAgent);
    let osType = null;
    switch (md.os()) {
        case 'AndroidOS':
            osType = 'android';
            break;
        case 'iOS':        
            osType = 'ios';
            break;
        case 'BlackBerryOS':
        case 'PalmOS':
        case 'SymbianOS':
        case 'WindowsMobileOS':
        case 'WindowsPhoneOS':
        case 'MeeGoOS':
        case 'MaemoOS':
        case 'JavaOS':
        case 'webOS':
        case 'badaOS':
        case 'BREWOS':
        default:
            osType = null;
    }

    let device = null;
    if (md.tablet() != null) {
        device = 'tablet';
    } else if (md.mobile() != null) {
        device = 'phone';
    }
    
    return ({osType, device});
    
}

let appliftOffersResponse = {lastResponse: null, offersJson: null};
function getAppliftAvailableOffersWithParams(userId, countryCode, platform, device) {
    return new Promise((resolve, reject) => {
        try {
            if (appliftOffersResponse && appliftOffersResponse.lastResponse && (new Date())-appliftOffersResponse.lastResponse<consts.APPLIFT_CACHE_OFFERS_MINUTES*1000*60) {
                let offersResult = getAppliftOffersByResponse(appliftOffersResponse.offersJson, userId, countryCode, platform, device);
                resolve(offersResult);
            } else {
                let fullUrl = 'https://pull.applift.com/ads/' + process.env.APPLIFT_TOKEN;
                rp(fullUrl)
                .then(function (offersText) {
                    appliftOffersResponse.offersJson = JSON.parse(offersText);
                    appliftOffersResponse.lastResponse = new Date();
                    let offersResult = getAppliftOffersByResponse(appliftOffersResponse.offersJson, userId, countryCode, platform, device);
                    
                    resolve(offersResult);             
                })
                .catch(function (err) {
                    logger.log.error('getAppliftAvailableOffersWithParams: unable to call applift url: ' + fullUrl, {error: serializeError(err)});
                    reject(err);
                });
            }
        }
        catch (err) {
            logger.log.error('getAppliftAvailableOffersWithParams: error occured', {error: serializeError(err)});
            reject(err);            
        }
        
    });    
}

function getAppliftOffersByResponse(offersJson, userId, countryCode, platform, device) {
    let offersResult = [];

    for (let i=0; i<offersJson.length; i++) {
        let offer = new Offer();
        offer.parseAppliftResponse(offersJson[i], userId);
        if (offer.countries.includes(countryCode) && 
            (device == null || offer.devices == 'all' || offer.devices.includes(device)) &&
            (platform == null || offer.platform == platform)) {
                offersResult.push(offer);
            }
    }
    return offersResult;
}

let cpaLeadOffersResponse = {lastResponse: null, offersJson: null};
function getCpaLeadAvailableOffersWithParams(userId, countryCode, platform, device) {
    return new Promise((resolve, reject) => {
        try {
            if (cpaLeadOffersResponse && cpaLeadOffersResponse.lastResponse && (new Date())-cpaLeadOffersResponse.lastResponse<consts.CPA_LEAD_CACHE_OFFERS_MINUTES*1000*60) {
                let offersResult = getCpaLeadsOffersByResponse(cpaLeadOffersResponse.offersJson, userId, countryCode, platform, device);
                resolve(offersResult);
            } else {
                let fullUrl = 'https://cpalead.com/dashboard/reports/campaign_json.php?id=818141&mobile_app=1';
                rp(fullUrl)
                .then(function (offersText) {
                    cpaLeadOffersResponse.offersJson = JSON.parse(offersText).offers;
                    cpaLeadOffersResponse.lastResponse = new Date();
                    let offersResult = getCpaLeadsOffersByResponse(cpaLeadOffersResponse.offersJson, userId, countryCode, platform, device);
                    
                    resolve(offersResult);                    
                })
                .catch(function (err) {
                    logger.log.error('getCpaLeadAvailableOffersWithParams: unable to call applift url: ' + fullUrl, {error: serializeError(err)});
                    reject(err);
                });
            }
            
        }
        catch (err) {
            logger.log.error('getCpaLeadAvailableOffersWithParams: error occured', {error: serializeError(err)});
            reject(err);            
        }
        
    });    
}

function getMobilitrInHouseAvailableOffersWithParams(userId, countryCode, platform) {
    return new Promise((resolve, reject) => {
        try {
            let offersResult = [];
            
            // iOS
            // US
            if (countryCode=='US' && platform == 'ios') {
                offersResult.push(new Offer('Rewardy - United States - GSN Casino - iOS', `${process.env.SERVER_API_URL}offer_click?partner=${consts.PARTNER_ID_MOBILITR_INHOUSE}&uid=${userId}&offer=3dc13aa3-6641-4c44-95aa-39c508565e6a&op=1.00&payout_type=CPI`, '',
                1*consts.MOBILITR_INHOUSE_USD_TO_POINTS_RATIO,'Install', 'https://is5-ssl.mzstatic.com/image/thumb/Purple118/v4/ae/86/37/ae8637db-b5f0-49a5-b65f-372ffa2f3264/mzl.ifcoibem.png/246x0w.jpg',
                'GSN Casino: Slot Machine Games', 4.5, 'Install', ['US'], ['ios'], '','ios'));

                offersResult.push(new Offer('Rewardy - United States - Ceasers - iOS', `${process.env.SERVER_API_URL}offer_click?partner=${consts.PARTNER_ID_MOBILITR_INHOUSE}&uid=${userId}&offer=253ef9cc-5718-47c2-adb5-51afb718a42a&op=1.00&payout_type=CPI`, '',
                    1*consts.MOBILITR_INHOUSE_USD_TO_POINTS_RATIO,'Install', 'https://is2-ssl.mzstatic.com/image/thumb/Purple118/v4/37/33/93/3733936b-6e79-c23d-d6de-00a96c421a5b/AppIconIPhone-1x_U007emarketing-0-85-220-0-1.png/246x0w.jpg',
                    'Caesars Casino Official Slots', 5, 'Install', ['US'], ['ios'], '','ios'));
                
                offersResult.push(new Offer('Rewardy - United States - Slotomania - iOS', `${process.env.SERVER_API_URL}offer_click?partner=${consts.PARTNER_ID_MOBILITR_INHOUSE}&uid=${userId}&offer=38f47304-83e1-4ece-80b9-23a6595a96fb&op=1.00&payout_type=CPI`, '',
                    1*consts.MOBILITR_INHOUSE_USD_TO_POINTS_RATIO,'Install', 'https://is1-ssl.mzstatic.com/image/thumb/Purple118/v4/00/ae/ff/00aeff29-6e01-a479-0cab-0aae24d97d5b/mzl.zzbbgdaf.jpg/246x0w.jpg',
                    'Slotomania: Vegas Slots Casino', 4, 'Install', ['US'], ['ios'], '','ios'));
                
                offersResult.push(new Offer('Rewardy - United States - House Of Fun - iOS', `${process.env.SERVER_API_URL}offer_click?partner=${consts.PARTNER_ID_MOBILITR_INHOUSE}&uid=${userId}&offer=57329226-bf95-445b-bd9b-74ff09fad8c5&op=1.00&payout_type=CPI`, '',
                    1*consts.MOBILITR_INHOUSE_USD_TO_POINTS_RATIO,'Install', 'https://is1-ssl.mzstatic.com/image/thumb/Purple118/v4/1d/68/cf/1d68cfc6-c8d6-8e35-622e-1efaadf70b59/mzl.zhwrgtwh.png/246x0w.jpg',
                    'Slots Casino - House of Fun', 4.5, 'Install', ['US'], ['ios'], '','ios'));
                
                offersResult.push(new Offer('Rewardy - United States - WSOP - iOS', `${process.env.SERVER_API_URL}offer_click?partner=${consts.PARTNER_ID_MOBILITR_INHOUSE}&uid=${userId}&offer=7a69c140-5d4a-4bbb-bc1f-c2a477eeba44&op=1.00&payout_type=CPI`, '',
                    1*consts.MOBILITR_INHOUSE_USD_TO_POINTS_RATIO,'Install', 'https://is4-ssl.mzstatic.com/image/thumb/Purple128/v4/d1/61/20/d1612024-5271-e747-cc37-4c3a4c99117a/mzl.qnxcjmxj.jpg/246x0w.jpg',
                    'World Series of Poker - WSOP', 4.5, 'Install', ['US'], ['ios'], '','ios'));

                offersResult.push(new Offer('Rewardy - United States - VDS - iOS', `${process.env.SERVER_API_URL}offer_click?partner=${consts.PARTNER_ID_MOBILITR_INHOUSE}&uid=${userId}&offer=d70f295a-6d5f-47c7-9a14-8921fd6da2c3&op=1.00&payout_type=CPI`, '',
                    1*consts.MOBILITR_INHOUSE_USD_TO_POINTS_RATIO,'Install', 'https://is5-ssl.mzstatic.com/image/thumb/Purple118/v4/32/ae/95/32ae95e1-1da5-810f-8b2d-a917b3ed03ee/AppIcons-1x_U007emarketing-0-85-220-0-4.png/246x0w.jpg',
                    'Vegas Words – Downtown Slots', 5, 'Install', ['US'], ['ios'], '','ios'));
            } else if (countryCode=='UK' && platform == 'ios') {
                // UK
                offersResult.push(new Offer('Rewardy - United Kingdom - Coral Sports Betting - iOS', `${process.env.SERVER_API_URL}offer_click?partner=${consts.PARTNER_ID_MOBILITR_INHOUSE}&uid=${userId}&offer=4876e8fa-4c16-43fa-9b7d-abaddc1364f3&op=1.00&payout_type=CPI`, '',
                    1*consts.MOBILITR_INHOUSE_USD_TO_POINTS_RATIO,'Install', 'https://is4-ssl.mzstatic.com/image/thumb/Purple128/v4/2e/54/bc/2e54bc4d-3755-34ab-e177-e38daea894d2/AppIcon-1x_U007emarketing-85-220-0-5.png/246x0w.jpg',
                    'Coral Sports Betting & Casino', 4, 'Install', ['UK'], ['ios'], '','ios'));

                offersResult.push(new Offer('Rewardy - United Kingdom - Ladbrokes Sport - iOS', `${process.env.SERVER_API_URL}offer_click?partner=${consts.PARTNER_ID_MOBILITR_INHOUSE}&uid=${userId}&offer=dde4855e-7f51-4bee-9372-fce3b1bae5d8&op=1.00&payout_type=CPI`, '',
                    1*consts.MOBILITR_INHOUSE_USD_TO_POINTS_RATIO,'Install', 'https://is1-ssl.mzstatic.com/image/thumb/Purple128/v4/44/a7/7d/44a77d22-d87a-e792-8707-5db5213c1f61/AppIcon-1x_U007emarketing-0-0-GLES2_U002c0-512MB-sRGB-0-0-0-85-220-0-0-0-9.png/246x0w.jpg',
                    'Ladbrokes Sports Betting', 4, 'Install', ['UK'], ['ios'], '','ios'));
                
                offersResult.push(new Offer('Rewardy - United Kingdom - William Hill - iOS', `${process.env.SERVER_API_URL}offer_click?partner=${consts.PARTNER_ID_MOBILITR_INHOUSE}&uid=${userId}&offer=f4ff04d3-7bbe-485d-a426-b8bef43a8399&op=1.00&payout_type=CPI`, '',
                    1*consts.MOBILITR_INHOUSE_USD_TO_POINTS_RATIO,'Install', 'https://is5-ssl.mzstatic.com/image/thumb/Purple128/v4/ea/65/5b/ea655bf6-181c-bc3e-ced3-b112667c2b24/AppIcon-1-1x_U007emarketing-85-220-0-8.png/246x0w.jpg',
                    'William Hill Sports Betting', 4.5, 'Install', ['UK'], ['ios'], '','ios'));
            }

            resolve(offersResult);            
        }
        catch (err) {
            logger.log.error('getMobilitrAvailableOffersWithParams: error occured', {error: serializeError(err)});
            reject(err);            
        }
        
    });    
}

function getCpaLeadsOffersByResponse(offersJson, userId, countryCode, platform, device) {
    let offersResult = [];
    
    for (let i=0; i<offersJson.length; i++) {
        if (offersJson[i].payout_type=='CPI' && offersJson[i].payout_currency == 'USD') {
            let offer = new Offer();
            offer.parseCpaLeadResponse(offersJson[i], userId);
            if (offer.countries.includes(countryCode) && 
                (device == null || offer.devices == 'all' || offer.devices.includes(device)) &&
                (platform == null || offer.platform == platform)) {
                    offersResult.push(offer);
                }
        }
    }

    return offersResult;
}

function stubForApplift() {
    return ([
        {
            id: '595cc525-dc5a-4771-a850-5a931ed85d14',
            click_url: 'http://google.com',
            points: 50,
            cta_text: 'install', 
            icon_url: 'http://is2.mzstatic.com/image/thumb/Purple128/v4/7f/5a/26/7f5a268a-dba3-6bee-caee-d98798e85ff6/source/512x512bb.jpg',
            title: 'Boltt Health: Get Fit & Healthynow',
            store_rating: 4.5,
            action: 'Achieve Level 5'
        },
        {
            id: '125cc525-dc5a-4771-a850-5a931ed85d34',
            click_url: 'http://scouter.club/',
            points: 10,
            cta_text: 'download this crazy app!', 
            icon_url: 'http://scouter.club/img/logo.png',
            title: 'Scouter App',
            store_rating: 4.8,
            action: 'Install App'
        },
        {
            id: '345cc525-dc5a-4771-a850-5a931ed85d56',
            click_url: 'https://www.facebook.com/itamar.mula',
            points: 20,
            cta_text: 'view', 
            icon_url: 'http://graph.facebook.com/598408272/picture',
            title: 'Xoxo for Mula',
            store_rating: 2.4,
            action: 'Registration'
        },
        {
            id: '565cc525-dc5a-4771-a850-5a931ed85d78',
            click_url: 'https://www.gmail.com',
            points: 15,
            cta_text: 'download', 
            icon_url: 'https://lh6.ggpht.com/8-N_qLXgV-eNDQINqTR-Pzu5Y8DuH0Xjz53zoWq_IcBNpcxDL_gK4uS_MvXH00yN6nd4=w300',
            // title: null,
            // store_rating: null,
            action: 'Download'
        },
    ]);
}

/*
    Query arguments:
    partner - partner Id (i.e. Applift)
    uid - clicking User Id
    offer - cliced offer Id
    token - offer's token
    op - original payout value
    payout_type - CPI/CPA
*/
function offerClick(req) {
    return new Promise((resolve, reject) => {
        try {
            let partner = req.query.partner;
            let userId = req.query.uid;
            let offerId = '';
            if (req.query.offer) {
                offerId = req.query.offer;
            }
            let token = '';
            if (req.query.token) {
                token = req.query.token;
            }
            let originalPayout = req.query.op;
            let payoutType = req.query.payout_type;

            // let sig = getSigForAppliftToVoluum(selectedOffer.id, userId, selectedOffer.points, consts.VOLUUM_APPLIFT_SECRET_KEY);
            let voluumUrl = '';
            let partnerName = '';
            switch (partner) {
                case consts.PARTNER_ID_APPLIFT:
                    voluumUrl = consts.MOBILITR_APPLIFT_URL;
                    partnerName = consts.PARTNER_APPLIFT;
                    break;
                case consts.PARTNER_ID_CPA_LEAD:
                    voluumUrl = consts.MOBILITR_CPALEAD_URL;
                    partnerName = consts.PARTNER_CPA_LEAD;
                    break;
                case consts.PARTNER_ID_MOBILITR_INHOUSE:
                    voluumUrl = `${consts.MOBILITR_INHOUSE_URL_PREFIX}/${offerId}`;
            }
            let fullVoluumUrl = `${voluumUrl}?token=${encodeURIComponent(token)}&offer_id=${offerId}&user_id=${userId}&original_payout=${originalPayout}&payout_type=${payoutType}&partner_id=${partner}`;

            dal.getBotUserById(userId).then(user => {
                if (user.proactive_address && user.proactive_address.channelId) {
                    fullVoluumUrl += `&source_name=${user.proactive_address.channelId}`;
                }
                saveOfferClick(partner,partnerName, userId,offerId,token,originalPayout,payoutType,fullVoluumUrl).then(()=>{
                    sendEventToKean('data-offerclick', {partner: partnerName, userId,offerId,token,originalPayout,payoutType,fullVoluumUrl});
                    resolve({redirectUrl: fullVoluumUrl});
                }).catch(err=>{
                    logger.log.error('offerClick: error on saveOfferClick', {error: serializeError(err)});
                    resolve({redirectUrl: fullVoluumUrl});
                })
            }).catch(err => {
                logger.log.error('offerClick: unable to get user details', {error: serializeError(err), userId: userId});
                resolve({redirectUrl: fullVoluumUrl});                
            });
            
            
            

          
        }
        catch (err) {
            logger.log.error('offerClick: error occured', {error: serializeError(err)});
            reject(err);            
        }
        
    });
}

function saveOfferClick(partner,partnerName, userId,offerId,token,originalPayout,payoutType,fullVoluumUrl) {
    return new Promise((resolve, reject) => {
        dal.saveOfferClick(partner,partnerName, userId,offerId,token,originalPayout,payoutType,fullVoluumUrl)
        .then(() => {
            resolve();
        })
        .catch(function (err) {
            logger.log.error('saveOfferClick: error saving to database', {error: serializeError(err)});
            reject(err);
        });
    });
}

function postback_applift(req) {
    /* Query Params
        uid: the user id in rewardy's system
        points: number of points to add to the user
        oid: Id of the offer that was completed
        payout: payout amount from applify
        sig: the security hash that proves that this postback comes from us.
    */
    return new Promise((resolve, reject) => {
        try {
            var userId = req.query.uid;
            var offerId = req.query.oid;
            let payout =  req.query.payout;
            var offerCredits = payout*consts.APPLIFT_USD_TO_POINTS_RATIO; // Calculating the points from the pauout instead of using the points from the request!!!
            var offerInitialPoints = req.query.points;

            var partner = consts.PARTNER_APPLIFT;
            var date = new Date();
            var innerTransactionId = uuid.v1();

            // No need to check the sig yet
            // var key = req.query.sig
            // if (key !== getSigForAppliftPostBack(offerId, userId, offerCredits , consts.VOLUUM_APPLIFT_SECRET_KEY)) {
            //     logger.log.error('postback_applift: Signature key is not valid, ignoring request. request key: ' + key, {request: req});
            //     reject('Signature key is not valid');
            //     return;
            // }
        
            dal.addUserAction(innerTransactionId, partner, userId, offerCredits, date, {offerId: offerId, payout: payout, offerInitialPoints: offerInitialPoints}).then(()=> {
                rewardUserWithCredits(null, userId, offerCredits, partner).then(()=> {
                    resolve();
                }).catch(err => {
                    logger.log.error('postback_applift: rewardUserWithCredits error', {error: serializeError(err)});
                    reject(err);
                })
                
                
            }).catch(err => {
                logger.log.error('postback_applift: dal.addUserAction error', {error: serializeError(err)});                
                reject(err);
            });
        } catch (err) {
            logger.log.error('postback_applift: error occured', {error: serializeError(err), request: req});
            reject(err);
        }
    });
}


/*
    Query Params
    partner_id: monitization partner id (applift / cpalead)
	token: offer id in applift
	user_id: the user id in rewardy's system
    offer_id: Id of the offer that was completed
	sig: the security hash that proves that this postback comes from us.
	payout: payout amount from applify
	original_payout: original payout when the user clicked
	payout_type: CPI/CPA
	source_name: user chat platform (viber, facebook, kik etc.)
*/
function postback_mobilitr(req) {
    return new Promise((resolve, reject) => {
        try {
            let userId = req.query.user_id;
            let offerId = '';
            if (req.query.offer_id) {
                offerId = req.query.offer_id;
            }

            let token = '';
            if (req.token) {
                token = req.token; 
            }

            let partner = req.query.partner_id;
            let partnerName;
            let payout =  req.query.payout;
            let offerCredits = 0; 
            switch (partner) {
                case consts.PARTNER_ID_APPLIFT:
                    offerCredits = payout*consts.APPLIFT_USD_TO_POINTS_RATIO;
                    partnerName = consts.PARTNER_APPLIFT;
                    break;
                case consts.PARTNER_ID_CPA_LEAD:
                    offerCredits = payout*consts.CPALEAD_USD_TO_POINTS_RATIO;
                    partnerName = consts.PARTNER_CPA_LEAD;
                    break;
                case consts.PARTNER_ID_MOBILITR_INHOUSE:
                    offerCredits = payout*consts.MOBILITR_INHOUSE_USD_TO_POINTS_RATIO;
                    partnerName = consts.PARTNER_MOBILITR_INHOUSE;
                    break;
                default:
                    offerCredits = payout*100;
                    partnerName = 'PartnerId: ' + partner;
            }
            let offerOriginalPayout = req.query.original_payout;
            let payoutType = req.query.payout_type;
            let sourceName = req.query.source_name;

            let date = new Date();
            let innerTransactionId = uuid.v1();

            // No need to check the sig yet
            // var key = req.query.sig
            // if (key !== getSigForAppliftPostBack(offerId, userId, offerCredits , consts.VOLUUM_APPLIFT_SECRET_KEY)) {
            //     logger.log.error('postback_applift: Signature key is not valid, ignoring request. request key: ' + key, {request: req});
            //     reject('Signature key is not valid');
            //     return;
            // }
            sendEventToKean('data-postback', {dataId: innerTransactionId, partner: partnerName, userId, offerCredits, sourceName, payoutType, offerOriginalPayout, payout, token, offerId, date});
        
            dal.addUserAction(innerTransactionId, partnerName, userId, offerCredits, date, {offerId, token, payout, offerOriginalPayout, payoutType, sourceName}).then(()=> {
                rewardUserWithCredits(null, userId, offerCredits, partner).then(()=> {
                    resolve();
                }).catch(err => {
                    logger.log.error('postback_applift: rewardUserWithCredits error', {error: serializeError(err)});
                    reject(err);
                })
                
                
            }).catch(err => {
                logger.log.error('postback_applift: dal.addUserAction error', {error: serializeError(err)});                
                reject(err);
            });
        } catch (err) {
            logger.log.error('postback_applift: error occured', {error: serializeError(err), request: req});
            reject(err);
        }
    });  
}

const KeenTracking = require('keen-tracking');
function sendEventToKean(eventName, eventData) {
    try {
        const client = new KeenTracking({
            projectId: '5a736fb3c9e77c00018eb9e4',
            writeKey: '952724917B0A3E4F25897F1A2B88C7DF32CB7999DAEF5BDDF2FE7B8486742EE18827F6B2633890ABBE4901E7858CBB29B8F706E30E97D85E6126FB5732D3DFFBDBBB56B817FE3FCC06CB5CBDEBA64F501E2AAD11812FBF951C68F418F7AB0666'
          });

        client.recordEvent(eventName, eventData);

    } catch (err) {
        logger.log.error('sendEventToKean: error occured', {error: serializeError(err)});
        
    }
}

function getSigForAppliftPostBack(offerId, userId, offerCredits, secretKey) {
    let calculatedSig = md5(userId + offerId + offerCredits +secretKey);
    return calculatedSig;
}

function getSigForAppliftToVoluum(offerId, userId, offerCredits, secretKey) {
    let calculatedSig = md5(offerId + userId + offerCredits +secretKey);
    return calculatedSig;
}

module.exports = {
    updateAllCredits: updateAllCredits,
    insertOffersToDB: insertOffersToDB,
    postback_superrewards: postback_superrewards,
    postback_offerwall: postback_offerwall,
    postback_applift: postback_applift,
    getBotUserById: getBotUserById,
    updateUserEmail: updateUserEmail,
    getAvailableOffers: getAvailableOffers,
    offerClick: offerClick,
    getUserAgentDetails: getUserAgentDetails,
    postback_mobilitr
};