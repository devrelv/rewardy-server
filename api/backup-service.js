'use strict';
var consts = require('./consts.js');
var fs = require('fs');
const logger = require('../logger');
const serializeError = require('serialize-error');
const lightMailSender = require('./core/light-mail-sender');
var moment = require('moment')
var rimraf = require('rimraf');

var backup_dal = require('../backup_dal');

let isBackedUp;
function backupDb (req) {
    return new Promise((resolve, reject) => {        
        try {
            isBackedUp = false;
            let now = new Date();
            let backupDir = __dirname + '/../db_backups/' + formatDate(now);
            if (!fs.existsSync(backupDir)){
                var shell = require('shelljs');
                shell.mkdir('-p', backupDir);
            }

            backup_dal.getAllBackups().then(backupSources => {
                let restoreProcesses = [];
                
                promiseFor(function(count) {
                    return count < backupSources.length;
                }, function(count) {
                    return handleBackupSource(backupSources[count], restoreProcesses, now, backupDir)
                             .then(function(res) {
                                 return ++count;
                             });
                }, 0).then(()=> {
                    if (restoreProcesses.length == 0) {
                        logger.log.info('no restoring required');
                        resolve();
                    } else {
                            Promise.all(restoreProcesses).then(res => {
                                logger.log.info('all restores are done, deleting backup dir ' + backupDir);                                                
                                rimraf(backupDir, function () { 
                                    resolve();
                                    });                        
                            });
                    }
                }).catch(err => {
                    logger.log.error('backupDb: promiseFor error occured', {error: serializeError(err), request: req});            
                    reject(err);
                });
            }).catch(err => {
                logger.log.error('backupDb: backup_dal.getAllBackups error occured', {error: serializeError(err), request: req});            
                reject(err);
            });
        }
        catch (err) {
            logger.log.error('backupDb: error occured', {error: serializeError(err), request: req});
            reject(err);
        }
        
    });
}

let promiseFor = function(condition, action, value) {
    if (!condition(value)) return value;
    return action(value).then(promiseFor.bind(null, condition, action));
};

function handleBackupSource(currentBackupSource, restoreProcesses, now, backupDir) {
    return new Promise((resolve, reject) => {
        try {
            let restoreNeeded = false;
            if (!currentBackupSource.last_backup || currentBackupSource.last_backup.length == 0) {
                restoreNeeded = true;
            } else {
                var startDate = moment(currentBackupSource.last_backup);
                var endDate = moment(now);
                var hoursDiff = endDate.diff(startDate, 'hours');
                if (hoursDiff > currentBackupSource.interval_in_hours) {
                    restoreNeeded = true;
                }
            }
    
            if (restoreNeeded) {
                if (!isBackedUp) {
                    logger.log.info('backing up database to ' + backupDir);                    
                    backup_dal.backupDb(backupDir).then(()=>{
                        addDBToRestores(restoreProcesses, currentBackupSource, backupDir, now);
                        resolve();
                    }).catch(err => {
                        logger.log.error('backupDb: backup_dal.backupDb error occured', {error: serializeError(err)});            
                        reject(err);
                    });
                } else {
                    addDBToRestores(restoreProcesses, currentBackupSource, backupDir, now);
                    resolve();
                }
                
            } else {
                resolve();
            }
        }
        catch(err) {
            logger.log.error('backupDb: handleBackupSource error occured', {error: serializeError(err)});            
            reject(err);
        }
        
    });
}

function addDBToRestores(restoreProcesses, currentBackupSource, backupDir, now) {
    logger.log.info('restoring database into ' + currentBackupSource.connection_string);

    let mongoConnectionString = '';
    if (process.env.CURRENT_ENV == 'PROD') {
        mongoConnectionString = process.env.PROD_MONGO_CONNECTION_STRING
    } else {
        mongoConnectionString = process.env.DEV_MONGO_CONNECTION_STRING        
    }
    // Restore to this db: currentBackupSource
    let backedupDbName = getDbNameFromConnectionString(mongoConnectionString);
    restoreProcesses.push(backup_dal.restoreDb(currentBackupSource.connection_string, backupDir + '/' + backedupDbName, true, now).catch(e => e));
}

function getDbNameFromConnectionString(connString) {
    return connString.substr(connString.lastIndexOf('/')+1);
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

function removeAllBackupFiles() {
    return new Promise((resolve, reject) => {
        try {
            let backupsDir = __dirname + '/../db_backups/*';
            rimraf(backupsDir, function () { 
                resolve();
                });
        } catch (err) {
            reject(err);
        }
    });
}

module.exports = {
    backupDb: backupDb,
    removeAllBackupFiles: removeAllBackupFiles
}