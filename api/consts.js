var winston = require('winston');

module.exports = {
    PARTNER_SUPER_REWARDS : 'Super Rewards',
    PARTNER_FYBER : 'Fyber',
    PARTNER_DAILY_BONUS : 'Daily Bonus',
    PARTNER_STUB : 'Stub',
    SUPER_REWARDS_SECRET_KEY : '30691850651147dabd9938e8d3ec995d',
    defaultUserLanguage: 'en',
    default_points: 10, // TODO: Move to a common props file
    daily_bonus_points: 10, // TODO: Move to a common props file
    referral_bonus_points: 20, // TODO: Move to a common props file
    EMAIL_USERNAME: 'hello@rewardy.co', 
    EMAIL_PASSWORD: 'hg68tuyg',
    EMAIL_SENDER_NAME: 'Rewardy',
    SERVER_API_URL: 'http://rewardy-server.azurewebsites.net/api/', // TODO: Move to a common props file / DB
    EMAIL_VOUCHERS_GENERETOR: 'hello@rewardy.co', // The email to send the vouchers redeem requests
    botUser_source_friendReferral: 'friend',
}