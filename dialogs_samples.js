var restify = require('restify');
var builder = require('botbuilder');

// Setup Restify Server
var server = restify.createServer();
server.listen(process.env.port || process.env.PORT || 3978, function () {
   console.log('%s listening to %s', server.name, server.url);
});

// Create chat connector for communicating with the Bot Framework Service
var connector = new builder.ChatConnector({
    appId: process.env.MICROSOFT_APP_ID,
    appPassword: process.env.MICROSOFT_APP_PASSWORD
    // appId: '929b584f-64e7-42d6-a051-97a5b1f71cdf',
    // appPassword: 'awSiELgJeFCbaH7kn80iKgJ'
});

// Listen for messages from users
server.post('/api/messages', connector.listen());

// Sample 1
// // Receive messages from the user and respond by echoing each message back (prefixed with 'You said:')
// var bot = new builder.UniversalBot(connector, function (session) {
//    session.send("You said: %s", session.message.text);
//    session.beginDialog('greetings');
//
// });
//
// bot.dialog('greetings', [
//     function (session) {
//         builder.Prompts.text(session, 'Hi! What is your name?');
//     },
//     function (session, results) {
//         session.endDialog('Hello %s!', results.response);
//     }
// ]);

// Sample 2
// var bot = new builder.UniversalBot(connector, [
//     function (session) {
//         session.send("Welcome to the dinner reservation.");
//         builder.Prompts.time(session, "Please provide a reservation date and time (e.g.: June 6th at 5pm)");
//     },
//     function (session, results) {
//         session.dialogData.reservationDate = builder.EntityRecognizer.resolveTime([results.response]);
//         builder.Prompts.text(session, "How many people are in your party?");
//     },
//     function (session, results) {
//         session.dialogData.partySize = results.response;
//         builder.Prompts.text(session, "Who's name will this reservation be under?");
//     },
//     function (session, results) {
//         session.dialogData.reservationName = results.response;
//
//         // Process request and display reservation details
//         session.send("Reservation confirmed. Reservation details: <br/>Date/Time: %s <br/>Party size: %s <br/>Reservation name: %s",
//             session.dialogData.reservationDate, session.dialogData.partySize, session.dialogData.reservationName);
//         session.endDialog();
//     }
// ]);

// Sample 3
// var bot = new builder.UniversalBot(connector, function (session) {
//    session.beginDialog('greetings');
//
// });
// bot.dialog('greetings', [
//     function (session) {
//         session.send('Yo!');
//         session.beginDialog('askName');
//     },
//     function (session, results) {
//         session.send('Yo Yo Yo!');
//         session.endDialog('Hello %s!', results.response);
//     }
// ]);
// bot.dialog('askName', [
//     function (session) {
//         builder.Prompts.text(session, 'Hi! What is your name?');
//     },
//     function (session, results) {
//         session.send('Yo Yo!');
//         session.endDialogWithResult(results);
//     }
// ]);

// Sample 4
// This bot ensures user's profile is up to date.
// var bot = new builder.UniversalBot(connector, [
//     function (session) {
//         session.beginDialog('ensureProfile', session.userData.profile);
//     },
//     function (session, results) {
//         session.userData.profile = results.response; // Save user profile.
//         session.send('Hello %(name)s! I love %(company)s!', session.userData.profile);
//     }
// ]);
// bot.dialog('ensureProfile', [
//     function (session, args, next) {
//       console.log('args: ', args);
//         session.dialogData.profile = args || {}; // Set the profile or create the object.
//         if (!session.dialogData.profile.name) {
//             builder.Prompts.text(session, "What's your name?");
//         } else {
//             next(); // Skip if we already have this info.
//         }
//     },
//     function (session, results, next) {
//         if (results.response) {
//             // Save user's name if we asked for it.
//             session.dialogData.profile.name = results.response;
//         }
//         if (!session.dialogData.profile.company) {
//             builder.Prompts.text(session, "What company do you work for?");
//         } else {
//             next(); // Skip if we already have this info.
//         }
//     },
//     function (session, results) {
//         if (results.response) {
//             // Save company name if we asked for it.
//             session.dialogData.profile.company = results.response;
//         }
//         session.endDialogWithResult({ response: session.dialogData.profile });
//     }
// ]);

