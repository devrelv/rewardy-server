'use strict';
const consts = require('../../consts');

function Offer (id, click_url, applift_click_url, points, cta_text, icon_url, title, store_rating, action, countries, devices, bundle_id, platform) {
    this.id = id;
    this.click_url = click_url;
    this.applift_click_url = applift_click_url
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

Offer.prototype.parseResponse = function(responseObject, userId, userCountryCode, userDevice, userPlatform) {
    this.id = responseObject.campaigns[0].id;
    this.applift_click_url = responseObject.campaigns[0].click_url;
    let applift_click_url_parameters = parseQueryString(this.applift_click_url);
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