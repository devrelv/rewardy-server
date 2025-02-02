var clone = require('clone');
var mongoose = clone(require('mongoose'));
var consts = require('./api/consts')
const logger = require('./logger');
const serializeError = require('serialize-error');

logger.log.info('dal: ####### connecting to the database #######');
let mongoConnectionString = '';
if (process.env.CURRENT_ENV == 'PROD') {
    mongoConnectionString = process.env.PROD_MONGO_CONNECTION_STRING;
} else {
    mongoConnectionString = process.env.DEV_MONGO_CONNECTION_STRING;
}
let conn = mongoose.connect(mongoConnectionString, {useMongoClient: true});

mongoose.Promise = require('bluebird');
let Schema = mongoose.Schema;

let MonetizationPartnerSchema = new Schema({
    id: {
        type: String,
        required: true,
        unique: true
    },
    name: {
        type: String,
        required: true,
        unique: true
    },
    last_full_fetch: {
        type: String,
        default: Date.now,
    },
    has_offers: {
        type: Boolean,
        required: true,
        default: 0
    }
});
let MonetizationPartner = conn.model('MonetizationPartner', MonetizationPartnerSchema);

let OfferSchema = new Schema({
    id: {
        type: String,
        required: true,
        unique: true
    },
    partnerId: {
        type: String,
        required: true
    },
    fetchDate: {
        type: String,
        required: true
    },
    imageUrl: {
        type: String,
    },
    downloadLink: {
        type: String,
    },
    title: {
        type: String,
    },
    description: {
        type: String,
    },
    credits: {
        type: Number,
        required: true,
        default: 0
    },
});
let Offer = conn.model('Offer', OfferSchema);

let UserActionSchema = new Schema({
    id: { /* ourTransactionId */
        type: String,
        required: true,
        unique: true
    },
    partner: {
        type: String,
        required: true
    },
    userId: {
        type: String,
        required: true
    },
    offerCredits: {
        type: Number,
        required: true
    },
    date: {
        type: Date,
        required: true,
        default: Date.now
    },
    partner_extended_data: {
        type: Schema.Types.Mixed,
        required: false
    }
});
let UserAction = conn.model('UserAction', UserActionSchema);

// TODO: Add "Common Objects" module
let BotUserSchema = new Schema({
    user_id: {
        type: String,
        required: true,
        unique: true
    },
    email: {
        type: String
    },
    name: {
        type: String,
        required: true
    },
    language: {
        type: String,
        required: true,
        default: consts.defaultUserLanguage,
    },
    points: {
        type: Number,
        required: true
    },
    created_at: {
        type: Date,
        default: Date.now,
        required: true
    },
    last_daily_bonus: {
        type: Date,
        default: Date.now
    },
    source: {
        type: {
            type: String,
            required: false,
            default: ''
        }, 
        id: {
            type: String,
            required: false,
            default: ''
        },
        additional_data: {
            type: Schema.Types.Mixed,
            required: false
        }
    },
    proactive_address: {
        type: Schema.Types.Mixed
    },
    user_agent_details: {
        country: {
            type: String,
            required: false
        },
        os_type: {
            type: String,
            required: false
        },
        device: {
            type: String,
            required: false
        }
    },
    daily_bonus: {
        type: Array,
        default: []
    },
    vouchers_redeem: {
        type: [{
            voucher_id: String,
            points: Number,
            request_date: Date,
            issue_date: Date,
            voucher_reference_data: Schema.Types.Mixed
        }],
        default: []
    },
    offers_page_visits: {
        type: Array,
        default: []
    },
    idfa: {
        type: Array,
        default: []
    }
});

let BotUser = conn.model('BotUser', BotUserSchema);

let InvitationSchema = new Schema({
    inviting_user_id : {
        type: String,
        required: true
    },
    invited_email: {
        type: String,
        required: true
    },
    invitation_completed: {
        type: Boolean,
        default: 0,
        required: true
    },
    created_at: {
        type: Date,
        required: true,
        default: Date.now
    }
});
let Invitation = conn.model('Invitation', InvitationSchema);

let OfferClickSchema = new Schema({
    user_id : {
        type: String,
        required: true
    },
    partner: {
        type: String,
        required: true
    },
    partner_name: {
        type: String,
        required: false
    },
    offer_id: {
        type: String,
        required: false
    },
    token: {
        type: String,
        required: false
    },
    original_payout: {
        type: Number,
        default: 0,
        required: false
    },
    payout_type: {
        type: String,
        default: 0,
        required: false
    },
    redirect_url: {
        type: String,
        default: 0,
        required: false
    },
    idfa: {
        type: String,
        required: false
    },
    created_at: {
        type: Date,
        required: true,
        default: Date.now
    }
});
let  OfferClick = conn.model(' OfferClick',  OfferClickSchema);

