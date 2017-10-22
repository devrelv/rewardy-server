'use strict';
const MailTemplate = require('./mail-template');
const Consts = require('./const');

var mailTemplates = [];

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

/**
 * @param {string} templateId - from consts
 * @param {object} data - should be object with {key: 'STRING TO SEARCH', value: 'REPLACED STRING'}
 * @return {object} object as {subject, html, text}
 */
function getTemplate(templateId, data) {
    for (var i=0; i<mailTemplates.length; i++) {
        if (mailTemplates[i].getTemplateId() == templateId) {
            return mailTemplates[i].getTemplate(data);
        }
    }
}

module.exports = {
    getTemplate: getTemplate
}