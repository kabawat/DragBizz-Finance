const mongoose = require('mongoose');
const paymentSchema = require('./schema/payment.schema');
const auditLogSchema = require('./schema/auditLog.schema');
const invoiceJobSchema = require('./schema/invoiceJob.schema');
const retailPaymentAttemptSchema = require('./schema/retailPaymentAttempt.schema');
const retailWebhookEventSchema = require('./schema/retailWebhookEvent.schema');
const coreSettlementOutboxSchema = require('./schema/coreSettlementOutbox.schema');
const subscriptionActivationJobSchema = require('./schema/subscriptionActivationJob.schema');
const paymentOrderReservationSchema = require('./schema/paymentOrderReservation.schema');
const paymentWebhookEventSchema = require('./schema/paymentWebhookEvent.schema');

const PaymentModel = mongoose.model("Payment", paymentSchema);
const AuditLogModel = mongoose.model("AuditLog", auditLogSchema);
const InvoiceJobModel = mongoose.model("InvoiceJob", invoiceJobSchema);
const RetailPaymentAttemptModel = mongoose.model("RetailPaymentAttempt", retailPaymentAttemptSchema);
const RetailWebhookEventModel = mongoose.model("RetailWebhookEvent", retailWebhookEventSchema);
const CoreSettlementOutboxModel = mongoose.model("CoreSettlementOutbox", coreSettlementOutboxSchema);
const SubscriptionActivationJobModel = mongoose.model("SubscriptionActivationJob", subscriptionActivationJobSchema);
const PaymentOrderReservationModel = mongoose.model("PaymentOrderReservation", paymentOrderReservationSchema);
const PaymentWebhookEventModel = mongoose.model("PaymentWebhookEvent", paymentWebhookEventSchema);

const Models = {
    PaymentModel,
    AuditLogModel,
    InvoiceJobModel,
    RetailPaymentAttemptModel,
    RetailWebhookEventModel,
    CoreSettlementOutboxModel,
    SubscriptionActivationJobModel,
    PaymentOrderReservationModel,
    PaymentWebhookEventModel,
};

module.exports = Models;
