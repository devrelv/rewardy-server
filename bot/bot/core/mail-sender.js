'use strict';
const nodemailer = require('nodemailer');
const mailTemplates = require('./mail-templates.js');

// create reusable transporter object using the default SMTP transport
let transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true, // true for 465, false for other ports
    auth: {
        user: process.env.EMAIL_USERNAME, // generated ethereal user
        pass: process.env.EMAIL_PASSWORD  // generated ethereal password
    }
});

function sendCustomMail(toEmail, subject, text, html) {
    var toEmailAsString;
    if (Array.isArray(toEmail)) {
        toEmailAsString = toEmail.join(',');
    } else {
        toEmailAsString = toEmail;
    }
    // setup email data with unicode symbols
    let mailOptions = {
        from: '"' + process.env.EMAIL_SENDER_NAME + '" <' + process.env.EMAIL_USERNAME + '>', // sender address
        to: toEmailAsString, // list of receivers
        subject: subject, // Subject line
        text: text, // plain text body
        html: html // html body
    };

    // send mail with defined transport object
    return new Promise((resolve, reject) => {
        transporter.sendMail(mailOptions, sendMailCallback);
        
        function sendMailCallback(error, info) {
            if (error) {
                // if using google - don't forget to enable less secure apps on google https://www.google.com/settings/security/lesssecureapps
                // return console.log(error);
                reject(error);
            } else {
                // console.log('Message sent: %s', info.messageId);
                // // Preview only available when sending through an Ethereal account
                // console.log('Preview URL: %s', nodemailer.getTestMessageUrl(info));
                resolve(info);
        
                // Message sent: <b658f8ca-6296-ccf4-8306-87d57a0b4321@blurdybloop.com>
                // Preview URL: https://ethereal.email/message/WaQKMgKddxQDoou...
            }
        }
    });
}

// data should be object with {key: 'STRING TO SEARCH', value: 'REPLACED STRING'}
function sendTemplateMail(templateId, toEmail, data) {
    return new Promise((resolve, reject) => {
        var mailData = mailTemplates.getTemplate(templateId, data);
        this.sendCustomMail(toEmail, mailData.subject, mailData.text, mailData.html).then(res => {
            resolve(res);            
        }).catch(err => {
            reject(err);
        });
    });
}


module.exports = {
    sendCustomMail: sendCustomMail,
    sendTemplateMail: sendTemplateMail,
};