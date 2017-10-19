var builder = require('botbuilder');

var Promise = require('bluebird');
var Store = require('./store');
var dal = require('./core/dal');
var consts = require('./core/const');

var lib = new builder.Library('invite');


// TODO: Load locale + save & fetch device in the user data also after query (or in the login)
lib.dialog('/', [
    function (session) {
        dal.getInvitedFriendsByUserId(session.userData.sender.user_id).then(invitedFriends=> {
            if (invitedFriends.length == 0) {
                session.say(session.gettext('invite.no_invited_friends'));
            } else {
                session.say(session.gettext('invite.invited_friends {{numOfFirends}}').replace('{{numOfFriends}}', invitedFriends.length));                
            }
            session.say(session.gettext('invite.explanation {{numOfCredits}}').replace('{{numOfCredits}}', '50') + '\n\r' + session.gettext('invite.before_link'));
            session.say('http://someUrl.com?referrer=' + session.userData.sender.user_id);
        }).catch(err => {
            console.log('getInvitedFriendsByUserId error: ', err);
        });
    }
]);

// Export createLibrary() function
module.exports.createLibrary = function () {
    return lib.clone();
};