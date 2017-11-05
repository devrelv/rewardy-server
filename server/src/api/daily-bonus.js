'use strict';
const logger = require('../logger');
const consts = require('./consts');
const serializeError = require('serialize-error');

/*
    Query arguments:
    uid - user id for checking & giving a daily bonus
*/
function handleUser (db, req) {
    return new Promise((resolve, reject) => {        
        try {
            logger.log.debug('in handleUser');
            let result = {result: "Success", isRewarded: false, message: ""};
            var userId = req.query.uid;
            var dailyBonusQualified = false;            
            db.getUserLastBonusDate(userId).then(lastBonusDate => 
                {
                    logger.log.debug('in db.getUserLastBonusDate.then');
                    
                    if (!lastBonusDate) {
                        dailyBonusQualified = true;
                    } else {
                        var now = new Date();
                        var diffMs = now-lastBonusDate;
                        var diffHours = diffMs/3600000;
                        if (diffHours>24) {
                            dailyBonusQualified = true;
                        } else {
                            dailyBonusQualified = false;
                            result.message = Math.round(diffHours) + " hours since last daily bonus";
                        }
                    }
        
                    if (dailyBonusQualified) {
                        logger.log.debug('in if (dailyBonusQualified)');
                    
                        // give the daily bonus & update last_daily_bonus
                        db.increaseUserCredits(userId, consts.daily_bonus_points, true).then(()=>
                        {
                            logger.log.debug('in db.increaseUserCredits.then');
                        
                            result.isRewarded = true;
                            resolve(result);
                        
                        }).catch (err => {
                            logger.log.error('daily-bonus getUserLastBonusDate.catch: error occured', {error: serializeError(err), request: req});
                            reject(err);
                        });                
                        
                    } else {
                        result.isRewarded = false;   
                        resolve(result);                        
                    }
                    
                }). catch (err => {
                    logger.log.error('daily-bonus db.getUserLastBonusDate: error occured', {error: serializeError(err), request: req});                    
                    reject(err);
                });
            
        }
        catch (err) {
            logger.log.error('daily-bonus handleUser: error occured', {error: serializeError(err), request: req});
            reject(err);
        }
        
    });

}

module.exports = {
    handleUser: handleUser
}