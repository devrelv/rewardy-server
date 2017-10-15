var builder = require('botbuilder');

var lib = new builder.Library('check-credits');
var Promise = require('bluebird');
var Store = require('./store');

// TODO: Load the locale
lib.dialog('/', [
    function (session) {
        session.say(session.gettext('checkCredit.loading'));
        messageText = session.gettext('checkCredit.response {{points}}').replace('{{points}}', session.userData.sender.points);
        session.say(messageText);
        session.endDialog(session.gettext('general.type_to_menu'));
    }
]);


// Export createLibrary() function
module.exports.createLibrary = function () {
    return lib.clone();
};