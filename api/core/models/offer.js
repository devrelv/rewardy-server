'use strict';
const consts = require('../../consts');

function Offer (id, click_url, points, cta_text, icon_url, title, store_rating, action, countries, devices, bundle_id, platform) {
    this.id = id;
    this.click_url = click_url;
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

Offer.prototype.parseResponse = function(responseObject) {
    this.id = responseObject.campaigns[0].id;
    this.click_url = responseObject.campaigns[0].click_url;
    this.countries = responseObject.campaigns[0].countries;
    this.devices = responseObject.campaigns[0].devices;
    this.points = Math.floor(Number(responseObject.campaigns[0].payout) * consts.APPLIFT_USD_TO_POINTS_RATIO); // round 1234.5678 to 1230
    if (responseObject.action) {
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


module.exports = Offer;