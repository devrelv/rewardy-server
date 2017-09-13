import { version } from '../../package.json';
import { Router } from 'express';

const request = require('request');

export default ({ config, db }) => {

	let api = Router();

	api.get('/', (req, res) => {
		res.json({ version });
	});

	return api;
}
