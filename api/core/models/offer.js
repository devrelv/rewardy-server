'use strict';
const consts = require('../../consts');
const NO_IMAGE_REPLACEMENT = 'https://rewardy.co/img/hero-fail@2x.png';

function Offer (id, click_url, original_click_url, points, cta_text, icon_url, title, store_rating, action, countries, devices, bundle_id, platform) {
    this.id = id;
    this.click_url = click_url;
    this.original_click_url = original_click_url
    this.points = points;
    this.cta_text = cta_text;
    this.icon_url = icon_url;
    this.title = title;
    this.store_rating = store_rating;
    this.action = action;
    this.countries = countries;
    this.devices = devices;
    this.bundle_id = bundle_id;
    this.platform = platform;
}

Offer.prototype.parseAppliftResponse = function(responseObject, userId, userCountryCode, userDevice, userPlatform) {
    this.id = responseObject.campaigns[0].id;
    this.original_click_url = responseObject.campaigns[0].click_url;
    let applift_click_url_parameters = parseQueryString(this.original_click_url);
    this.click_url = process.env.SERVER_API_URL + 'offer_click?partner=1&uid=' + userId + '&offer=' + this.id + '&countryCode='+ userCountryCode + '&device=' + userDevice + '&platform=' + userPlatform + '&token=' + applift_click_url_parameters.token;
    this.countries = responseObject.campaigns[0].countries;
    this.devices = responseObject.campaigns[0].devices;
    this.points = Math.floor(Number(responseObject.campaigns[0].payout) * consts.APPLIFT_USD_TO_POINTS_RATIO); // round 1234.5678 to 1230
    if (responseObject.campaigns[0].action) {
        switch (responseObject.campaigns[0].action.event) {
            case 'registration':
                this.action = 'Complete Registration';
                break;
            case 'tutorial_completion':
                this.action = 'Complete Tutorial';
                break;
            case 'level_achieved':
                this.action = 'Achieve Level';
                if (responseObject.campaigns[0].action.level) {
                    this.action += ' ' + responseObject.campaigns[0].action.level;
                }
                break;
            case 'custom':
                this.action = responseObject.campaigns[0].action.text;
                break;
            default:
                this.action = responseObject.campaigns[0].action.text || 'Install';
                break;
        }
    } else {
        this.action = 'Install';        
    }
    this.cta_text = responseObject.creatives[0].cta_text;
    this.icon_url = responseObject.creatives[0].icon_url;
    this.title = responseObject.creatives[0].title;
    this.store_rating = responseObject.app_details.store_rating;
    this.bundle_id = responseObject.app_details.bundle_id;
    this.platform = responseObject.app_details.platform;

}

Offer.prototype.parseCpaLeadResponse = function(responseObject, userId, userCountryCode, userDevice, userPlatform) {
    this.id = responseObject.campid;
    this.original_click_url = responseObject.link;
    this.click_url = process.env.SERVER_API_URL + 'offer_click?partner=1&uid=' + userId + '&offer=' + this.id + '&countryCode='+ userCountryCode + '&device=' + userDevice + '&platform=' + userPlatform;
    this.countries = [responseObject.country];
    this.devices = 'phone';
    this.points = Math.floor(Number(responseObject.amount) * consts.CPALEAD_USD_TO_POINTS_RATIO);
    if (responseObject.payout_type) {
        switch (responseObject.payout_type) {
            case 'CPI':
                this.action = 'Install';
                break;
            case 'CPA':
                this.action = responseObject.conversion;
                break;
        }
    } else {
        this.action = 'Install';        
    }
    this.cta_text = responseObject.button_text;
    if (responseObject.creatives && responseObject.creatives.length > 0) {
        this.icon_url = responseObject.creatives[0].url;
    } else if (responseObject.previews && responseObject.previews.length > 0) {
        this.icon_url = responseObject.previews[0].url;
    } else {
        this.icon_url = NO_IMAGE_REPLACEMENT;
    }
    this.title = responseObject.title;
    this.store_rating = null;
    this.bundle_id = null;
    this.platform = responseObject.mobile_app_type;
}

var parseQueryString = function(url) {
    var urlParams = {};
    url.replace(
      new RegExp("([^?=&]+)(=([^&]*))?", "g"),
      function($0, $1, $2, $3) {
        urlParams[$1] = $3;
      }
    );
    
    return urlParams;
  }


module.exports = Offer;