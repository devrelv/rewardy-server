'use strict';
var hash = require('object-hash');
var uuid = require('uuid');
var consts = require('./consts.js');
const nodemailer = require('nodemailer');
var path = require('path');
var fs = require('fs');
const logger = require('../logger');
const serializeError = require('serialize-error');
const lightMailSender = require('./core/light-mail-sender');

function registerUserFromLink (db, req) {
    return new Promise((resolve, reject) => {        
        try {
            var referrerUserId = req.query.refId;
            var firstName = req.query.firstName;
            var lastName = req.query.lastName;
            var invitationId = req.query.invitationCode;
            var email = req.query.email;
            // Verifying the invitationId
            var generatedInvitationId = generateInvitationCode(firstName, lastName, email, referrerUserId);
            if (invitationId != generatedInvitationId) {
                logger.log.error('registerUserFromLink: incorrect invitation code', {data: {invitationId: invitationId, generatedInvitationId: generatedInvitationId}, request: req});
                reject("incorrect invitation code");
            }
    
            var name = (firstName + ' ' + lastName).trim();
            db.getBotUserByEmail(email).then(userFromDB => {
                if (userFromDB) {
                    logger.log.warn('registerUserFromLink: User with this email already exists', {email: email});
                    reject('User with this email already exists');
                } else {
                    // db.saveFriendReferralNewBotUser(id, name, email, referrerUserId).then(()=> {
                    //     resolve();
                    // }).catch(err => {
                    //     logger.log.error('registerUserFromLink: saveFriendReferralNewBotUser rejected', {error: serializeError(err), request: req});
                    //     reject(err)
                    // });
                    db.saveInvitation(referrerUserId, email).then(()=>{
                        resolve();
                    }).catch(err => {
                        logger.log.error('registerUserFromLink: saveInvitation rejected', {error: serializeError(err)});
                        reject(err);
                    });
                }
            }).catch(err => {
                logger.log.error('registerUserFromLink: getBotUserByEmail rejected', {error: serializeError(err)});
                reject(err)                
            })
            
        }
        catch (err) {
            logger.log.error('registerUserFromLink: error occured', {error: serializeError(err), request: req});
            reject(err);
        }
        
    });

}

function generateInvitationCode(firstName, lastName, email, referrerUserId) {
    return hash({firstName: firstName, lastName: lastName, email: email, referrerUserId: referrerUserId});
}

// TODO: Send the email with the invitation code
function sendEmailToReferral(req) {
    return new Promise((resolve, reject) => {
        try {
            var referrerUserId = req.query.refId;
            var firstName = req.query.firstName;
            var lastName = req.query.lastName;
            var email = req.query.email;
    
            var invitationCode = generateInvitationCode(firstName, lastName, email, referrerUserId);
    
            var inviteHtmlContent = fs.readFileSync(path.dirname(fs.realpathSync(__filename)) + '/../email_templates/email-verification.html', 'utf8');
            
            var verificationUrl = getVerificationUrl(referrerUserId, email, firstName, lastName, invitationCode);
            inviteHtmlContent = inviteHtmlContent.replace('%EMAIL_VERIFICATION_URL%', verificationUrl);
    
            lightMailSender.sendCustomMail(email, 'Rewardy - Email Verification', null, inviteHtmlContent).then(k=>{
                resolve();
            }).catch(error => {
                logger.log.error('sendEmailToReferral: sendCustomMail rejevted', {error: serializeError(error), request: req});
                reject(error);
            });
        }
        catch (ex) {
            logger.log.error('sendEmailToReferral: error occured', {error: ex, request: req});
            reject(ex);
        }        
    });
}

function getVerificationUrl(referrerUserId, email, firstName, lastName, invitationCode) {
    return process.env.SERVER_API_URL + 'register?refId=' + referrerUserId + 
    '&email=' + email + '&firstName=' + firstName + '&lastName=' + lastName + '&invitationCode=' + invitationCode
}

module.exports = {
    registerUserFromLink: registerUserFromLink,
    sendEmailToReferral: sendEmailToReferral
}