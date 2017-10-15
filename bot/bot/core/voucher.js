'use strict';

function Voucher(voucherId, title, description, imageUrl, points) {
    this.voucherId = voucherId;
    this.title = title;
    this.description = description;
    this.imageUrl = imageUrl;
    this.points = points;
    
    Object.freeze(this);
}

module.exports = Voucher;
