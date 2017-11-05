var builder = require('botbuilder');

var lib = new builder.Library('get-free-credits');
var Promise = require('bluebird');
var dal = require('./core/dal');
var consts = require('./core/const');
const back_to_menu = require('./back-to-menu');
const chatbase = require('./core/chatbase');

const logger = require('./core/logger');
const serializeError = require('serialize-error');

// TODO: Load locale + save & fetch device in the user data also after query (or in the login)
lib.dialog('/', [
    function (session) {
        try{
            dal.getDeviceByUserId(session.userData.sender.user_id).then(userResult => {
                if (!userResult) {
                    // That's the first time we encounter this user. Share the legal notice!
                    chatbase.sendSingleMessage(chatbase.CHATBASE_TYPE_FROM_BOT, session.userData.sender ? session.userData.sender.user_id : 'unknown', session.message.source, session.gettext('getCredit.legalNotice'), null, false, false);            
                    
                    session.say(session.gettext('getCredit.legalNotice'));
    
                    // User is missing. Fetch details and save to database
                    // TODO: Use the equivalent for bot.getUserDetails
                    // This is the source code:
                        // bot.getUserDetails(session.userProfile)
                        // .then(userDetails => {
                        //     let deviceType = extractDeviceTypeFromUserDetails(userDetails.primary_device_os);
                        //     dal.saveDeviceUserToDatabase(userId, deviceType);
                        //     sendUserOfferWallUrl(session, deviceType, userId);
                        // }).catch(function(e) {
                        //     console.error('Failed to extract with error: ' + e); 
                        //     let fallbackDeviceType = consts.DEVICE_TYPE_DESKTOP;
                        //     dal.saveDeviceUserToDatabase(userId, fallbackDeviceType);
                        //     sendUserOfferWallUrl(session, fallbackDeviceType, userId);
                        // });
    
                    // Until we have the bot.getUserDetails function, we can use this:
                    let fallbackDeviceType = consts.DEVICE_TYPE_DESKTOP;
                    dal.saveDeviceUserToDatabase(session.userData.sender.user_id, fallbackDeviceType);
                    sendUserOfferWallUrl(session, fallbackDeviceType, session.userData.sender.user_id);
                } else {
                    sendUserOfferWallUrl(session, userResult.type, session.userData.sender.user_id);                
                }
                back_to_menu.sendBackToMainMenu(session, builder);
            }).catch(err => {
                logger.log.error('get-free-credits: dal.getDeviceByUserId error', {error: serializeError(err)});
                sendUserOfferWallUrl(session, consts.DEVICE_TYPE_DESKTOP, session.userData.sender.user_id);
                back_to_menu.sendBackToMainMenu(session, builder);
            });
        } catch (err) {
            logger.log.error('get-free-credits: error occured', {error: serializeError(err)});
            throw err;
        }
    }
]);

function sendUserOfferWallUrl(session, deviceType, userId) {
    chatbase.sendSingleMessage(chatbase.CHATBASE_TYPE_FROM_BOT, session.userData.sender ? session.userData.sender.user_id : 'unknown', session.message.source, session.gettext('getCredit.intro') + '\n\r' + offerWallLinkForUser(session, deviceType, userId), null, false, false);                
    session.send(session.gettext('getCredit.intro') + '\n\r' + offerWallLinkForUser(session, deviceType, userId));
}

function offerWallLinkForUser(session, deviceType, userId) {
    let appId;
    if (deviceType === consts.DEVICE_TYPE_ANDROID) {
        appId = consts.SPONSOR_PAY_APP_ID_ANDROID;
    }
    else if (deviceType === consts.DEVICE_TYPE_APPLE) {
        appId = consts.SPONSOR_PAY_APP_ID_APPLE;
    }
    else { // Desktop or unknown
        appId = consts.SPONSOR_PAY_APP_ID_DESKTOP;
    }

    return 'https://rewardy.co/offers.html?uid=' + session.userData.sender.user_id;
}


function extractDeviceTypeFromUserDetails(deviceTypeString) {
    if (!deviceTypeString) {
        return consts.DEVICE_TYPE_DESKTOP;
    }

    let parsedType = consts.DEVICE_TYPE_DESKTOP;
    let compareModel = deviceTypeString.toLowerCase();
    if (compareModel.includes('android')) {
        parsedType = consts.DEVICE_TYPE_ANDROID;
    }
    else if (compareModel.includes('ios')) {
        parsedType = consts.DEVICE_TYPE_APPLE;
    }

    return parsedType;
}

// Export createLibrary() function
module.exports.createLibrary = function () {
    return lib.clone();
};