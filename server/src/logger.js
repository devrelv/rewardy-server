var winston = require('winston');

var curDate = formatDate(new Date());
var log = new (winston.Logger)({
    transports: [
      new (winston.transports.Console)(),
      new (winston.transports.File)(
          { filename: 'logs/' + curDate + '_server.log',
          handleExceptions: true,
          humanReadableUnhandledException: true})
    ]
  });
  log.level = 'debug'; // Log Levels: error: 0, warn: 1, info: 2, verbose: 3, debug: 4, silly: 5

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