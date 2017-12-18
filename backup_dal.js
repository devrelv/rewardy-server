var backup = require('mongodb-backup');
var restore = require('mongodb-restore');
var clone = require('clone');
const serializeError = require('serialize-error');
const logger = require('./logger');

var mongooseForRestore = clone(require('mongoose'));

let back_conn = mongooseForRestore.connect(process.env.BACKUP_DB_CONNECTION_STRING, {useMongoClient: true});
let Schema = mongooseForRestore.Schema;
let Backup = back_conn.model('Backup', new Schema({
    connection_string: {
        type: String,
        required: true,
        unique: true
    },
    interval_in_hours: {
        type: Number,
        required: true
    },
    last_backup: {
        type: Date,
        default: Date.now
    }
}));


function updateLastBackupDate(dbConnectionString, backupDate){
    return new Promise((resolve, reject) => {
        Backup.update({'connection_string': dbConnectionString}, {'last_backup': backupDate}, 
        err => {
            if (err) {
                logger.log.error('dal: updateLastBackupDate error', {error: serializeError(err)});                                        
                reject(err);
            } else {
                resolve();
            }
        })
    });        
}

function getAllBackups() {
    return new Promise((resolve, reject) => {
        mongooseForRestore.Promise = require('bluebird');
        mongooseForRestore.connect(process.env.BACKUP_DB_CONNECTION_STRING, {useMongoClient: true}).then(
            ()=>{
                Backup.find({},function(err, data) {
                    if (err) {
                        logger.log.error('dal: getAllBackups error', {error: serializeError(err)});                        
                        reject(err);
                    } else {
                        resolve(data);
                    }
                })
            }
        ).catch(err => {
            logger.log.error('dal: getAllBackups mongooseForRestore.connect error', {error: serializeError(err)});                        
            reject(err);
        });
    });
}


function backupDb(backupDir) {
    return new Promise((resolve, reject) => {
       backup({
         uri: process.env.MONGO_CONNECTION_STRING, // mongodb://<dbuser>:<dbpassword>@<dbdomain>.mongolab.com:<dbport>/<dbdatabase> 
         root: backupDir,
         callback: backupDone
       });

       function backupDone(err) {
           if (err) {
                logger.log.error('dal: backupDb error', {error: serializeError(err)});            
               reject(err);
           } else {
               resolve();
           }
       }
    }); 
}

function restoreDb(importDbConnectionString, dirLocation, isWriteToBackupDB, backupDate) {
    return new Promise((resolve, reject) => {
        restore({
         uri: importDbConnectionString, // mongodb://<dbuser>:<dbpassword>@<dbdomain>.mongolab.com:<dbport>/<dbdatabase> 
         root: dirLocation,
         callback: restoreDone,
         drop: true
       });

       function restoreDone(err) {
           if (err) {
                logger.log.error('dal: restoreDb.restoreDone error', {error: serializeError(err)});                        
               reject(err);
           } else {
               if (isWriteToBackupDB) {
                   updateLastBackupDate(importDbConnectionString, backupDate).then(()=>{
                       resolve();
                   }).catch(err => {
                        logger.log.error('dal: restoreDb.updateLastBackupDate error', {error: serializeError(err)});
                        resolve();
                   })
               } else {
                resolve();                
               }
           }
       }
    }); 
}



module.exports = {
    backupDb: backupDb,
    restoreDb: restoreDb,
    getAllBackups: getAllBackups
}