// var salesData = {
//     "west": {
//         units: 200,
//         total: "$6,000"
//     },
//     "central": {
//         units: 100,
//         total: "$3,000"
//     },
//     "east": {
//         units: 300,
//         total: "$9,000"
//     }
// };
//
// var bot = new builder.UniversalBot(connector, function (session) {
//    session.beginDialog('getSalesData');
// });
//
// bot.dialog('getSalesData', [
//     function (session) {
//         builder.Prompts.choice(session, "Which region would you like sales for?", salesData);
//     },
//     function (session, results) {
//         if (results.response) {
//             var region = salesData[results.response.entity];
//             session.send("We sold %(units)d units for a total of %(total)s.", region);
//         } else {
//             session.send("OK");
//         }
//     }
// ]);
//
// // The dialog stack is cleared and this dialog is invoked when the user enters 'help'.
// bot.dialog('help', function (session, args, next) {
//     session.endDialog("This is a bot that can help you make a dinner reservation. <br/>Please say 'next' to continue");
// })
// .triggerAction({
//     matches: /^help$/i,
// });

// Sample
// var bot = new builder.UniversalBot(connector, function (session) {
//    session.beginDialog('phonePrompt');
// });
//
//
//
//
// bot.dialog('phonePrompt', [
//     function (session, args) {
//         if (args && args.reprompt) {
//             builder.Prompts.text(session, "Enter the number using a format of either: '(555) 123-4567' or '555-123-4567' or '5551234567'")
//         } else {
//             builder.Prompts.text(session, "What's your phone number?");
//         }
//     },
//     function (session, results) {
//         var matched = results.response.match(/\d+/g);
//         var number = matched ? matched.join('') : '';
//         if (number.length == 10 || number.length == 11) {
//             session.send("Got it");
//             session.userData.phoneNumber = number; // Save the number.
//             session.endDialogWithResult({ response: number });
//         } else {
//             // Repeat the dialog
//             session.replaceDialog('phonePrompt', { reprompt: true });
//         }
//     }
// ]);



// Sample
var menuItems = {
    "Order dinner": {
        item: "orderDinner"
    },
    "Dinner reservation": {
        item: "dinnerReservation"
    },
    "Schedule shuttle": {
        item: "scheduleShuttle"
    },
    "Request wake-up call": {
        item: "wakeupCall"
    },
}

// This is a reservation bot that has a menu of offerings.
var bot = new builder.UniversalBot(connector, [
    function(session){
        session.send("Welcome to Contoso Hotel and Resort.");
        session.beginDialog("mainMenu");
    }
]);

// Display the main menu and start a new request depending on user input.
bot.dialog("mainMenu", [
    function(session){
        builder.Prompts.choice(session, "Main Menu:", menuItems);
    },
    function(session, results){
        if(results.response){
            session.beginDialog(menuItems[results.response.entity].item);
        }
    }
])
.triggerAction({
    // The user can request this at any time.
    // Once triggered, it clears the stack and prompts the main menu again.
    matches: /^main menu$/i,
    confirmPrompt: "This will cancel your request. Are you sure?"
});

// Menu: "Order dinner"
// This dialog allows user to order dinner to be delivered to their hotel room.
bot.dialog('orderDinner', [
    function(session){
        session.send("Lets order some dinner!");
        builder.Prompts.choice(session, "Dinner menu:", dinnerMenu);
    },
    function (session, results) {
        if (results.response) {
            var order = dinnerMenu[results.response.entity];
            var msg = "You ordered: %(Description)s for a total of $%(Price)f.";
            session.dialogData.order = order;
            session.send(msg, order);
            builder.Prompts.text(session, "What is your room number?");
        }
    },
    function(session, results){
        if(results.response){
            session.dialogData.room = results.response;
            var msg = "Thank you. Your order will be delivered to room #%s";
            session.send(msg,results.response);
            session.replaceDialog("mainMenu"); // Display the menu again.
        }
    }
])
.reloadAction(
    "restartOrderDinner", "Ok. Let's start over.",
    {
        matches: /^start over$/i,
        confirmPrompt: "This wil cancel your order. Are you sure?"
    }
)
.cancelAction(
    "cancelOrder", "Type 'Main Menu' to continue.",
    {
        matches: /^cancel$/i,
        confirmPrompt: "This will cancel your order. Are you sure?"
    }
);

// The dinner menu
var dinnerMenu = {
    //...other menu items...,
    "Check out": {
        Description: "Check out",
        Price: 0 // Order total. Updated as items are added to order.
    },
    "Blah Blah": {
      Description: "Nothing Really",
      Price: 40
    }
};

bot.dialog('help', function (session, args, next) {
    //Send a help message
    console.log("bot.dialog args: ", args);
    session.endDialog("Global help menu.");
})
// Once triggered, will start a new dialog as specified by
// the 'onSelectAction' option.
.triggerAction({
    matches: /^help$/i,
    onSelectAction: (session, args, next) => {
        // Add the help dialog to the top of the dialog stack
        // (override the default behavior of replacing the stack)
        console.log("onSelectAction args: ", args);
        session.beginDialog(args.action, args);
    }
});
