var builder = require('botbuilder');

var lib = new builder.Library('redeem');
var Promise = require('bluebird');
var Store = require('./store');
const logger = require('./core/logger');
const serializeError = require('serialize-error');
const back_to_menu = require('./back-to-menu');
var mailSender = require('./core/mail-sender.js');
var consts = require('./core/const');
var hash = require('object-hash');
const chatbase = require('./core/chatbase');

// Helpers
function voucherAsAttachment(voucher, session) {
    try {
        return new builder.HeroCard()
        .title(voucher.title)
        .subtitle(voucher.description)
        .images([new builder.CardImage().url(voucher.imageUrl)])
        .buttons([
            // new builder.CardAction()
            //     .title(voucher.cta)
            //     .type('postBack')
            //     .value('https://www.bing.com/search?q=hotels+in+' + encodeURIComponent(voucher.points))
            builder.CardAction.imBack(session, getVoucherText(voucher), voucher.cta)
        ]);
    }
    catch (err) {
        logger.log.error('redeem: voucherAsAttachment error occured', {error: serializeError(err), voucher: voucher});        
        throw err;
    }
    
}

function getVoucherText(voucher) {
    return 'voucher #' + voucher.voucherId + ': ' + voucher.title + ' on ' + voucher.store + ' for ' + voucher.cta;
}

let vouchersData = [];

