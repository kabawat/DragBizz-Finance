const mongoose = require('mongoose');
const paymentSchema = require('./schema/payment.schema');
const auditLogSchema = require('./schema/auditLog.schema');
const invoiceJobSchema = require('./schema/invoiceJob.schema');

const PaymentModel = mongoose.model("Payment", paymentSchema);
const AuditLogModel = mongoose.model("AuditLog", auditLogSchema);
const InvoiceJobModel = mongoose.model("InvoiceJob", invoiceJobSchema);

const Models = {
    PaymentModel,
    AuditLogModel,
    InvoiceJobModel,
};

module.exports = Models;
