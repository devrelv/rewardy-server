var builder = require('botbuilder');

var lib = new builder.Library('check-credits');
var Promise = require('bluebird');
const logger = require('./core/logger');
const serializeError = require('serialize-error');
const consts = require('./core/const');
const back_to_menu = require('./back-to-menu');

// TODO: Load the locale
lib.dialog('/', [
    function (session) {
        try {
            if (!session.userData.sender.points) {
                session.userData.sender.points = consts.defaultStartPoints;
            }
            session.say(session.gettext('checkCredit.response', session.userData.sender.points));
            back_to_menu.sendBackToMainMenu(session, builder);
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