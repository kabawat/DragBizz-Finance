const mongoose = require('mongoose');
const paymentSchema = require('./schema/payment.schema');
const auditLogSchema = require('./schema/auditLog.schema');
const invoiceJobSchema = require('./schema/invoiceJob.schema');
const retailPaymentAttemptSchema = require('./schema/retailPaymentAttempt.schema');
const retailWebhookEventSchema = require('./schema/retailWebhookEvent.schema');
const coreSettlementOutboxSchema = require('./schema/coreSettlementOutbox.schema');

const PaymentModel = mongoose.model("Payment", paymentSchema);
const AuditLogModel = mongoose.model("AuditLog", auditLogSchema);
const InvoiceJobModel = mongoose.model("InvoiceJob", invoiceJobSchema);
const RetailPaymentAttemptModel = mongoose.model("RetailPaymentAttempt", retailPaymentAttemptSchema);
const RetailWebhookEventModel = mongoose.model("RetailWebhookEvent", retailWebhookEventSchema);
const CoreSettlementOutboxModel = mongoose.model("CoreSettlementOutbox", coreSettlementOutboxSchema);

const Models = {
    PaymentModel,
    AuditLogModel,
    InvoiceJobModel,
    RetailPaymentAttemptModel,
    RetailWebhookEventModel,
    CoreSettlementOutboxModel,
};

module.exports = Models;
