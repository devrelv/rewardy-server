'use strict';
var hash = require('object-hash');
const serializeError = require('serialize-error');
const logger = require('../logger');
const lightMailSender = require('./core/light-mail-sender');
const consts = require('./consts');
const dal = require('../dal');

/*
    Query arguments:
    vid - confirmed voucher id
    uid - confirming user id
    userEmail - confirming user email address
    code - verificationCode
*/
function confirm (db, req) {
    return new Promise((resolve, reject) => {        
        try {
            var userId = req.query.uid;
            var voucherId = req.query.vid;
            var email = req.query.userEmail;
            var verificationCode = req.query.code;
            // Verifying the invitationId
            var generatedInvitationId = generateRedeemVerificationCode(voucherId, userId, email);
            if (verificationCode != generatedInvitationId) {
                logger.log.warn('confirm: incorrect invitation code!', {request: req});
                console.log('voucher-redeem confirm: incorrect invitation code', {request: req});
                reject("incorrect invitation code");
            } else {
                sendMailToAdmins(voucherId, userId, email).then(()=>{
                    resolve();                    
                }).catch(err => {
                    logger.log.error('voucher-redeem: confirm sendMailToAdmins error occured', {error: serializeError(err), request: req});
                    reject(err);
                })
            }
        }
        catch (err) {
            logger.log.error('voucher-redeem: confirm error occured', {error: serializeError(err), request: req});
            reject(err);
        }
        
    });

}

function generateRedeemVerificationCode(voucherId, userId, email) {
   return hash({voucherId: voucherId, userId: userId, email: email});
}

function sendMailToAdmins(voucherId, userId, email) {
    return new Promise((resolve, reject) => {       
        try {
            var html = 'User confirmed his voucher, Please generate the voucher and send it to him.<br/><br/>Voucher Id: ' + voucherId + 
            '<br/><br/>User details:<br/>User Id: ' + userId + '<br/>User Email: ' + email;
            
            lightMailSender.sendCustomMail(consts.EMAIL_VOUCHERS_GENERETOR, 'ACTION REQUIRED: Voucher Redeem Confirmed by ' + email, null, html).then(()=>{
                resolve();
            }).catch(err => {
                logger.log.error('voucher-redeem: sendMailToAdmins lightMailSender.sendCustomMail error occured', {error: serializeError(err)});
                reject(err);
            });
            
        } catch (err) {
            logger.log.error('voucher-redeem: sendMailToAdmins error occured', {error: serializeError(err)});            
            reject(err);
        }
    });        
    
}

/*
    uid = userId
    vid = voucherId
    points = points
    request_date
    issue_date
    voucher_reference_data 
*/
function pushVoucherRedeem(req) {
    return new Promise((resolve, reject) => {           
        try {
            let userId = req.query.uid;
            let voucherId = req.query.vid;
            let points = req.query.points;
            let requestDate = req.query.request_date;
            let issueDate = req.query.issue_date;
            let voucherReferenceData = "";
            if (req.query.voucher_reference_data) {
                voucherReferenceData = JSON.parse(req.query.voucher_reference_data);
            }
    
            dal.pushVoucherRedeem(userId, voucherId, points, requestDate, issueDate, voucherReferenceData).then(()=>{
                resolve();
            }).catch(err => {
                logger.log.error('pushVoucherRedeem: dal.pushVoucherRedeem error occured', {error: serializeError(err)});
                reject(err);
            })
        }
        catch (err) {
            logger.log.error('pushVoucherRedeem: error occured', {error: serializeError(err)});            
            reject(err);
        }
    });
}

module.exports = {
    confirm: confirm,
    pushVoucherRedeem
}