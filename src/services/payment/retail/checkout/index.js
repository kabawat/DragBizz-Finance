const { getDetails, createCheckout, verifyPayment, getStatus } = require('./service');
const { getCredentials } = require('./credentials');

module.exports = {
    getDetails,
    createCheckout,
    verifyPayment,
    getStatus,
    getCredentials,
};

