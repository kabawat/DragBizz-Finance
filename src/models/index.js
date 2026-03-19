const mongoose = require('mongoose');
const packageSchema = require('./schema/package.schema');
const paymentSchema = require('./schema/payment.schema');
const subscriptionSchema = require('./schema/subscription.schema');
const auditLogSchema = require('./schema/auditLog.schema');

const PackageModel = mongoose.model("Package", packageSchema);
const PaymentModel = mongoose.model("Payment", paymentSchema);
const SubscriptionModel = mongoose.model("Subscription", subscriptionSchema);
const AuditLogModel = mongoose.model("AuditLog", auditLogSchema);

const Models = {
    PackageModel,
    PaymentModel,
    SubscriptionModel,
    AuditLogModel
};

module.exports = Models;