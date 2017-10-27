var builder = require('botbuilder');

var lib = new builder.Library('check-credits');
var Promise = require('bluebird');
const logger = require('./core/logger');
const serializeError = require('serialize-error');

// TODO: Load the locale
lib.dialog('/', [
    function (session) {
        try {
            messageText = session.gettext('checkCredit.response {{points}}').replace('{{points}}', session.userData.sender.points);
            session.say(messageText);
            session.endDialog(session.gettext('general.type_to_continue'));
        } catch (err) {
            logger.log.error('check-credits: error occured', {error: serializeError(err)});
            throw err;
        }
        
    }
]);


// Export createLibrary() function
module.exports.createLibrary = function () {
    return lib.clone();
};