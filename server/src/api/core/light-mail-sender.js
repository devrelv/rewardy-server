'use strict';
const nodemailer = require('nodemailer');
const logger = require('../../logger');
const serializeError = require('serialize-error');
const consts = require('../consts');

function sendCustomMail(toEmail, subject, text, html) {
    return new Promise((resolve, reject) => {
        try {
            var toEmailAsString;
            if (Array.isArray(toEmail)) {
                toEmailAsString = toEmail.join(',');
            } else {
                toEmailAsString = toEmail;
            }
            // setup email data with unicode symbols
            let mailOptions = {
                from: '"' + consts.EMAIL_SENDER_NAME + '" <' + consts.EMAIL_USERNAME + '>', // sender address
                to: toEmailAsString, // list of receivers
                subject: subject, // Subject line
                text: text, // plain text body
                html: html // html body
            };
    
            // create reusable transporter object using the default SMTP transport
            let transporter = nodemailer.createTransport({
                host: 'smtp.zoho.com',
                port: 465,
                secure: true, // true for 465, false for other ports
                auth: {
                    user: consts.EMAIL_USERNAME, // generated ethereal user
                    pass: consts.EMAIL_PASSWORD  // generated ethereal password
                }
            });
            transporter.sendMail(mailOptions, sendMailCallback);
            
            function sendMailCallback(err, info) {
                if (err) {
                    // if using google - don't forget to enable less secure apps on google https://www.google.com/settings/security/lesssecureapps
                    logger.log.error('light-mail-sender: sendCustomMail sendMailCallback error', {error: serializeError(err), arguments: {toEmail: toEmail, subject: subject, text: text, html: html}});            
                    reject(err);
                } else {
                    // console.log('Message sent: %s', info.messageId);
                    // // Preview only available when sending through an Ethereal account
                    // console.log('Preview URL: %s', nodemailer.getTestMessageUrl(info));
                    resolve(info);
            
                    // Message sent: <b658f8ca-6296-ccf4-8306-87d57a0b4321@blurdybloop.com>
                    // Preview URL: https://ethereal.email/message/WaQKMgKddxQDoou...
                }
            }
        }
        catch (err) {
            logger.log.error('light-mail-sender: sendCustomMail error occured', {error: serializeError(err), arguments: {toEmail: toEmail, subject: subject, text: text, html: html}});
            throw err;
        }
        
    });
}


module.exports = {
    sendCustomMail: sendCustomMail,
};