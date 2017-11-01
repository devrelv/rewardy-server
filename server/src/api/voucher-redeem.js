'use strict';
var hash = require('object-hash');
const serializeError = require('serialize-error');
const logger = require('../logger');

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
                resolve();                
            }
        }
        catch (err) {
            logger.log.error('voucher-redeem: confirm error occured', {error: serializeError(err), request: req});
            reject(err);
        }
        
    });

}

function generateRedeemVerificationCode(voucherId, userId, userEmail) {
   return hash({voucherId: voucherId, userId: userId, email: userEmail});
}

module.exports = {
    confirm: confirm
}