'use strict';
const MailTemplate = require('./mail-template');
const Consts = require('./const');

var mailTemplates = [];

// Generating Templates
// TODO: Change the content
// TODO: Integrate locale
var welcomeTemplate = new MailTemplate(Consts.MAIL_TEMPLATE_WELCOME, 'redeem.mail.welcome_subject', 'redeem.mail.welcome_html', 'redeem.mail.welcome_text');
mailTemplates.push(welcomeTemplate);

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