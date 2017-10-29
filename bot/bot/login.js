var builder = require('botbuilder');

var lib = new builder.Library('login');
var validators = require('./core/validators');
var utils = require('./core/utils');
var dal = require('./core/dal');
var consts = require('./core/const');
var uuid = require('uuid');


lib.dialog('/', [
    function (session) {
        session.send(session.gettext('welcome_message') + '\n\r' + session.gettext('type_email_or_return'));
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
    function (session, email) { 
        saveSenderSettingKey(session, 'email', email);
    }));

lib.dialog('userDetails', [
    function (session) { // TODO: ask the user to confirm his email in case of typo
        builder.Prompts.text(session, 'get_name');
    },
    function (session, result) {
        session.userData.sender.name = result.response;
        session.userData.sender.user_id = uuid.v1();
        session.userData.sender.language = session.userData.sender.language || consts.defaultUserLanguage;
        session.userData.sender.points = consts.defaultStartPoints;
        //saveSenderSettingFull(session, session.userData.sender); 
        dal.saveUserToDatabase(session.userData.sender);
        // Getting more info from user if needed using builder.Prompt.text(session, 'xxxxx');
        session.endDialogWithResult({ updated: true });
    }
]);


function saveSenderSettingKey(session, key, value) {
    session.userData.sender = session.userData.sender || {};
    session.userData.sender[key] = value;
}

function saveSenderSettingFull(session, userProfile) {
    session.userData.sender = userProfile;
}

function editOptionDialog(validationFunc, invalidMessage, saveFunc) {
    return new builder.SimpleDialog(function (session, args, next) {
        // check dialog was just forwarded
        if (!session.dialogData.loop) {
            session.dialogData.loop = true;
            session.sendBatch();
            return;
        }

        if (session.userData.sender && session.userData.sender.email) {
            session.endDialogWithResult({ updated: true });
            return;
        }

        if (!validationFunc(session.message.text)) {
            // invalid
            session.send(invalidMessage);
        } else {
            // save
            saveFunc(session, session.message.text);
            dal.getBotUserByEmail(session.message.text).then(userDataFromDB => {
                if (!userDataFromDB) {
                    saveSenderSettingKey(session, 'email', session.message.text);
                    
                    // Ask more questions about the user and save to DB + userData.sender
                    session.beginDialog('userDetails');
                } else {
                    session.userData.sender = userDataFromDB;
                    session.send(session.gettext('welcome_back', session.userData.sender.name));
                    session.endDialogWithResult({ updated: true });
                }
            
            }).catch(err => {
                session.send('error_occured_try_again');
                session.endDialogWithResult({ updated: false });
            });
          
        }
    });
}

// Export createLibrary() function
module.exports.createLibrary = function () {
    return lib.clone();
};