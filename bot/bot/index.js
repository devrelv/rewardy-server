var builder = require('botbuilder');
var siteUrl = require('./core/site-url');
var dal = require('./core/dal');
var consts = require('./core/const');
var mailSender = require('./core/mail-sender.js');
const logger = require('./core/logger');
const serializeError = require('serialize-error');
const chatbase = require('./core/chatbase');

logger.log.info('Bot started');

var connector = new builder.ChatConnector({
    appId: process.env.MICROSOFT_APP_ID,
    appPassword: process.env.MICROSOFT_APP_PASSWORD
});

// Mail sending tests
// mailSender.sendCustomMail('yaari.tal@gmail.com', 'Test Mail', 'test mail', '<b>Test</b> Mail');
// mailSender.sendTemplateMail(consts.MAIL_TEMPLATE_WELCOME, 'yaari.tal@gmail.com', [{key: '%NAME%', value: 'Tal'}]);

// Welcome Dialog
var MainOptions = {
    CheckCredit: 'keyboard.root.checkCredit',
    Redeem: 'keyboard.root.redeem',
    InviteFriends: 'keyboard.root.inviteFriends',
    GetCredit: 'keyboard.root.getCredit',
    Help: 'keyboard.root.help'
};
function createRootButtons(session, builder) {
    chatbase.sendSingleMessage(chatbase.CHATBASE_TYPE_FROM_BOT, session.userData.sender ? session.userData.sender.user_id : 'unknown', session.message.source, 'Main Menu Options', null, false, false);

    return [
        builder.CardAction.imBack(session, session.gettext(MainOptions.CheckCredit), MainOptions.CheckCredit),
        builder.CardAction.imBack(session, session.gettext(MainOptions.GetCredit), MainOptions.GetCredit),
        builder.CardAction.imBack(session, session.gettext(MainOptions.InviteFriends), MainOptions.InviteFriends),
        builder.CardAction.imBack(session, session.gettext(MainOptions.Redeem), MainOptions.Redeem),
        builder.CardAction.imBack(session, session.gettext(MainOptions.Help), MainOptions.Help)
    ];
}

function sendRootMenu(session, builder) {
    var card = new builder.HeroCard()
        .title(session.gettext('main.root.title'))
        .buttons(createRootButtons(session, builder));

    session.send(new builder.Message(session)
        .addAttachment(card));
}

var bot = new builder.UniversalBot(connector, [
    function (session, args, next) {
        // We already have email. Just skip to the root menu
        if (session.userData.sender && session.userData.sender.email) {
            return next();
        }

        return session.beginDialog('login:/');
    },
    function (session, args, next) {
        try {
            if (localizedRegex(session, [MainOptions.Redeem]).test(session.message.text)) {
                // chatbase.sendSingleMessage(chatbase.CHATBASE_TYPE_FROM_USER, session.userData.sender.user_id, session.message.source, session.message.text, 'Goto Redeem Flow', false, false);
                chatbase.sendSingleMessage(chatbase.CHATBASE_TYPE_FROM_USER, session.userData.sender.user_id, session.message.source, session.message.text, 'Goto Redeem Flow', false, false);
                // Redeem flow
                return session.beginDialog('redeem:/');
            } else if (localizedRegex(session, [MainOptions.CheckCredit]).test(session.message.text)) {
                // Check Credits flow
                chatbase.sendSingleMessage(chatbase.CHATBASE_TYPE_FROM_USER, session.userData.sender.user_id, session.message.source, session.message.text, 'Goto Check Credits Flow', false, false);
                return session.beginDialog('check-credits:/');            
            } else if (localizedRegex(session, [MainOptions.GetCredit]).test(session.message.text)) {
                // Get Free Credits flow
                chatbase.sendSingleMessage(chatbase.CHATBASE_TYPE_FROM_USER, session.userData.sender.user_id, session.message.source, session.message.text, 'Goto Get Free Credits Flow', false, false);
                return session.beginDialog('get-free-credits:/');            
            } else if (localizedRegex(session, [MainOptions.InviteFriends]).test(session.message.text)) {
                // Invite Friends flow
                chatbase.sendSingleMessage(chatbase.CHATBASE_TYPE_FROM_USER, session.userData.sender.user_id, session.message.source, session.message.text, 'Goto Invite Friends Flow', false, false);
                return session.beginDialog('invite:/');            
            } else if (localizedRegex(session, [MainOptions.Help]).test(session.message.text)) {
                // Help flow
                chatbase.sendSingleMessage(chatbase.CHATBASE_TYPE_FROM_USER, session.userData.sender.user_id, session.message.source, session.message.text, 'Goto Help Flow', false, false);
                return session.beginDialog('help:/');            
            } else if (session.message.text.length > 0) {
                if (session.message.text != 'Get back to menu') {
                    // User typed something that we can't understand
                    chatbase.sendSingleMessage(chatbase.CHATBASE_TYPE_FROM_USER, session.userData.sender.user_id, session.message.source, session.message.text, null, true, false);
                } else {
                    chatbase.sendSingleMessage(chatbase.CHATBASE_TYPE_FROM_USER, session.userData.sender.user_id, session.message.source, session.message.text, 'Get Back To Menu', false, false);
                    
                }
            }
    
            var welcomeCard = new builder.HeroCard(session)
                .title('welcome_title')
                .subtitle(session.gettext('welcome_subtitle', session.userData.sender.name))
                .buttons(createRootButtons(session, builder));
    
            session.send(new builder.Message(session)
                .addAttachment(welcomeCard));
        }
        catch (err) {
            logger.log.error('index: builder.UniversalBot error occured', {error: serializeError(err)});
            throw err;            
        }
        
    }

]);


 

