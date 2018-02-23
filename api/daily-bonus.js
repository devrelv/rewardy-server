'use strict';
const logger = require('../logger');
const consts = require('./consts');
const serializeError = require('serialize-error');
const dal = require('../dal');

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
            dal.getUserLastBonusDate(userId).then(lastBonusDate => 
                {
                    logger.log.debug('in dal.getUserLastBonusDate.then');
                    
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
                        let bonusDate = new Date();
                        dal.increaseUserCredits(userId, consts.daily_bonus_points, true, bonusDate).then(()=>
                        {
                            logger.log.debug('in dal.increaseUserCredits.then');
                            
                            dal.pushDailyBonus(userId, consts.daily_bonus_points, bonusDate).then(()=>{
                                result.isRewarded = true;
                                result.points = consts.daily_bonus_points;
                                resolve(result);
                            }).catch(err => {
                                logger.log.error('daily-bonus pushDailyBonus.catch: error occured', {error: serializeError(err), request: req});
                                reject(err);
                            });
                        }).catch (err => {
                            logger.log.error('daily-bonus increaseUserCredits.catch: error occured', {error: serializeError(err), request: req});
                            reject(err);
                        });                
                        
                    } else {
                        result.isRewarded = false;   
                        result.points = consts.daily_bonus_points;
                        resolve(result);                        
                    }
                    
                }). catch (err => {
                    logger.log.error('daily-bonus dal.getUserLastBonusDate: error occured', {error: serializeError(err), request: req});                    
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