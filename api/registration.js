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
const dal = require('../dal');

function registerUserFromLink (db, req) {
    return new Promise((resolve, reject) => {        
        try {
            var referrerUserId = req.query.refId;
            
            var invitationId = req.query.invitationCode;
            var email = req.query.email;
            var name = req.query.name;

            if (!name) {
                var firstName = req.query.firstName;
                var lastName = req.query.lastName;
                name = firstName + ' ' + lastName;
            }


            // Verifying the invitationId
            var generatedInvitationId = generateInvitationCode(name, email, referrerUserId);
            if (invitationId != generatedInvitationId) {
                logger.log.error('registerUserFromLink: incorrect invitation code', {error: 'registerUserFromLink: incorrect invitation code', data: {invitationId: invitationId, generatedInvitationId: generatedInvitationId}, request: req});
                reject("incorrect invitation code");
            }

            dal.getBotUserByEmail(email).then(userFromDB => {
                // dal.saveFriendReferralNewBotUser(id, name, email, referrerUserId).then(()=> {
                //     resolve();
                // }).catch(err => {
                //     logger.log.error('registerUserFromLink: saveFriendReferralNewBotUser rejected', {error: serializeError(err), request: req});
                //     reject(err)
                // });
                dal.saveInvitation(referrerUserId, email).then(()=>{
                    resolve();
                }).catch(err => {
                    logger.log.error('registerUserFromLink: saveInvitation rejected', {error: serializeError(err)});
                    reject(err);
                });
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

function generateInvitationCode(name, email, referrerUserId) {
    return hash({name: name, email: email, referrerUserId: referrerUserId});
}

// TODO: Send the email with the invitation code
function sendEmailToReferral(req) {
    return new Promise((resolve, reject) => {
        try {
            var referrerUserId = req.query.refId;
            
            var name = req.query.name;
            var email = req.query.email;

            if (!name) {
                var firstName = req.query.firstName;
                var lastName = req.query.lastName;
                name = firstName + ' ' + lastName;
            }
    
            var invitationCode = generateInvitationCode(name, email, referrerUserId);
    
            var inviteHtmlContent = fs.readFileSync(path.dirname(fs.realpathSync(__filename)) + '/../email_templates/email-verification.html', 'utf8');
            
            var verificationUrl = getVerificationUrl(referrerUserId, email, name, invitationCode);
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

function getVerificationUrl(referrerUserId, email, name, invitationCode) {
    return process.env.SERVER_API_URL + 'register?refId=' + referrerUserId + 
    '&email=' + encodeURIComponent(email) + '&name=' + encodeURIComponent(name) + '&invitationCode=' + invitationCode
}

module.exports = {
    registerUserFromLink: registerUserFromLink,
    sendEmailToReferral: sendEmailToReferral
}