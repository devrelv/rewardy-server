var builder = require('botbuilder');

var Promise = require('bluebird');
var dal = require('./core/dal');
var consts = require('./core/const');

var lib = new builder.Library('invite');
const logger = require('./core/logger');
const serializeError = require('serialize-error');
const back_to_menu = require('./back-to-menu');

// TODO: Load locale + save & fetch device in the user data also after query (or in the login)
lib.dialog('/', [
    function (session) {
        dal.getInvitedFriendsByUserId(session.userData.sender.user_id).then(invitedFriends=> {
            if (invitedFriends.length == 0) {
                session.say(session.gettext('invite.no_invited_friends'));
            } else {
                session.say(session.gettext('invite.invited_friends', invitedFriends.length));                
            }
            // TODO: Add the real amount of credits (instead of 50)
            session.say(session.gettext('invite.explanation', consts.referralBonusPoints, consts.minimumCompletedOffersForReferalToCount) + '\n\r' + session.gettext('invite.before_link'));
            // TODO: Change the URL from someUrl.com to the real one (when available)
            session.say('http://rewardy.co/invite.html?referrer=' + session.userData.sender.user_id);
            back_to_menu.sendBackToMainMenu(session, builder);            
        }).catch(err => {
            logger.log.debug('invite calling getInvitedFriendsByUserId error', {error: serializeError(err)});
            back_to_menu.sendBackToMainMenu(session, builder);            
        });
    }
]);

// Export createLibrary() function
module.exports.createLibrary = function () {
    return lib.clone();
};