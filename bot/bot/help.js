var builder = require('botbuilder');

var lib = new builder.Library('help');
var validators = require('./core/validators');
var mailSender = require('./core/mail-sender.js');
var consts = require('./core/const');
const logger = require('./core/logger');
const serializeError = require('serialize-error');


// The dialog stack is cleared and this dialog is invoked when the user enters 'help'.
lib.dialog('/', [
    function (session) {
        builder.Prompts.confirm(session, session.gettext('help.intro'));
    },
    function (session, args, next) {
        try {
            if (args.response) {
                if (!session.userData.sender || !session.userData.sender.email) {
                    builder.Prompts.text(session, session.gettext('help.fill_email'));
                } else {
                    next();
                }
            } else {
                session.endDialog(session.gettext('help.no_help_needed'));
                session.replaceDialog('/');
            }
        } catch (err) {
            logger.log.error('help: / dialog, 2nd func error', {error: serializeError(err)});            
        }
    },
    function (session, args, next) {
        if (args.response) {
            session.replaceDialog('help_validate_email', args);
        } else {
            session.replaceDialog('help_get_user_message');
        }
    }
]);
//]).triggerAction({matches: /\bhelp\b/i,});

lib.dialog('help_get_user_message', [
    function (session) {
        builder.Prompts.text(session, session.gettext('help.email_confirmation {{email}}').replace('{{email}}', session.userData.sender.email) + '\n\r' + session.gettext('help.leave_question'));
    }, function (session, args) {
         session.privateConversationData = { userQuestion: args.response };
        builder.Prompts.confirm(session, session.gettext('help.confirm_sending'));
    }, function (session, args) {
        if (args.response) {
             // TODO: change yaari.tal@gmail.com to support email
            mailSender.sendTemplateMail(consts.MAIL_TEMPLATE_HELP_QUESTION, 'yaari.tal@gmail.com', 
                    [{key: '%USER_EMAIL%', value: session.userData.sender.email},
                    {key: '%DATE%', value: (new Date()).toUTCString()},
                    {key: '%USER_MESSAGE%', value: session.privateConversationData.userQuestion},
                    {key: '%USER_DETAILS%', value: JSON.stringify(session.userData.sender)}]).then (data =>
            {
                session.endDialog(session.gettext('help.message_received'));
                session.replaceDialog('/');
            }).catch (err => {
                logger.log.error('help: help_get_user_message dialog, 3rd func mailSender.sendTemplateMail error', {error: serializeError(err)});            
            
                session.say(session.gettext('help.error_sending_email'));
                session.replaceDialog('help_get_user_message');
            });
        } else {
            session.endDialog(session.gettext('help.cancelling'))
            session.replaceDialog('/');
    }
    }]);

// TODO: use locale for the messages
lib.dialog('help_validate_email', [
    function (session, args) {
        if (!args || !args.response) {
            builder.Prompts.text(session, 'help.fill_email');
        } else if (!validators.EmailRegex.test(args.response)) {
            builder.Prompts.text(session, 'help.no_valid_mail');            
        } else {
            session.userData.sender = session.userData.sender || {};
            session.userData.sender.email = args.response;
            session.replaceDialog('help_get_user_message');        
        }
    }, 
    function (session, args) {
        session.replaceDialog('help_validate_email', args);        
    }
]);


// Export createLibrary() function
module.exports.createLibrary = function () {
    return lib.clone();
};