'use strict';
const MailTemplate = require('./mail-template');
const Consts = require('./const');
const logger = require('./logger');
const serializeError = require('serialize-error');
var fs = require('fs');

var mailTemplates = [];
try {
    
    // Generating Templates
    // TODO: Change the content
    // TODO: Integrate locale
    var welcomeTemplate = new MailTemplate(Consts.MAIL_TEMPLATE_WELCOME, 'redeem.mail.welcome_subject', 'redeem.mail.welcome_html', 'redeem.mail.welcome_text');
    mailTemplates.push(welcomeTemplate);
    //var helpTemplate = new MailTemplate(Consts.MAIL_TEMPLATE_HELP_QUESTION, 'redeem.mail.help_subject', 'redeem.mail.help_html', 'redeem.mail.help_text');
    // TODO: Use above line after integrating with locale
    var helpTemplate = new MailTemplate(Consts.MAIL_TEMPLATE_HELP_QUESTION, 'User Question %USER_EMAIL%', 
                'This is the user as sent by the user at %DATE%:<br/><b>%USER_MESSAGE%</b><br/><br/>User Details:<br/>%USER_DETAILS%',
                'This is the user as sent by the user at %DATE%: %USER_MESSAGE%    User Details:  %USER_DETAILS%');
    mailTemplates.push(helpTemplate);

    var redeem_confirm_content = fs.readFileSync('./bot/email_templates/redeem_confirm.html', 'utf8');

    // %VOUCHER_TITLE%, %VOUCHER_STORE%, %VOUCHER_CTA%, %VOUCHER_IMAGE_URL%, %REDEEM_CONFIRMATION_URL%
    var redeem_confirm = new MailTemplate(Consts.MAIL_TEMPLATE_REDEEM_CONFIRMATION, 'Rewardy Voucher Confirmation', redeem_confirm_content,redeem_confirm_content);
    mailTemplates.push(redeem_confirm);
}
catch (err) {
    logger.log.error('mail-templates: noScope error occured', {error: serializeError(err)});
    throw err;
}

/**
 * @param {string} templateId - from consts
 * @param {object} data - should be object with {key: 'STRING TO SEARCH', value: 'REPLACED STRING'}
 * @return {object} object as {subject, html, text}
 */
function getTemplate(templateId, data) {
    try {
        for (var i=0; i<mailTemplates.length; i++) {
            if (mailTemplates[i].getTemplateId() == templateId) {
                return mailTemplates[i].getTemplate(data);
            }
        }
    } catch (err) {
        logger.log.error('mail-templates: noScope error occured', {error: serializeError(err), arguments: {templateId: templateId, data: data}});    
        throw err;
    }
}

module.exports = {
    getTemplate: getTemplate
}