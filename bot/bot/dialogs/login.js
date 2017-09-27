var builder = require('botbuilder');

var lib = new builder.Library('login');
var validators = require('../validators');
var utils = require('../utils');

lib.dialog('/', [
    function (session) {
        session.send('type_email_or_return');
        return session.beginDialog('email');
    },
    function (session, args) {
        return session.endDialog();
    }
]);

// Email edit
lib.dialog('email', editOptionDialog(
    function (input) { return validators.EmailRegex.test(input); },
    'invalid_email_address',
    function (session, email) { saveSenderSetting(session, 'email', email); }));

function saveSenderSetting(session, key, value) {
    session.userData.sender = session.userData.sender || {};
    session.userData.sender[key] = value;
}

function editOptionDialog(validationFunc, invalidMessage, saveFunc) {
    return new builder.SimpleDialog(function (session, args, next) {
        // check dialog was just forwarded
        if (!session.dialogData.loop) {
            session.dialogData.loop = true;
            session.sendBatch();
            return;
        }

        if (!validationFunc(session.message.text)) {
            // invalid
            session.send(invalidMessage);
        } else {
            // save
            saveFunc(session, session.message.text);
            session.endDialogWithResult({ updated: true });
        }
    });
}

// Export createLibrary() function
module.exports.createLibrary = function () {
    return lib.clone();
};