let NoOfferSchema = new Schema({
    user_id : {
        type: String,
        required: true
    },
    country: {
        type: String,
        required: true
    },
    device: {
        type: String,
        required: false
    },
    os_type: {
        type: String,
        required: false
    },
    created_at: {
        type: Date,
        required: true,
        default: Date.now
    }
});
let NoOffer = conn.model('NoOffer',  NoOfferSchema);

function getAllMonetizationPartners() {
	return new Promise((resolve, reject) => {
        MonetizationPartner.find({}, function(err, data) {
            if (err) {
                logger.log.error('dal: getAllMonetizationPartners.find error', {error: serializeError(err)});        
                reject(err);
            } else {
                resolve(data);
            } 
        });
    });
}
function getAllMonetizationPartnersWithOffers() {
	return new Promise((resolve, reject) => {
        MonetizationPartner.find({'has_offers': true}, function(err, data) {
            if (err) {
                logger.log.error('dal: getAllMonetizationPartnersWithOffers.find error', {error: serializeError(err)});        
                reject(err);
            } else {
                resolve(data);
            } 
        });
    });
}

function saveOffers(offers) {
    // TODO: Move Offer definition to external file and use it in all places instead of making this conversion
    // TODO: Save the offers as a batch instead of one by one
    try {
        let convertedOffers = [];
        for (let i=0; i<offers.length; i++) {
            let newOffer = new Offer({
                id: offers[i].id,
                partnerId: offers[i].partnerId,
                fetchDate: offers[i].fetchDate,
                imageUrl: offers[i].imageUrl,
                downloadLink: offers[i].downloadLink,
                title: offers[i].title,
                description: offers[i].description,
                credits: offers[i].credits
            });
    
            newOffer.save(function(err) {
                if (err) {
                    logger.log.error('dal: saveOffers.save error', {error: serializeError(err), newOffer: newOffer});                        
                }
            });
        }
    } catch (err) {
        logger.log.error('dal: saveOffers error occured', {error: serializeError(err)});                        
        throw err;
    }
    
}

function addUserAction(innerTransactionId, partner, userId, offerCredits, date, partner_extended_data) {
    return new Promise((resolve, reject) => {
        try {        
            let newUserAction = new UserAction({
            id: innerTransactionId,
            partner: partner,
            userId: userId,
            offerCredits: offerCredits,
            date: date,
            partner_extended_data: partner_extended_data
            });

            newUserAction.save(function(err) {
                if (err) {
                    logger.log.error('dal: addUserAction.save error', {error: serializeError(err), newUserAction: newUserAction});                        
                    reject(err);
                } else {
                    resolve();
                }
            });
        }
        catch (err) {
            logger.log.error('dal: addUserAction error occured', {error: serializeError(err)});                        
            reject(err);
        }
    });    
}

function increaseUserCredits(userId, credits, isUpdateDailyBonusDate, bonusDate) {
    return new Promise((resolve, reject) => {
        try {   
            BotUser.findOne({user_id: userId}, (err,res)=> {
                if (err) {
                    logger.log.error('dal: increaseUserCredits BotUser.findOne error', {error: serializeError(err), user_id: userId});                        
                    reject(err);
                } else {
                    if (!res) {
                        reject('user ' + userId + ' not exists in the database');
                    } else {
                        var currentPoints = Number(res.points) + Number(credits);
                        var updateFields = {points: currentPoints};
                        if (isUpdateDailyBonusDate) {
                            if (!bonusDate) {
                                bonusDate = new Date();
                            }
                            updateFields.last_daily_bonus =bonusDate;
                        }
                        BotUser.update({user_id: userId}, {$set: updateFields}, (err, res) => {
                            if (err) {
                                logger.log.error('dal: increaseUserCredits.update error', {error: serializeError(err), user_id: userId, points: currentPoints});                        
                                reject(err);
                            } else {
                                resolve();
                            }
                        });
                    }                    
                }
            });
        }
        catch (err) {
            logger.log.error('dal: increaseUserCredits error occured', {error: serializeError(err)});                        
            reject(err);
        }
    });    
}

function getBotUserByEmail(email) {
    return new Promise((resolve, reject) => {
        BotUser.findOne({
            'email': email
        }, function(err, botUser) {
            if (err) {
                logger.log.error('dal: getBotUserByEmail BotUser.findOne error occured', {error: serializeError(err), email: email});
                reject(err);
            } else {
                resolve(botUser);
            } 
        });
    });
}

