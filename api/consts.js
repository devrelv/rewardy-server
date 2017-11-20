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
    EMAIL_VOUCHERS_GENERETOR: 'hello@rewardy.co', // The email to send the vouchers redeem requests
    botUser_source_friendReferral: 'friend',
    PROACTIVE_MESSAGES_REFERRAL_BONUS: 0,
    PROACTIVE_MESSAGES_REFERRAL_JOINED: 1,
    PROACTIVE_MESSAGES_REFERRAL_OFFER_COMPLETED: 2,
    PROACTIVE_MESSAGES_DAILY_BONUS: 3,
    PROACTIVE_MESSAGES_INACTIVITY_7DAYS: 4
}