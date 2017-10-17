const dal = require('./dal')

export default callback => {
    dal.openConnection();
	callback(dal);
}

// export function getAllMonetizationPartners() {
// 	return new Promise((resolve, reject) => {
//         MonetizationPartner.find({}, function(err, data) {
//             if (err) {
//                 reject(err);
//             } else {
//                 resolve(data);
//             } 
//         });
//     });
// }

// module.exports = {
// 	getAllMonetizationPartners: getAllMonetizationPartners
// }