lib.dialog('/', [
    // Destination
    function (session) {
        try {
            chatbase.sendSingleMessage(chatbase.CHATBASE_TYPE_FROM_BOT, session.userData.sender ? session.userData.sender.user_id : 'unknown', session.message.source, session.gettext('redeem.select_voucher'), null, false, false);                                                    
            session.send('redeem.select_voucher');
            
            // Async fetch
            Store
                .fetchVouchers()
                .then(function (vouchers) {
                    for (var i=0; i<vouchers.length; i++) {
                        vouchersData[vouchers[i].voucherId] = vouchers[i];
                    }
                    var message = new builder.Message()
                        .attachmentLayout(builder.AttachmentLayout.carousel)
                        .attachments(vouchers.map((voucher) => { return voucherAsAttachment(voucher, session); }));
    
                    chatbase.sendSingleMessage(chatbase.CHATBASE_TYPE_FROM_BOT, session.userData.sender ? session.userData.sender.user_id : 'unknown', session.message.source, 'Redeem Vouchers Selection', null, false, false);                                                   
                    builder.Prompts.text(session, message);

                    // Getting back to menu option:
                    // TODO: Replace "Back To Menu" and "Or get back to main menu" with 'redeem.back_to_menu_user_text' and 'redeem.back_to_menu_displayed'
                    var cardActions = [builder.CardAction.imBack(session, 'Back To Menu', 'Or get back to main menu')];
                    
                    var card = new builder.HeroCard()
                        .title()
                        .buttons(cardActions);
                
                    chatbase.sendSingleMessage(chatbase.CHATBASE_TYPE_FROM_BOT, session.userData.sender ? session.userData.sender.user_id : 'unknown', session.message.source, 'Back To Menu' , null, false, false);            
                        
                    session.send(new builder.Message(session)
                        .addAttachment(card));
                });
        }
        catch (err){
            logger.log.error('redeem: / dialog error occured', {error: serializeError(err)});        
            throw err;
        }
    }, function (session, args) {
        try {
            
            if (args.response == session.gettext('redeem.back_to_menu_user_text')) {
                chatbase.sendSingleMessage(chatbase.CHATBASE_TYPE_FROM_USER, session.userData.sender.user_id, session.message.source, session.message.text, 'Back To Menu', false, false);
                
                session.endDialog();
                session.replaceDialog('/');
            }
            else {
                // look for the voucher:
                var voucherId = args.response.split(':')[0].split('#')[1];
                var selectedVoucher = vouchersData[voucherId];
                if (!selectedVoucher) {
                    throw "voucher " + voucherId + " not found";
                }
                chatbase.sendSingleMessage(chatbase.CHATBASE_TYPE_FROM_USER, session.userData.sender.user_id, session.message.source, session.message.text, 'Voucher Redeem Request', false, false);
                
                
                if (session.userData.sender.points < selectedVoucher.points) {
                    // Not enough points
                    chatbase.sendSingleMessage(chatbase.CHATBASE_TYPE_FROM_BOT, session.userData.sender ? session.userData.sender.user_id : 'unknown', session.message.source, session.gettext('redeem.not_enought_points', session.userData.sender.points, selectedVoucher.points-session.userData.sender.points), null, false, false);                                                                   
                    session.say(session.gettext('redeem.not_enought_points', session.userData.sender.points, selectedVoucher.points-session.userData.sender.points));
                    back_to_menu.sendBackToMainMenu(session, builder);
                } else {
                    // Continue with the redeem process - send validation email
                    chatbase.sendSingleMessage(chatbase.CHATBASE_TYPE_FROM_BOT, session.userData.sender ? session.userData.sender.user_id : 'unknown', session.message.source, session.gettext('redeem.explanation'), null, false, false);                                                                                   
                    session.say('redeem.explanation');
                    mailSender.sendTemplateMail(consts.MAIL_TEMPLATE_REDEEM_CONFIRMATION, session.userData.sender.email, 
                            [{key: '%VOUCHER_ID%', value: selectedVoucher.voucherId},
                            {key: '%VOUCHER_TITLE%', value: selectedVoucher.title},
                            {key: '%VOUCHER_STORE%', value: selectedVoucher.store},
                            {key: '%VOUCHER_CTA%', value: selectedVoucher.cta},
                            {key: '%VOUCHER_IMAGE_URL%', value: selectedVoucher.imageUrl},
                            {key: '%REDEEM_CONFIRMATION_URL%', value: get_redeem_confirmation_url(selectedVoucher, session.userData.sender.user_id, session.userData.sender.email)},
                        ]).then(() => {
                        chatbase.sendSingleMessage(chatbase.CHATBASE_TYPE_FROM_BOT, session.userData.sender ? session.userData.sender.user_id : 'unknown', session.message.source, session.gettext('redeem.email_sent', session.userData.sender.email), null, false, false);                                                                                   
                        session.say(session.gettext('redeem.email_sent', session.userData.sender.email));
                        back_to_menu.sendBackToMainMenu(session, builder);
                        
                    }).catch(err => {
                        logger.log.error('redeem: / dialog 2nd function on mailSender.sendTemplateMail error', {error: serializeError(err)});
                        chatbase.sendSingleMessage(chatbase.CHATBASE_TYPE_FROM_BOT, session.userData.sender ? session.userData.sender.user_id : 'unknown', session.message.source, session.gettext('redeem.email_error'), null, false, false);                                                                                                       
                        session.say('redeem.email_error');
                        back_to_menu.sendBackToMainMenu(session, builder);
                        
                    });
                }
            }
        }
        catch (err) {
            chatbase.sendSingleMessage(chatbase.CHATBASE_TYPE_FROM_USER, session.userData.sender.user_id, session.message.source, session.message.text, null, true, false);            
            chatbase.sendSingleMessage(chatbase.CHATBASE_TYPE_FROM_BOT, session.userData.sender ? session.userData.sender.user_id : 'unknown', session.message.source, session.gettext('redeem.general_error'), null, false, false);                                                                                                                   
            session.say('redeem.general_error');
            logger.log.error('redeem: / dialog 2nd function error occured', {error: serializeError(err)});        
            session.endDialog();
            session.replaceDialog('/');
        }
    }
]);

function get_redeem_confirmation_url(voucher, userId, userEmail) {
     
    var verificationCode = hash({voucherId: voucher.voucherId, userId: userId, email: userEmail});
    return consts.SERVER_API_URL + 'confirm_voucher?vid=' + voucher.voucherId + '&uid=' + userId + '&userEmail=' + userEmail + '&code=' + verificationCode;
}

// Export createLibrary() function
module.exports.createLibrary = function () {
    return lib.clone();
};