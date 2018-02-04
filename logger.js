var winston = require('winston');
var fs = require('fs');
var Raven = require('raven');

var curDate = formatDate(new Date());
var dir = 'logs/';

// sentry config to SERVER project
Raven.config('https://fa9c114593944f10a920531f04dc8d1f:17e02b8bb0db447db50aaf9cfd3dcfa2@sentry.io/244280').install();
if (!fs.existsSync(dir)){
    fs.mkdirSync(dir);
}
var log = new (winston.Logger)({
    transports: [
      new (winston.transports.Console)(),
      new (winston.transports.File)(
          { filename: dir + curDate + '_bot.log',
          handleExceptions: true,
          humanReadableUnhandledException: true})
    ]
  });
  log.level = 'debug'; // Log Levels: error: 0, warn: 1, info: 2, verbose: 3, debug: 4, silly: 5

  if (process.env.DEVELOPMENT_MODE != '1') {
    // Sending the error data to Raven (sentry.io)
    let oldErrorFunc = log.error;  
    log.error = function(errorString, params){
    if (params && params.error) {
        Raven.captureException( params.error);    
    } else if (params && params.err) {
        Raven.captureException(params.err);        
    } else {
        Raven.captureException(params);
    }
    oldErrorFunc.apply(this, [errorString, params]);
    }

     // Sending the warning data to Raven (sentry.io)
    let oldWarnFunc = log.warn;  
    log.warn = function(errorString, params){
        if (params && params.error) {
            Raven.captureException(params.error);    
        } else if (params && params.err) {
            Raven.captureException(params.err);        
        } else {
            Raven.captureException(params);
        }
        oldWarnFunc.apply(this, [errorString, params]);
    }
  }

  function formatDate(date) {
    var d = new Date(date),
        month = '' + (d.getUTCMonth() + 1),
        day = '' + d.getUTCDate(),
        year = d.getUTCFullYear(),
        hour = '' +d.getUTCHours(),
        minute = '' +d.getUTCMinutes(),
        second = '' +d.getUTCSeconds();

    if (month.length < 2) month = '0' + month;
    if (day.length < 2) day = '0' + day;
    if (hour.length < 2) hour = '0' + hour;
    if (minute.length < 2) minute = '0' + minute;
    if (second.length < 2) second = '0' + second;

    return [year, month, day].join('-') + '_' + [hour,minute, second].join('-');
}

  module.exports = {
      log: log
  }