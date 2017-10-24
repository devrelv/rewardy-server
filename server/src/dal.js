var mongoose = require('mongoose');

// TODO: Move to .env
const MONGO_CONNECTION_STRING = 'mongodb://prod:Pp123456@ds133964.mlab.com:33964/redeembot';

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
//     }
// };

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
    },
    has_offers: {
        type: Boolean,
        required: true,
        default: 0
    }
});
let MonetizationPartner = mongoose.model('MonetizationPartner', MonetizationPartnerSchema);

let OfferSchema = new Schema({
    id: {
        type: String,
        required: true,
        unique: true
    },
    partnerId: {
        type: String,
        required: true
    },
    fetchDate: {
        type: String,
        required: true
    },
    imageUrl: {
        type: String,
    },
    downloadLink: {
        type: String,
    },
    title: {
        type: String,
    },
    description: {
        type: String,
    },
    credits: {
        type: Number,
        required: true,
        default: 0
    },
});
let Offer = mongoose.model('Offer', OfferSchema);

let UserActionSchema = new Schema({
    id: { /* ourTransactionId */
        type: String,
        required: true,
        unique: true
    },
    partner: {
        type: String,
        required: true
    },
    partnerTransactionId: {
        type: String,
        required: true
    },
    userId: {
        type: String,
        required: true
    },
    offerId: {
        type: String,
        required: true
    },
    offerCredits: {
        type: Number,
        required: true
    },
    totalCredits: {
        type: Number
    },
    date: {
        type: Date,
        required: true,
        default: Date.now
    }
});
let UserAction = mongoose.model('UserAction', UserActionSchema);

function openConnection() {
    console.log('####### connecting to the database #######');
    mongoose.Promise = require('bluebird');
    mongoose.connect(MONGO_CONNECTION_STRING, {useMongoClient: true});
    // mongoose.connect(MONGO_CONNECTION_STRING, mongodbOptions);
    
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
}
function getAllMonetizationPartnersWithOffers() {
	return new Promise((resolve, reject) => {
        MonetizationPartner.find({'has_offers': true}, function(err, data) {
            if (err) {
                reject(err);
            } else {
                resolve(data);
            } 
        });
    });
}

function saveOffers(offers) {
    // TODO: Move Offer definition to external file and use it in all places instead of making this conversion
    // TODO: Save the offers as a batch instead of one by one
    console.log('saving offers: ', offers);
    let convertedOffers = [];
    for (let i=0; i<offers.length; i++) {
        let newOffer = new Offer({
            id: offers[i].id,
            partnerId: offers[i].partnerId,
            fetchDate: offers[i].fetchDate,
            imageUrl: offers[i].imageUrl,
            downloadLink: offers[i].downloadLink,
            title: offers[i].title,
            description: offers[i].description,
            credits: offers[i].credits
        });

        newOffer.save(function(err) {
            if (err) {
                console.log(err);
            }
        });
    }
}

// TODO: Save the UserActionSchema
function addUserAction(partnerTransactionId, userId, offerId, offerCredits, totalCredits, partner, date, innerTransactionId) {
    let newUserAction = new UserAction({
        id: innerTransactionId,
        partner: partner,
        partnerTransactionId: partnerTransactionId,
        userId: userId,
        offerId: offerId,
        offerCredits: offerCredits,
        totalCredits: totalCredits,
        date: date
    });

    return new Promise((resolve, reject) => {
        newUserAction.save(function(err) {
            if (err) {
                console.log(err);
                reject(err);
            } else {
                resolve();
            }
        })
    });
    
    
}

module.exports = {
    openConnection: openConnection,
    getAllMonetizationPartners: getAllMonetizationPartners,
    getAllMonetizationPartnersWithOffers: getAllMonetizationPartnersWithOffers,
    saveOffers: saveOffers,
    addUserAction: addUserAction
}


