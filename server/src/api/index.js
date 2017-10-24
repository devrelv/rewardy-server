import { version } from '../../package.json';
import { Router } from 'express';

const request = require('request');
const monetizationHandler = require('./monetization-handler');
const consts = require('./consts');
const registration = require('./registration');

export default ({ config, db }) => {

	let api = Router();

	api.get('/', (req, res) => {
		res.json({ version });
	});
	api.get('/updateAllCredits', (req, res) => {
		monetizationHandler.updateAllCredits(db);
		res.send("Done");
	});
	api.get('/insertOffersToDB', (req, res) => {
		monetizationHandler.insertOffersToDB(db);
		res.send("Done");
	});

	/* Query Params
        id: the ID of this transaction, unique to this user event.
        uid: the ID of the user, that you passed us at the beginning of their session.
        oid: the numeric ID of the offer or payment method that they used.
        new: total number of new in-game currency that the user has earned by completing this event. This amount is calculated based on the VC Ratio that you set for this app.
        total: total number of in-game currency that this user has earned on this app.
        sig: the security hash that proves that this postback comes from us.
    */
	api.get('/postback/superrewards', (req, res) => {
		monetizationHandler.postback_superrewards(db, req);
		res.send("Done");
	});

	/*
		Query arguments:
		refId - reference user id
    	email - registered user email
    	firstName - registered user first name
    	lastName - registered user first name
    	invitationCode - the invitation code
	*/
	// TODO: Return the correct result on res (for error handling)
	api.get('/register', (req, res) => {
		registration.registerUserFromLink(db, req);
		res.send("Done");
	});

	/*
		Query arguments:
		refId - reference user id
    	email - registered user email
    	firstName - registered user first name
    	lastName - registered user first name
	*/
	// TODO: Return the correct result on res (for error handling)
	api.get('/sendReferalMail', (req,res) => {
		registration.sendEmailToReferral(req);
		res.send("Done");
	});

	return api;
}
