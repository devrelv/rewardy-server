'use strict';
var hash = require('object-hash');
var uuid = require('uuid');
var consts = require('./consts.js');
const nodemailer = require('nodemailer');


function registerUserFromLink (db, req) {
    var referrerUserId = req.query.refId;
    var firstName = req.query.firstName;
    var lastName = req.query.lastName;
    var invitationId = req.query.invitationCode;
    var email = req.query.email;
    // Verifying the invitationId
    var generatedInvitationId = generateInvitationCode(firstName, lastName, email, referrerUserId);
    if (invitationId != generatedInvitationId) {
        return;
    }

    var name = (firstName + ' ' + lastName).trim();
    var id = uuid.v1();
    db.saveFriendReferralNewBotUser(id, name, email, referrerUserId);

}

function generateInvitationCode(firstName, lastName, email, referrerUserId) {
    return hash({firstName: firstName, lastName: lastName, email: email, referrerUserId: referrerUserId});
}

// TODO: Send the email with the invitation code
function sendEmailToReferral(req) {
    var referrerUserId = req.query.refId;
    var firstName = req.query.firstName;
    var lastName = req.query.lastName;
    var email = req.query.email;

    var invitationCode = generateInvitationCode(firstName, lastName, email, referrerUserId);

    // TODO: Insert the real email content
    var email_text = 'Please validate your email here: <a href="' + consts.SERVER_API_URL + 'register?refId=' + referrerUserId + 
                    '&email=' + email + '&firstName=' + firstName + '&lastName=' + lastName + '&invitationCode=' + invitationCode + '">Validate</a>';
    var email_html = 'Please validate your email here: <a href="' + consts.SERVER_API_URL + 'register?refId=' + referrerUserId + 
                    '&email=' + email + '&firstName=' + firstName + '&lastName=' + lastName + '&invitationCode=' + invitationCode + '">Validate</a>';
    sendCustomMail(email, 'Validate your email', email_text, email_html);
}

function sendCustomMail(toEmail, subject, text, html) {
    // create reusable transporter object using the default SMTP transport
    let transporter = nodemailer.createTransport({
        host: 'smtp.gmail.com',
        port: 465,
        secure: true, // true for 465, false for other ports
        auth: {
            user: consts.EMAIL_USERNAME, // generated ethereal user
            pass: consts.EMAIL_PASSWORD  // generated ethereal password
        }
    });

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

module.exports = {
    registerUserFromLink: registerUserFromLink,
    sendEmailToReferral: sendEmailToReferral
}