const { getInvoices } = require('./invoice.service');
const { getPurchaseHistory } = require('./history.service');

module.exports = { getInvoices, getPurchaseHistory };
