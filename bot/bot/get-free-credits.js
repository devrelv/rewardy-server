var builder = require('botbuilder');

var lib = new builder.Library('get-free-credits');
var Promise = require('bluebird');
var Store = require('./store');
var dal = require('./core/dal');
var consts = require('./core/const');


// TODO: Load locale + save & fetch device in the user data also after query (or in the login)
lib.dialog('/', [
    function (session) {
        session.say(session.gettext('getCredit.intro'));
        dal.getDeviceByUserId(session.userData.sender.userId).then(userResult => {
            if (!userResult) {
                // That's the first time we encounter this user. Share the legal notice!
                session.say(session.gettext('general.legalNotice'));

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
                dal.saveDeviceUserToDatabase(session.userData.sender.userId, fallbackDeviceType);
                sendUserOfferWallUrl(session, fallbackDeviceType, session.userData.sender.userId);
            } else {
                sendUserOfferWallUrl(session, userResult.type, session.userData.sender.userId);                
            }
            session.endDialog();
        }).catch(err => {
            sendUserOfferWallUrl(session, consts.DEVICE_TYPE_DESKTOP, session.userData.sender.userId);
            console.log('error in getDeviceByUserId');
            console.log(err);            
        });
    }
]);

function sendUserOfferWallUrl(session, deviceType, userId) {
    session.send(offerWallLinkForUser(deviceType, userId));
}

function offerWallLinkForUser(deviceType, userId) {
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

    return `http://iframe.sponsorpay.com/?appid=${appId}&uid=${userId}`;
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