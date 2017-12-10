require('dotenv-extended').load();
var http = require('http');
var express = require('express');
var cors = require('cors');
var morgan = require('morgan');
var bodyParser = require('body-parser');
var middleware = require('./middleware');
var api = require('./api');
var config = require('./config.json');

let app = express();
app.server = http.createServer(app);

// logger
app.use(morgan('dev'));

// 3rd party middleware
app.use(cors({
	exposedHeaders: config.corsHeaders
}));

app.use(bodyParser.json({
	limit : config.bodyLimit
}));

// connect to db
let db=null;
// internal middleware
app.use(middleware({ config, db }));

// api router
app.use('/api', api({ config, db }));

app.server.listen(process.env.PORT || 8080, () => {
	console.log(`Started on port ${app.server.address().port}`);
});

// increasing the timeout for the backup
app.server.timeout = 300000;

module.exports = app;
