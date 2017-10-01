var restify = require('restify');
var builder = require('botbuilder');

const MICROSOFT_APP_ID = '929b584f-64e7-42d6-a051-97a5b1f71cdf';
const MICROSOFT_APP_PASSWORD = 'awSiELgJeFCbaH7kn80iKgJ'

// Setup Restify Server
var server = restify.createServer();
server.listen(process.env.port || process.env.PORT || 3978, function () {
   console.log('%s listening to %s', server.name, server.url);
});

// Create chat connector for communicating with the Bot Framework Service
var connector = new builder.ChatConnector({
    // appId: process.env.MICROSOFT_APP_ID,
    // appPassword: process.env.MICROSOFT_APP_PASSWORD
    appId: MICROSOFT_APP_ID,
    appPassword: MICROSOFT_APP_PASSWORD
});

// Listen for messages from users
server.post('/api/messages', connector.listen());

// Sample 1
// Receive messages from the user and respond by echoing each message back (prefixed with 'You said:')
var bot = new builder.UniversalBot(connector, function (session) {
   session.beginDialog('greetings');

});

bot.dialog('greetings', [
    function (session) {
        session.send("v2");
        builder.Prompts.text(session, 'Hi! What is your name?');
    },
    function (session, results) {
        session.endDialog('Hello %s!', results.response);
    }
]);


// Sample  - sending & receinving attachments
// // Create your bot with a function to receive messages from the user
// var bot = new builder.UniversalBot(connector, function (session) {
//     console.log('Getting the message attachment');
//     var msg = session.message;
//     if (msg.attachments && msg.attachments.length > 0) {
//      // Echo back attachment
//      var attachment = msg.attachments[0];
//         session.send({
//             text: "You sent:",
//             attachments: [
//                 {
//                     contentType: attachment.contentType,
//                     contentUrl: attachment.contentUrl,
//                     name: attachment.name
//                 }
//             ]
//         });
//     } else {
//         // Echo back users text
//         session.send("You said: %s", session.message.text);
//     }
// });

// // Sample 2: carousel
// // Create your bot with a function to receive messages from the user
// // Create bot and default message handler
// var bot = new builder.UniversalBot(connector, function (session) {
//     session.send("Hi... We sell shirts. Say 'show shirts' to see our products.");
// });
//
// // Add dialog to return list of shirts available
// bot.dialog('showShirts', function (session) {
//     var msg = new builder.Message(session);
//     msg.attachmentLayout(builder.AttachmentLayout.carousel)
//     msg.attachments([
//         new builder.HeroCard(session)
//             .title("Classic White T-Shirt")
//             .subtitle("100% Soft and Luxurious Cotton")
//             .text("Price is $25 and carried in sizes (S, M, L, and XL)")
//             .images([builder.CardImage.create(session, 'http://petersapparel.parseapp.com/img/whiteshirt.png')])
//             .buttons([
//                 builder.CardAction.imBack(session, "buy classic white t-shirt", "Buy")
//             ]),
//         new builder.HeroCard(session)
//             .title("Classic Gray T-Shirt")
//             .subtitle("100% Soft and Luxurious Cotton")
//             .text("Price is $25 and carried in sizes (S, M, L, and XL)")
//             .images([builder.CardImage.create(session, 'http://petersapparel.parseapp.com/img/grayshirt.png')])
//             .buttons([
//                 builder.CardAction.imBack(session, "buy classic gray t-shirt", "Buy")
//             ])
//     ]);
//     session.send(msg).endDialog();
// }).triggerAction({ matches: /^(show|list)/i });

// // Sample
// var bot = new builder.UniversalBot(connector, function (session) {
//     session.send("Hi... We sell shirts. Say 'show shirts' to see our products.");
// });
//
// bot.dialog('buyButtonClick', [
//     function (session, args, next) {
//         // Get color and optional size from users utterance
//         var utterance = args.intent.matched[0];
//         var color = /(white|gray)/i.exec(utterance);
//         var size = /\b(Extra Large|Large|Medium|Small)\b/i.exec(utterance);
//         if (color) {
//             // Initialize cart item
//             var item = session.dialogData.item = {
//                 product: "classic " + color[0].toLowerCase() + " t-shirt",
//                 size: size ? size[0].toLowerCase() : null,
//                 price: 25.0,
//                 qty: 1
//             };
//             if (!item.size) {
//                 // Prompt for size
//                 builder.Prompts.choice(session, "What size would you like?", "Small|Medium|Large|Extra Large");
//             } else {
//                 //Skip to next waterfall step
//                 next();
//             }
//         } else {
//             // Invalid product
//             session.send("I'm sorry... That product wasn't found.").endDialog();
//         }
//     },
//     function (session, results) {
//         // Save size if prompted
//         var item = session.dialogData.item;
//         if (results.response) {
//             item.size = results.response.entity.toLowerCase();
//         }
//
//         // Add to cart
//         if (!session.userData.cart) {
//             session.userData.cart = [];
//         }
//         session.userData.cart.push(item);
//
//         // Send confirmation to users
//         session.send("A '%(size)s %(product)s' has been added to your cart.", item).endDialog();
//     }
// ]).triggerAction({ matches: /(buy|add)\s.*shirt/i });

// var bot = new builder.UniversalBot(connector);
// bot.use({
//     botbuilder: function (session, next) {
//         myMiddleware.logIncomingMessage(session, next);
//     },
//     send: function (event, next) {
//         myMiddleware.logOutgoingMessage(event, next);
//     }
// });
//
// module.exports = {
//     logIncomingMessage: function (session, next) {
//         console.log(session.message.text);
//         next();
//     },
//     logOutgoingMessage: function (event, next) {
//         console.log(event.text);
//         next();
//     }
// };
