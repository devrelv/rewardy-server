var mongoose = require('mongoose');

// TODO: Move to .env
const MONGO_CONNECTION_STRING = 'mongodb://prod:Pp123456@ds133964.mlab.com:33964/redeembot';

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

let Schema = mongoose.Schema;

let MonetizationPartnerSchema = new Schema({
    id: {
        type: String,
        required: true,
        unique: true
    },
    name: {
        type: String,
        required: true,
        unique: true
    },
    last_full_fetch: {
        type: String,
        default: Date.now,
    }
});
let MonetizationPartner = mongoose.model('MonetizationPartner', MonetizationPartnerSchema);

function openConnection() {
    console.log('####### connecting to the database #######');
    mongoose.connect(MONGO_CONNECTION_STRING, mongodbOptions);
    
}
function getAllMonetizationPartners() {
	return new Promise((resolve, reject) => {
        MonetizationPartner.find({}, function(err, data) {
            if (err) {
                reject(err);
            } else {
                console.log('getAllMonetizationPartners data: ', data);
                resolve(data);
            } 
        });
    });
    // let newMoney = new MonetizationPartner({
    //     id: '2',
    //     name: 'Test'
    // });

    // newMoney.save(function(err) {
    //     if (err) {
    //         console.log(err);
    //     }
    // });
}

module.exports = {
    openConnection: openConnection,
	getAllMonetizationPartners: getAllMonetizationPartners,
}