function saveFriendReferralNewBotUser(id, name, email, referrerUserId) {
    return new Promise((resolve, reject) => {
        try {
            let botUser = new BotUser({
                user_id: id,
                email: email,
                name: name,
                points: consts.default_points,
                source: {type: consts.botUser_source_friendReferral,
                        id: referrerUserId}
                });
            botUser.save(function(err) {
                if (err) {
                    logger.log.error('dal: saveFriendReferralNewBotUser.save error', {error: serializeError(err), botUser: botUser});                        
                    reject(err);
                } else {
                    resolve();
                }
            })
        }
        catch (err) {
            logger.log.error('dal: saveFriendReferralNewBotUser error', {error: serializeError(err)});                        
            reject(err);
        }
    });
}

function saveInvitation(invitingUserId, invitedEmail) {
    return new Promise((resolve, reject) => {
        try {
            let invitation = new Invitation({
                inviting_user_id : invitingUserId,
                invited_email: invitedEmail
            });

            invitation.save(function(err) {
                if (err) {
                    logger.log.error('dal: saveInvitation error', {error: serializeError(err)});                        
                    reject(err);
                } else {
                    resolve();
                }
            })

        }
        catch (err) {
            logger.log.error('dal: saveInvitation error', {error: serializeError(err)});                        
            reject(err);
        }
    });
}

function getUserLastBonusDate(userId) {
    return new Promise((resolve, reject) => {
        try {
            BotUser.findOne({user_id: userId},
                (err,res) => {
                if (err) {
                    logger.log.error('dal: getUserLastBonusDate findOne error', {error: serializeError(err), userId: userId});                        
                    reject(err);
                } else {
                    if (res) {
                        resolve(res.last_daily_bonus);
                    } else {
                        reject('user ' + userId + ' not found');
                    }
                }
            })
        }
        catch (err) {
            logger.log.error('dal: getUserLastBonusDate error', {error: serializeError(err), userId: userId});                        
            reject(err);
        }
    });
}

// TODO: Exists in BOT dal
function getBotUserById(userId) {
    return new Promise((resolve, reject)=>{
        BotUser.findOne({
            'user_id': userId
        }, function(err, botUser) {
            if (err) {
                logger.log.error('dal: getBotUserById BotUser.findOne error occured', {error: serializeError(err), user_id: userId});
                reject(err);
            } else {
                resolve(botUser);
            } 
        });
    });    
}

function updateUserSourceAdditionInfo(userId, additional_data) {
    return new Promise((resolve, reject) => {
        // user.source.additional_data = additional_data;

        // BotUser.update({user_id: userId}, {$set: {'source' : user.source }}, (err, res) => {
        BotUser.update({user_id: userId}, {$set: {'source.additional_data' : additional_data }}, (err, res) => {
            if (err) {
                logger.log.error('dal: updateUserSourceAdditionInfo.update error', {error: serializeError(err), user_id: userId, additional_data: additional_data});
                reject(err);
            } else {
                resolve();
            }
        });
    }); 
}

function updateUserEmail(userId, email) {
    return new Promise((resolve, reject) => {
        BotUser.update({user_id: userId}, {$set: {'email' : email }}
        , err => {
            if (err) {
                logger.log.error('dal: updateUserEmail.update error', {error: serializeError(err), user_id: userId});
                reject(err);
            } else {
                resolve();
            }
        });
    }); 
}

function saveOfferClick(partner,partnerName, userId,offerId,token,originalPayout,payoutType,fullVoluumUrl, idfa) {
    return new Promise((resolve, reject) => {
        try {
            let offerClick = new OfferClick({
                user_id : userId,
                partner: partner,
                partner_name: partnerName,
                offer_id: offerId,
                token: token,
                original_payout: originalPayout,
                payout_type: payoutType,
                redirect_url: fullVoluumUrl,
                idfa: idfa
            });

            offerClick.save(function(err) {
                if (err) {
                    logger.log.error('dal: saveOfferClick error', {error: serializeError(err)});                        
                    reject(err);
                } else {
                    resolve();
                }
            })

        }
        catch (err) {
            logger.log.error('dal: saveOfferClick error', {error: serializeError(err)});                        
            reject(err);
        }
    });
}

function updateUserUADetails(userId, osType, device, countryCode) {
    return new Promise((resolve, reject) => {
        BotUser.update({user_id: userId}, {$set: {'user_agent_details.country' : countryCode, 'user_agent_details.os_type' : osType, 'user_agent_details.device' : device }}
        , err => {
            if (err) {
                logger.log.error('dal: updateUserUADetails.update error', {error: serializeError(err), user_id: userId});
                reject(err);
            } else {
                resolve();
            }
        });
    }); 
}

