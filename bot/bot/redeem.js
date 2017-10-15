var builder = require('botbuilder');

var lib = new builder.Library('redeem');
var Promise = require('bluebird');
var Store = require('./store');

// Helpers
function voucherAsAttachment(voucher) {
    return new builder.HeroCard()
        .title(voucher.name)
        .subtitle(voucher.description)
        .images([new builder.CardImage().url(voucher.imageUrl)])
        .buttons([
            new builder.CardAction()
                .title(voucher.cta) // TODO: Switch to action
                .type('postBack')
                .value('https://www.bing.com/search?q=hotels+in+' + encodeURIComponent(voucher.points))
        ]);
}

lib.dialog('/', [
    // Destination
    function (session) {
        session.send('Please select one of those vouchers'); // TODO: Switch a proper string

        // Async fetch
        Store
            .fetchVouchers()
            .then(function (vouchers) {
                var message = new builder.Message()
                    .attachmentLayout(builder.AttachmentLayout.carousel)
                    .attachments(vouchers.map(voucherAsAttachment));

                session.send(message);

                // End
                session.endDialog();
            });
    }
]);

// Export createLibrary() function
module.exports.createLibrary = function () {
    return lib.clone();
};