const mongoose = require('mongoose');
const paymentSchema = require('./schema/payment.schema');
const auditLogSchema = require('./schema/auditLog.schema');

const PaymentModel = mongoose.model("Payment", paymentSchema);
const AuditLogModel = mongoose.model("AuditLog", auditLogSchema);

const Models = {
    PaymentModel,
    AuditLogModel
};

module.exports = Models;
