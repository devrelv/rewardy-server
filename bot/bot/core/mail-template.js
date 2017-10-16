'use strict';
const clone = require('clone');

function MailTemplate(templateId, subject, html, text) {
    this.templateId = templateId;
    this.subject = subject ? subject : '';
    this.html = html ? html : '';
    this.text = text ? text : '';
}
MailTemplate.prototype.setSubject = function (subject) {
    this.subject = subject ? subject : '';
}
MailTemplate.prototype.setHtml = function (html) {
    this.html = html ? html : '';
}

MailTemplate.prototype.setText = function (text) {
    this.text = text ? text : '';
}

MailTemplate.prototype.getTemplate = function (data) {
    var customizedHtml = clone(this.html);
    var customizedText = clone(this.text);
    var customizedSubject = clone(this.subject);
    for (var i=0; data && i<data.length; i++) {
        customizedHtml = customizedHtml.replace(new RegExp(data[i].key, 'g'), data[i].value);
        customizedText = customizedText.replace(new RegExp(data[i].key, 'g'), data[i].value);
        customizedSubject = customizedSubject.replace(new RegExp(data[i].key, 'g'), data[i].value);
    }
    return {subject: customizedSubject, html: customizedHtml, text: customizedText};
}

MailTemplate.prototype.getTemplateId = function () {
    return this.templateId;
}

module.exports = MailTemplate;