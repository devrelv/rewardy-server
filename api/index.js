var version = require('../package.json');
var Router = require('express');

const request = require('request');
const monetizationHandler = require('./monetization-handler');
const consts = require('./consts');
const registration = require('./registration');
const voucher_redeem = require('./voucher-redeem');
const daily_bonus = require('./daily-bonus');
const backup_service = require('./backup-service');

const logger = require('../logger');
const serializeError = require('serialize-error');

module.exports = ({ config, db }) => {

	let api = Router();

	api.get('/', (req, res) => {
		logger.log.debug('request to / made', {request: req});
		res.send("Alive");
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
		Query Params
        uid: the user id in rewardy's system
        currency: number of points to add to the user
        type: type of postback (0 - Regular payment/offer completion ; 1 - Product/Virtual Currency is given by customer service ; 2 - Chargeback by customer service)
        ref: Transaction reference ID, alphanumeric (max length: 11)
        sig: the security hash that proves that this postback comes from us.
    */
	api.get('/postback/offerwall', (req, res) => {
		logger.log.info('request to /postback/offerwall made', {request: req});
		monetizationHandler.postback_offerwall(db, req).then(()=> 
		{
			res.send('OK');
		}).catch (err => 
		{ 
			res.send('ERROR OCCURED'); 
		});
		
	});

	/* 
		Query Params
        uid: the user id in rewardy's system
        points: number of points to add to the user
        oid: Id of the offer that was completed
		sig: the security hash that proves that this postback comes from us.
		payout: payout amount from applify
    */
	api.get('/postback/applift', (req, res) => {
		logger.log.info('request to /postback/applift made', {request: req});
		monetizationHandler.postback_applift(req).then(()=> 
		{
			res.send('OK');
		}).catch (err => 
		{ 
			res.status(500).send({result: "Error", info: err});
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

	api.get('/backup_db', (req, res) => {
		logger.log.debug('request to /backup_db made', {request: req});
		backup_service.backupDb(req).then(() => {
			res.send('DONE');
		}).catch(err => {
			logger.log.error('error in /daily_bonus', {request: req, error: serializeError(err)});			
			res.send("Error Occured: " + JSON.stringify(err));
		});
	})

	api.get('/remove_all_backup_files', (req, res) => {
		logger.log.debug('request to /remove_all_backup_files made', {request: req});
		backup_service.removeAllBackupFiles(req).then(() => {
			res.send('DONE');
		}).catch(err => {
			res.send(JSON.stringify(err));
		});
	})

	api.get('/get_user_by_id', (req, res) => {
		monetizationHandler.getBotUserById(req).then(user => {
			res.json(user);
		}).catch(err => {
			logger.log.error('error in /get_user_by_id', {request: req, error: serializeError(err)});			
			res.send("Error Occured: " + JSON.stringify(err));
		})
	})

	api.get('/update_user_email', (req, res) => {
		monetizationHandler.updateUserEmail(req).then(() => {
			res.json({result: 'Success'});
		}).catch(err => {
			logger.log.error('error in /update_user_email', {request: req, error: serializeError(err)});			
			res.json({result: 'Error', error: "Error Occured: " + JSON.stringify(err)});
		})
	})

	/*
		Query arguments:
		partner - partner Id (i.e Applift)
		uid - Rewardy user Id
		[ OPTIONAL: stub - use stub data (0 default OR 1)]
	*/
	api.get('/get_offers', (req, res) => {
		logger.log.debug('request to /get_offers made', {request: req});
		monetizationHandler.getAvailableOffers(req).then((result) => {
			res.json(result);
		}).catch(err => {
			logger.log.error('error in /get_offers', {request: req, error: serializeError(err)});			
			res.status(500).send({result: "Error", info: serializeError(err)});
		});
	});

	/*
		Query arguments:
		partner - partner Id (i.e. Applift)
		uid - clicking User Id
		offer - cliced offer Id
	*/
	api.get('/offer_click', (req, res) => {
		logger.log.debug('request to /offer_click made', {request: req});
		monetizationHandler.offerClick(req).then((redirectParams) => {
			// on success - redirect to VOLUUM
			res.redirect(redirectParams.redirectUrl);
			//res.json({result: 'Success'});
		}).catch(err => {
			logger.log.error('error in /offer_click', {request: req, error: serializeError(err)});			
			res.status(500).send({result: "Error", info: serializeError(err)});
		});
	});

	return api;
}
