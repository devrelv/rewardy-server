'use strict';
const MonetizationProvider = require('./monetization-provider');

function Stub () {
    MonetizationProvider.apply(this, arguments);
}

Stub.prototype = Object.create(MonetizationProvider.prototype);
Stub.prototype.constructor = Stub;

Stub.prototype.getUsersConfirmedActionsByDates = function(fromDate, toDate) {
    console.log('Stub get by dates');
    return new Promise((resolve, reject) => {
        resolve
        (
            [{userId: '45e236e0-ace9-11e7-8703-370a2896cb50', action: 'app download', app_name: 'Candy Crush', payment: 0.25, timestamp: '2017-10-17 15:00:00'},
            {userId: '45e236e0-ace9-11e7-8703-370a2896cb50', action: 'app download', app_name: 'Scouter Club', payment: 0.15, timestamp: '2017-10-17 15:10:00'},
            {userId: '45e236e0-ace9-11e7-8703-370a2896cb50', action: 'app download', app_name: 'Google Drive', payment: 0.20, timestamp: '2017-10-17 15:20:00'},
            {userId: 'cbffdcf0-ace9-11e7-8703-370a2896cb50', action: 'app download', app_name: 'Google Photos', payment: 0.20, timestamp: '2017-10-17 15:20:00'},
            {userId: 'cbffdcf0-ace9-11e7-8703-370a2896cb50', action: 'app download', app_name: 'Anydo', payment: 0.20, timestamp: '2017-10-17 15:20:00'}]
        );
    });        
}

Stub.prototype.getAvailableOffers = function () {
    return new Promise((resolve, reject) =>  {
        resolve
        (
            [{imageUrl: 'https://static1.squarespace.com/static/500444d9e4b0675a38ee8f69/t/5408d964e4b04f2a4feaf616/1409866084946/', downloadLink: 'http://www.google.com', title: 'Download Candy Crush', description: 'go to play store and download Candy Crush', credits: 30},
            {imageUrl: 'http://scouter.club/img/logo.png', downloadLink: 'http://www.scouter.club', title: 'Create team on Scouter', description: 'download the app and create a new team', credits: 35},
            {imageUrl: 'https://www.google.com/drive/static/images/drive/logo-drive.png', downloadLink: 'https://www.google.com/drive/', title: 'Download Google Drive', description: 'download Google Drive application', credits: 20},
            {imageUrl: 'https://lh5.ggpht.com/tq3WqEUxtRyBn-d_0t3j6WKNHuJDrmLq-FE3GAYrsAMQFIaS7FIgRLfzzql2SvfvLqto=w300', downloadLink: 'https://photos.google.com/', title: 'Download Google Photos', description: 'download Google Photos application', credits: 15},
            {imageUrl: 'https://www.any.do/images/logo_blue.svg', downloadLink: 'https://www.any.do/', title: 'Download Anydo', description: 'downloadAnydo application', credits: 35}]
        );

    });
}

module.exports = Stub;