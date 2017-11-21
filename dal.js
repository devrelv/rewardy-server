var mongoose = require('mongoose');
var consts = require('./api/consts')
const logger = require('./logger');
const serializeError = require('serialize-error');


// const mongodbOptions = {
//     server: {
//         socketOptions: {
//             keepAlive: 300000,
//             connectTimeoutMS: 30000
//         }
//     },
//     replset: {
//         socketOptions: {
//             keepAlive: 300000,
//             connectTimeoutMS: 30000
//         }
//     }
// };

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
let MonetizationPartner = mongoose.model('MonetizationPartner', MonetizationPartnerSchema);

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
let Offer = mongoose.model('Offer', OfferSchema);

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
    partnerTransactionId: {
        type: String,
        required: true
    },
    userId: {
        type: String,
        required: true
    },
    offerId: {
        type: String,
        required: true
    },
    offerCredits: {
        type: Number,
        required: true
    },
    totalCredits: {
        type: Number
    },
    date: {
        type: Date,
        required: true,
        default: Date.now
    }
});
let UserAction = mongoose.model('UserAction', UserActionSchema);

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
    }
});

let BotUser = mongoose.model('BotUser', BotUserSchema);

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
let Invitation = mongoose.model('Invitation', InvitationSchema);

function openConnection() {
    try {
        logger.log.info('dal: ####### connecting to the database #######');
        mongoose.Promise = require('bluebird');
        mongoose.connect(process.env.MONGO_CONNECTION_STRING, {useMongoClient: true}).then(
            ()=>{
            logger.log.info('dal: connected to database');        
            }
        ).catch(err => {
            logger.log.error('dal: openConnection mongoose.connect error occured', {error: serializeError(err)});
            setTimeout(() => {throw err;}); // The setTimeout is a trick to enable the throw err
        });
    } catch (err) {
        logger.log.log('error','dal: openConnection error occured (' + err.message + ')', {error: serializeError(err)});
        throw err;
    }
    
    
}
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

function addUserAction(partnerTransactionId, userId, offerId, offerCredits, totalCredits, partner, date, innerTransactionId) {
    return new Promise((resolve, reject) => {
        try {        
            let newUserAction = new UserAction({
            id: innerTransactionId,
            partner: partner,
            partnerTransactionId: partnerTransactionId,
            userId: userId,
            offerId: offerId,
            offerCredits: offerCredits,
            totalCredits: totalCredits,
            date: date
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

function increaseUserCredits(userId, credits, isUpdateDailyBonusDate) {
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
                            updateFields.last_daily_bonus = new Date();
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

module.exports = {
    openConnection: openConnection,
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
    saveInvitation: saveInvitation
}