function getUserActions(userId) {
    return new Promise((resolve, reject) => {
        UserAction.find({userId: userId}, (err, data) => {
            if (err) {
                logger.log.error('dal: getUserActions.find error', {error: serializeError(err)});        
                reject(err);
            } else {
                resolve(data);
            } 
        });
    });
}

function saveNoOffers(userId, country, device, osType) {
    return new Promise((resolve, reject) => {
        try {
            let noOffer = new NoOffer({
                user_id: userId,
                country,
                device,
                os_type: osType
            });

            noOffer.save(function(err) {
                if (err) {
                    logger.log.error('dal: saveNoOffers error', {error: serializeError(err)});                        
                    reject(err);
                } else {
                    resolve();
                }
            })

        }
        catch (err) {
            logger.log.error('dal: saveNoOffers error', {error: serializeError(err)});                        
            reject(err);
        }
    });
}

function pushDailyBonus(userId, amount, bonusDate) {
    return new Promise((resolve, reject) => {
        try {
            
            BotUser.update({user_id: userId}, {$push: {daily_bonus: {amount:amount, date:bonusDate}}}, (err, res) => {
                if (err) {
                    logger.log.error('dal: addDailyBonus.update error', {error: serializeError(err), user_id: userId, amount: amount, bonusDate: bonusDate});                        
                    reject(err);
                } else {
                    resolve();
                }
            });

        }
        catch (err) {
            logger.log.error('dal: addDailyBonus error', {error: serializeError(err)});                        
            reject(err);
        }
    });
}

function pushVoucherRedeem(userId, voucherId, points, requestDate, issueDate, voucherReferenceData) {
    return new Promise((resolve, reject) => {
        try {
            //TODO: Search for the voucher in the user's vouchers and if exists only update this item, otherwise push a new one
            BotUser.update({user_id: userId}, {$push: {vouchers_redeem: {voucher_id: voucherId, points: points, request_date: requestDate, issue_date: issueDate, voucher_reference_data: voucherReferenceData}}}, (err, res) => {
                if (err) {
                    logger.log.error('dal: pushVoucherRedeem.update error', {error: serializeError(err), user_id: userId});                        
                    reject(err);
                } else {
                    resolve();
                }
            });

        }
        catch (err) {
            logger.log.error('dal: pushVoucherRedeem error', {error: serializeError(err)});                        
            reject(err);
        }
    });
}

function updateUserVisitsOffers(userId, date) {
    return new Promise((resolve, reject) => {
        try {
            BotUser.update({user_id: userId}, {$push: {offers_page_visits: date}}, (err, res) => {
                if (err) {
                    logger.log.error('dal: updateUserVisitsOffers.update error', {error: serializeError(err), user_id: userId});                        
                    reject(err);
                } else {
                    resolve();
                }
            });
        }
        catch (err) {
            logger.log.error('dal: updateUserVisitsOffers error', {error: serializeError(err)});                        
            reject(err);
        }
    })
}

function updateUserIdfa(userId, idfa) {
    return new Promise((resolve, reject) => {
        try {
            if (idfa && idfa.length > 0) {
                BotUser.update({user_id: userId}, {$push: {idfa: {date: new Date(), idfa: idfa}}}, (err, res) => {
                    if (err) {
                        logger.log.error('dal: updateUserIdfa.update error', {error: serializeError(err), user_id: userId});                        
                        reject(err);
                    } else {
                        resolve();
                    }
                });
            } else {
                resolve();
            }
            
        }
        catch (err) {
            logger.log.error('dal: updateUserIdfa error', {error: serializeError(err)});                        
            reject(err);
        }
    })
}

module.exports = {
    getAllMonetizationPartners: getAllMonetizationPartners,
    getAllMonetizationPartnersWithOffers: getAllMonetizationPartnersWithOffers,
    saveOffers: saveOffers,
    addUserAction: addUserAction,
    saveFriendReferralNewBotUser : saveFriendReferralNewBotUser,
    increaseUserCredits: increaseUserCredits,
    getUserLastBonusDate: getUserLastBonusDate,
    getBotUserById: getBotUserById,
    updateUserSourceAdditionInfo: updateUserSourceAdditionInfo,
    getBotUserByEmail: getBotUserByEmail,
    saveInvitation: saveInvitation,
    updateUserEmail: updateUserEmail,
    saveOfferClick: saveOfferClick,
    updateUserUADetails,
    getUserActions,
    saveNoOffers,
    pushDailyBonus,
    pushVoucherRedeem,
    updateUserVisitsOffers,
    updateUserIdfa
}