// Enable Conversation Data persistence
bot.set('persistConversationData', true);

// Set default locale
bot.set('localizerSettings', {
    botLocalePath: './bot/locale',
    defaultLocale: 'en'
});

// Sub-Dialogs
bot.library(require('./shop').createLibrary());
bot.library(require('./product-selection').createLibrary());
bot.library(require('./delivery').createLibrary());
bot.library(require('./details').createLibrary());
bot.library(require('./checkout').createLibrary());
bot.library(require('./settings').createLibrary());
bot.library(require('./help').createLibrary());
bot.library(require('./login').createLibrary());
bot.library(require('./redeem').createLibrary());
bot.library(require('./check-credits').createLibrary());
bot.library(require('./get-free-credits').createLibrary());
bot.library(require('./invite').createLibrary());
bot.library(require('./help').createLibrary());

// Validators
bot.library(require('./core/validators').createLibrary());

// Send welcome when conversation with bot is started, by initiating the root dialog
bot.on('conversationUpdate', function (message) {
    if (message.membersAdded) {
        logger.log.info('conversation started', {members: message.membersAdded});
        
        message.membersAdded.forEach(function (identity) {
            if (identity.id === message.address.bot.id) {
                bot.beginDialog(message.address, '/');
            }
        });
    }
});

// Cache of localized regex to match selection from main options
var LocalizedRegexCache = {};
function localizedRegex(session, localeKeys) {
    try {
        var locale = session.preferredLocale();
        var cacheKey = locale + ":" + localeKeys.join('|');
        if (LocalizedRegexCache.hasOwnProperty(cacheKey)) {
            return LocalizedRegexCache[cacheKey];
        }
    
        var localizedStrings = localeKeys.map(function (key) { return session.localizer.gettext(locale, key); });
        var regex = new RegExp('^(' + localizedStrings.join('|') + ')', 'i');
        LocalizedRegexCache[cacheKey] = regex;
        return regex;
    } 
    catch (err) {
        logger.log.error('index: localizedRegex error occured', {error: serializeError(err)});
        throw err;        
    }
    
}

// Connector listener wrapper to capture site url
var connectorListener = connector.listen();
function listen() {
    return function (req, res) {
        // Capture the url for the hosted application
        // We'll later need this url to create the checkout link
        var url = req.protocol + '://' + req.get('host');
        siteUrl.save(url);
        connectorListener(req, res);
    };
}

// Other wrapper functions
function beginDialog(address, dialogId, dialogArgs) {
    bot.beginDialog(address, dialogId, dialogArgs);
}

function sendMessage(message) {
    bot.send(message);
}

module.exports = {
    listen: listen,
    beginDialog: beginDialog,
    sendMessage: sendMessage
};
