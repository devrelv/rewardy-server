var Router = require('express');

module.exports = ({ config, db }) => {
	let routes = Router();
	
	routes.get('/', function (req, res) {
		res.send('Server side for fischa\'s web front')
	})

	return routes;
}
