import { version } from '../../package.json';
import { Router } from 'express';

const request = require('request');
const monetizationHandler = require('./monetization-handler');
const consts = require('./consts');

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
	api.get('/postback/superrewards', (req, res) => {
		monetizationHandler.postback_superrewards(db, req);
		res.send("Done");
	});

	return api;
}
