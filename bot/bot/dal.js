// Singleton Data Access Layer
// This code run once - on load:
var mongoose = require('mongoose');
var consts = require('./const')

const mongodbOptions = {
    server: {
        socketOptions: {
            keepAlive: 300000,
            connectTimeoutMS: 30000
        }
    },
    replset: {
        socketOptions: {
            keepAlive: 300000,
            connectTimeoutMS: 30000
        }
    }
};

console.log('####### connecting to the database #######');
mongoose.connect(process.env.MONGO_CONNECTION_STRING, mongodbOptions);

// Data Model
var User = mongoose.model('User', { name: String });

let Schema = mongoose.Schema;

let BotUserSchema = new Schema({
    user_id: {
        type: String,
        required: true,
        unique: true
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
        default: Date.now,
        required: true
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

function saveUserToDatabase(userId, language) {
    let newBotUser = new BotUser({
        user_id: userId,
        points: consts.defaultStartPoints,
        language: language || consts.defaultUserLanguage
    });

    newBotUser.save(function(err) {
        if (err) {
            console.log(err);
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
            console.log(err);
        }
    });
}

function getBotUserById(userId, callback) {
    return new Promise((resolve, reject)=>{
        BotUser.findOne({
            'user_id': userId
        }, function(err, botUser) {
            if (err) {
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
            console.log(err);
        }
    });
}

module.exports = {
    saveUserToDatabase: saveUserToDatabase,
    saveDeviceUserToDatabase: saveDeviceUserToDatabase,
    getBotUserById: getBotUserById,
    getDeviceByUserId: getDeviceByUserId,
    saveDeviceUserToDatabase: saveDeviceUserToDatabase,
};