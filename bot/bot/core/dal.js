// Singleton Data Access Layer
// This code run once - on load:
var mongoose = require('mongoose');
var consts = require('./const')
const logger = require('./logger');
const serializeError = require('serialize-error');

// const mongodbOptions = {
//     server: {
//         socketOptions: {
//             keepAlive: 300000,
//             connectTimeoutMS: 30000
//         }
//     },
//     replset: {
//         socketOptions: {
//             keepAlive: 300000,
//             connectTimeoutMS: 30000
//         }
//     },
//     useMongoClient: true
// };

logger.log.info('####### connecting to the database #######');
// mongoose.connect(process.env.MONGO_CONNECTION_STRING, mongodbOptions);
mongoose.Promise = require('bluebird');
mongoose.connect(process.env.MONGO_CONNECTION_STRING, {useMongoClient: true}).then(
    ()=>{
    logger.log.info('dal: connected to database');        
    }
).catch(err => {
    logger.log.error('dal: mongoose.connect error occured', {error: serializeError(err)});
    setTimeout(() => {throw err;}); // The setTimeout is a trick to enable the throw err
});

// Data Model
var User = mongoose.model('User', { name: String });

let Schema = mongoose.Schema;

let BotUserSchema = new Schema({
    user_id: {
        type: String,
        required: true,
        unique: true
    },
    email: {
        type: String,
        required: true,
        unique: true
    },
    name: {
        type: String,
        required: true
    },
    language: {
        type: String,
        required: true,
        default: consts.defaultUserLanguage,
    },
    points: {
        type: Number,
        required: true
    },
    created_at: {
        type: Date,
        default: Date.now,
        required: true
    },
    last_daily_bonus: {
        type: Date,
        default: Date.now
    },
    source: {
        type: {
            type: String,
            required: false,
            default: ''
        }, 
        id: {
            type: String,
            required: false,
            default: ''
        },
        additional_data: {
            type: Schema.Types.Mixed,
            required: false
        }
    }
});

let BotUser = mongoose.model('BotUser', BotUserSchema);

let DeviceUserSchema = new Schema({
    user_id: {
        type: String,
        required: true,
        unique: true
    },
    type: { 
        type: String, 
        default: consts.DEVICE_TYPE_DESKTOP,
        required: true
    }
});

let DeviceUser = mongoose.model('DeviceUser', DeviceUserSchema);

let ReferralUserSchema = new Schema({
    referrer: {
        type: String,
        required: true
    },
    referred: {
        type: String,
        required: true
    }
});

let ReferralUser = mongoose.model('ReferralUserSchema', ReferralUserSchema);




// Access Functions
// function saveUsername(username) {
// 	var currentUser = new User({ name: username });
//     currentUser.save(function (err) {
//         if (err) {
//         console.log(err);
//         } else {
//         console.log('User saved to db');
//         }
//     });

//     return;
// }

function saveUserToDatabase(userDetails, language) {
    let newBotUser = new BotUser({
        user_id: userDetails.userId,
        email: userDetails.email,
        name: userDetails.name,
        points: consts.defaultStartPoints,
        language: userDetails.language || consts.defaultUserLanguage
    });

    newBotUser.save(function(err) {
        if (err) {
            logger.log.error('dal: saveUserToDatabase newBotUser.save error occured', {error: serializeError(err), newBotUser: newBotUser});
        }
    });
}

function saveDeviceUserToDatabase(userId, deviceType) {
    let newDeviceUser = new DeviceUser({
        user_id: userId,
        type: deviceType
    });

    newDeviceUser.save(function(err) {
        if (err) {
            logger.log.error('dal: saveDeviceUserToDatabase newDeviceUser.save error occured', {error: serializeError(err), newDeviceUser: newDeviceUser, userId: userId, deviceType: deviceType});
        }
    });
}

function getBotUserById(userId, callback) {
    return new Promise((resolve, reject)=>{
        BotUser.findOne({
            'user_id': userId
        }, function(err, botUser) {
            if (err) {
                logger.log.error('dal: getBotUserById BotUser.findOne error occured', {error: serializeError(err), user_id: userId});
                reject(err);
            } else {
                resolve(botUser);
            } 
        });
    });
    
}

function getDeviceByUserId(userId, callback) {
    return new Promise((resolve, reject) => {
        DeviceUser.findOne({
            'user_id': userId
        }, function(err, botUser) {
            if (err) {
                logger.log.error('dal: getDeviceByUserId DeviceUser.findOne error occured', {error: serializeError(err), user_id: userId});
                reject(err);
            } else {
                resolve(botUser);
            } 
        });
    });
}

function saveDeviceUserToDatabase(userId, deviceType){
    let newDeviceUser = new DeviceUser({
        user_id: userId,
        type: deviceType
    });

    newDeviceUser.save(function(err) {
        if (err) {
            logger.log.error('dal: saveDeviceUserToDatabase newDeviceUser.save error occured', {error: serializeError(err), newDeviceUser: newDeviceUser});
            console.log(err);
        }
    });
}

function getBotUserByEmail(email) {
    return new Promise((resolve, reject) => {
        BotUser.findOne({
            'email': email
        }, function(err, botUser) {
            if (err) {
                logger.log.error('dal: getBotUserByEmail BotUser.findOne error occured', {error: serializeError(err), email: email});
                reject(err);
            } else {
                resolve(botUser);
            } 
        });
    });
}

function getInvitedFriendsByUserId(userId) {
    return new Promise((resolve, reject) => {
        BotUser.find({
            'source.type': consts.botUser_source_friendReferral,
            'source.id': userId
        }, function(err, data) {
            if (err) {
                logger.log.error('dal: getInvitedFriendsByUserId BotUser.find error occured', {error: serializeError(err),  source_type: consts.botUser_source_friendReferral, source_id: userId});
                reject(err);
            } else {
                resolve(data);
            } 
        });
    });
}

module.exports = {
    saveUserToDatabase: saveUserToDatabase,
    saveDeviceUserToDatabase: saveDeviceUserToDatabase,
    getBotUserById: getBotUserById,
    getDeviceByUserId: getDeviceByUserId,
    saveDeviceUserToDatabase: saveDeviceUserToDatabase,
    getBotUserByEmail: getBotUserByEmail,
    getInvitedFriendsByUserId: getInvitedFriendsByUserId,
};