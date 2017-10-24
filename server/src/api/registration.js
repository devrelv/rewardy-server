'use strict';
var hash = require('object-hash');
var uuid = require('uuid');
// var url = require('url');


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
function sendEmailToReferral(firstName, lastName, email, referrerUserId) {
    var invitationCode = generateInvitationCode(firstName, lastName, email, referrerUserId);
}

module.exports = {
    registerUserFromLink: registerUserFromLink
}