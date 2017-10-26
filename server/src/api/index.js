import { version } from '../../package.json';
import { Router } from 'express';

const request = require('request');
const monetizationHandler = require('./monetization-handler');
const consts = require('./consts');
const registration = require('./registration');
const logger = require('../logger');

export default ({ config, db }) => {

	let api = Router();

	api.get('/', (req, res) => {
		logger.log.debug('request to / made', {request: req});
		res.json({ version });
	});
	api.get('/updateAllCredits', (req, res) => {
		logger.log.debug('request to /updateAllCredits made', {request: req});
		monetizationHandler.updateAllCredits(db);
		res.send("Done");
	});
	api.get('/insertOffersToDB', (req, res) => {
		logger.log.debug('request to /insertOffersToDB made', {request: req});
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
		logger.log.debug('request to /postback/superrewards made', {request: req});
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
	api.get('/register', (req, res) => {
		logger.log.debug('request to /register made', {request: req});
		registration.registerUserFromLink(db, req).then(k => {
			res.send({result: "Success", info: "Done"}); // Redirect to success web page (with next steps)
		}).catch(err => {
			res.status(500).send({result: "Error", info: err}); // Redirect to "error occured" web page
		});
	});

	/*
		Query arguments:
		refId - reference user id
    	email - registered user email
    	firstName - registered user first name
    	lastName - registered user first name
	*/
	api.get('/sendReferalMail', (req,res) => {
		logger.log.debug('request to /sendReferalMail made', {request: req});
		registration.sendEmailToReferral(req).then(k=>{
			res.send({result: "Success", info: "Done"});
		}).catch(err => {
			res.status(500).send({result: "Error", info: err});
		});
	});

	return api;
}
