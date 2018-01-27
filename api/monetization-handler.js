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

            if (stub != 0) {
                let offersResult = stubForApplift();
                resolve(offersResult);
            } else {
                getAvailableOffersWithParams(partner, userId, countryCode, platform, device).then(offers => {
                    resolve(offers);
                }).catch(err => {
                    logger.log.error('getAvailableOffers: error occured on calling to getAvailableOffersWithParams', {error: serializeError(err)});
                    reject(err);     
                })
            }
        }
        catch (err) {
            logger.log.error('getAvailableOffers: error occured', {error: serializeError(err)});
            reject(err);            
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
        device = 'mobile';
    }
    
    return ({osType, device});
    
}

function getAvailableOffersWithParams(partner, userId, countryCode, platform, device) {
    return new Promise((resolve, reject) => {
        try {
            let offersResult = [];
            // let fullUrl = 'https://virtserver.swaggerhub.com/gaiar/pull/1.0.0/ads?token=' + process.env.APPLIFT_TOKEN;
            let fullUrl = 'https://pull.applift.com/ads/' + process.env.APPLIFT_TOKEN;
            rp(fullUrl)
            .then(function (offersText) {
                let offersJson = JSON.parse(offersText);
                for (let i=0; i<offersJson.length; i++) {
                    let offer = new Offer();
                    offer.parseResponse(offersJson[i], userId, countryCode, device, platform);
                    if (offer.countries.includes(countryCode) && 
                        (device == null || offer.devices == 'all' || offer.devices.includes(device)) &&
                        (platform == null || offer.platform == platform)) {
                            offersResult.push(offer);
                        }
                }

                resolve(offersResult);                    
            })
            .catch(function (err) {
                logger.log.error('getAvailableOffers: unable to call applift url: ' + fullUrl, {error: serializeError(err)});
                reject(err);
            });
        }
        catch (err) {
            logger.log.error('getAvailableOffers: error occured', {error: serializeError(err)});
            reject(err);            
        }
        
    });    
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
*/
function offerClick(req) {
    return new Promise((resolve, reject) => {
        try {
            let partner = req.query.partner; // For future use
            let userId = req.query.uid;
            let offerId = req.query.offer;
            let countryCode = getCounteryCode(req);
            let deviceData = getPlatformAndDeviceFromUA(req.headers['user-agent']);
            let platform = deviceData.osType;
            let device = deviceData.device;

            getAvailableOffersWithParams(partner, userId, countryCode, platform, device).then(offers => {
                let selectedOffer;
                for (let i=0; i<offers.length; i++) {
                    if (offers[i].id == offerId) {
                        selectedOffer = offers[i];
                        break;
                    }
                }
                if (selectedOffer) {
                    let sig = getSigForAppliftToVoluum(selectedOffer.id, userId, selectedOffer.points, consts.VOLUUM_APPLIFT_SECRET_KEY);
                    // let fullVoluumUrl = consts.VOLUUM_URL + '?oid=' + selectedOffer.id + '&uid=' + userId + '&points=' + selectedOffer.points + '&sig=' + sig + '&token=' + selectedOffer.token;
                    let fullVoluumUrl = consts.VOLUUM_URL + '?uid=' + userId + '&points=' + selectedOffer.points + '&sig=' + sig + '&token=' + selectedOffer.token;
                    resolve({offerId: selectedOffer.id, points: selectedOffer.points, userId: userId, sig: sig, token: selectedOffer.token, redirectUrl: fullVoluumUrl});
                } else {
                logger.log.error("offerClick: offerId " + offerId + " not found");
                reject("offerId " + offerId + " not found on offerClick");
                }
            }).catch(err => {
                logger.log.error('getAvailableOffers: error occured calling to getAvailableOffersWithParams', {error: serializeError(err)});
                reject(err);       
            })

            /*           
           dal.saveOfferClick(userId, offerId, points)
            .then(() => {
                resolve();
            })
            .catch(function (err) {
                logger.log.error('offerClick: error saving to database', {error: serializeError(err), userId: userId, offerId: offerId, points: points});
                reject(err);
            });*/
        }
        catch (err) {
            logger.log.error('offerClick: error occured', {error: serializeError(err)});
            reject(err);            
        }
        
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
            var offerCredits = req.query.points;
            var offerId = req.query.oid;
            let payout =  req.query.payout;

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
        
            dal.addUserAction(innerTransactionId, partner, userId, offerCredits, date, {offerId: offerId, payout: payout}).then(()=> {
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
    offerClick: offerClick
};