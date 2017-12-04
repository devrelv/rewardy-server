'use strict';
var consts = require('./consts.js');
var path = require('path');
var fs = require('fs');
var firebase = require("firebase");
const logger = require('../logger');
const serializeError = require('serialize-error');
const lightMailSender = require('./core/light-mail-sender');
var moment = require('moment')
var rimraf = require('rimraf');

function backupDb (db, req) {
    return new Promise((resolve, reject) => {        
        try {
            let now = new Date();
            let backupDir = __dirname + '/../db_backups/' + formatDate(now);
            if (!fs.existsSync(backupDir)){
                var shell = require('shelljs');
                shell.mkdir('-p', backupDir);
            }
            logger.log.info('backing up database to ' + backupDir);            
            db.backupDb(backupDir).then(()=>{
                db.getAllBackups().then(backupSources => {
                    let restoreProcesses = [];
                    for (let i=0;i<backupSources.length;i++) {
                        let currentBackupSource = backupSources[i];
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
                            logger.log.info('restoring database into ' + currentBackupSource.connection_string);
                            // Restore to this db: currentBackupSource
                            let backedupDbName = getDbNameFromConnectionString(process.env.MONGO_CONNECTION_STRING);
                            restoreProcesses.push(db.restoreDb(currentBackupSource.connection_string, backupDir + '/' + backedupDbName, true, now).catch(e => e));
                        }
                    }
                    if (restoreProcesses.length == 0) {
                        logger.log.info('no restoring required, deleting backup dir ' + backupDir);                        
                        rimraf(backupDir, function () { 
                            resolve(); 
                        });                        
                    } else {
                        Promise.all(restoreProcesses).then(res => {
                            logger.log.info('all restores are done, deleting backup dir ' + backupDir);                                                
                            rimraf(backupDir, function () { 
                                resolve();
                             });                        
                        });
                    }
                }).catch(err => {
                    logger.log.error('backupDb: db.getAllBackups error occured', {error: serializeError(err), request: req});            
                    reject(err);
                });
            }).catch(err => {
                logger.log.error('backupDb: db.backupDb error occured', {error: serializeError(err), request: req});            
                reject(err);
            });
            
        }
        catch (err) {
            logger.log.error('backupDb: error occured', {error: serializeError(err), request: req});
            reject(err);
        }
        
    });

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


module.exports = {
    backupDb: backupDb
}