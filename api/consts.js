var winston = require('winston');

module.exports = {
    PARTNER_OFFERWALL : 'OfferWall.com',
    PARTNER_SUPER_REWARDS : 'Super Rewards',
    PARTNER_FYBER : 'Fyber',
    PARTNER_DAILY_BONUS : 'Daily Bonus',
    PARTNER_STUB : 'Stub',
    PARTNER_APPLIFT : 'Applift',
    PARTNER_CPA_LEAD : 'CpaLead',
    PARTNER_MOBILITR_INHOUSE : 'Mobilitr-Inhouse',
    SUPER_REWARDS_SECRET_KEY : '30691850651147dabd9938e8d3ec995d',
    OFFERWALL_SECRET_KEY: '92a528dfb37c253ecb42f5974ca0c504', // REAL KEY
    VOLUUM_APPLIFT_SECRET_KEY: 'dfa06729-0f36-4570-9c06-7e64e6883c2b', 
    defaultUserLanguage: 'en',
    default_points: 10, // TODO: Move to a common props file
    daily_bonus_points: 10, // TODO: Move to a common props file
    referral_bonus_points: 20, // TODO: Move to a common props file
    EMAIL_USERNAME: 'hello@rewardy.co', 
    EMAIL_PASSWORD: 'S4fe34DS#$ds',
    EMAIL_SENDER_NAME: 'Rewardy',
    EMAIL_VOUCHERS_GENERETOR: 'hello@rewardy.co', // The email to send the vouchers redeem requests
    botUser_source_friendReferral: 'friend',
    PROACTIVE_MESSAGES_REFERRAL_BONUS: 0,
    PROACTIVE_MESSAGES_REFERRAL_JOINED: 1,
    PROACTIVE_MESSAGES_OFFER_COMPLETED: 2,
    PROACTIVE_MESSAGES_DAILY_BONUS: 3,
    PROACTIVE_MESSAGES_INACTIVITY_7DAYS: 4,
    PROACTIVE_MESSAGES_CUSTOM: 5,
    EMAIL_REGEX: new RegExp(/^[a-z0-9!#$%&'*+\/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+\/=?^_`{|}~-]+)*@(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?/),
    APPLIFT_USD_TO_POINTS_RATIO: 100, // 1 USD = 170 Points on Redeem => If the ratio is 60:40, then 60%*170 = 100+-
    CPALEAD_USD_TO_POINTS_RATIO: 100, // 1 USD = 170 Points on Redeem => If the ratio is 60:40, then 60%*170 = 100+-
    MOBILITR_INHOUSE_USD_TO_POINTS_RATIO: 100, // 1 USD = 170 Points on Redeem => If the ratio is 60:40, then 60%*170 = 100+-
    MOBILITR_APPLIFT_URL: 'http://stribeled-hortletin.com/363acfd1-3dc9-4350-9321-2dd6715f1989',
    MOBILITR_CPALEAD_URL: 'http://stribeled-hortletin.com/dd3e8f74-461b-4470-9cad-5f9aa297d87f',
    MOBILITR_INHOUSE_URL_PREFIX: 'http://stribeled-hortletin.com/',
    PARTNER_ID_APPLIFT: '1',
    PARTNER_ID_CPA_LEAD: '2',
    PARTNER_ID_MOBILITR_INHOUSE: '3',
    CPA_LEAD_CACHE_OFFERS_MINUTES: 5,
    APPLIFT_CACHE_OFFERS_MINUTES: 5,

}