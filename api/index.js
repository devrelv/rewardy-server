var version = require('../package.json');
var Router = require('express');

const request = require('request');
const monetizationHandler = require('./monetization-handler');
const consts = require('./consts');
const registration = require('./registration');
const voucher_redeem = require('./voucher-redeem');
const daily_bonus = require('./daily-bonus');

const logger = require('../logger');
const serializeError = require('serialize-error');

module.exports = ({ config, db }) => {

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

	/* 
		Query Params
        id: the ID of this transaction, unique to this user event.
        uid: the ID of the user, that you passed us at the beginning of their session.
        oid: the numeric ID of the offer or payment method that they used.
        new: total number of new in-game currency that the user has earned by completing this event. This amount is calculated based on the VC Ratio that you set for this app.
        total: total number of in-game currency that this user has earned on this app.
        sig: the security hash that proves that this postback comes from us.
    */
	api.get('/postback/superrewards', (req, res) => {
		logger.log.info('request to /postback/superrewards made', {request: req});
		monetizationHandler.postback_superrewards(db, req).then(()=> 
		{
			res.send('1');
		}).catch (err => 
		{ 
			res.send('0'); 
		});
		
	});

	/*
		Registration confirmation - the user will be here after clicking the confirm button on the validation email
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
			res.redirect('http://rewardy.co/steps.html');
		}).catch(err => {
			logger.log.error('error in /register', {request: req, error: serializeError(err)});						
			res.redirect('http://rewardy.co/wrong-invite.html');
		});
	});

	/*
		Send mail to referal - the invite.html page call this function after filling user details
		Query arguments:
		refId - reference user id
    	email - registered user email
    	firstName - registered user first name
    	lastName - registered user first name
	*/
	api.get('/sendReferalMail', (req,res) => {
		logger.log.debug('request to /sendReferalMail made', {request: req});
		registration.sendEmailToReferral(req).then(()=>{
			res.send({result: "Success", info: "Done"});
		}).catch(err => {
			res.status(500).send({result: "Error", info: err});
		});
	});

	/*
		Confirming the voucher redeem request by the user - the user will get here from the "voucher verification" email
		Query arguments:
		vid - confirmed voucher id
    	uid - confirming user id
    	userEmail - confirming user email address
    	code - verificationCode
	*/
	api.get('/confirm_voucher', (req, res) => {
		logger.log.debug('request to /confirm_voucher made', {request: req});
		voucher_redeem.confirm(db, req).then(() => {
			res.redirect('http://rewardy.co/voucher-success.html');
		}).catch(err => {
			logger.log.error('error in /confirm_voucher', {request: req, error: serializeError(err)});		
			res.redirect('http://rewardy.co/voucher-fail.html');
		});
	});

	/*
		Query arguments:
		uid - user id for checking & giving a daily bonus
	*/
	api.get('/daily_bonus', (req, res) => {
		logger.log.debug('request to /daily_bonus made', {request: req});
		daily_bonus.handleUser(db, req).then((result) => {
			res.send(result);
		}).catch(err => {
			logger.log.error('error in /daily_bonus', {request: req, error: serializeError(err)});			
			res.status(500).send({result: "Error", info: err});
		});
	});

	return api;
}
