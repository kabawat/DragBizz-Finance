const mongoose = require('mongoose');
const { nanoid } = require('nanoid');
const { PaymentModel, PaymentOrderReservationModel } = require('@src/models');
const { generateIdempotencyKey } = require('@src/utils/security/idempotency');
const { validateAmount } = require('@src/utils/security/amount.validation');
const { logPaymentEvent } = require('@src/utils/audit/audit.logger');
const logger = require('@src/utils/logger');
const { getActiveGateway } = require('@src/lib/payment/gateway.factory');
const { presentOrder } = require('./present.service');

async function createPaymentOrder({
    userId,
    amount,
    currency = 'INR',
    description,
    customer = {},
    context = {},
    idempotencyKey,
    ipAddress,
    userAgent
}) {
    const gateway = getActiveGateway();
    const amountValidation = validateAmount(amount);
    if (!amountValidation.isValid) {
        throw new Error(`Invalid final amount: ${amountValidation.error}`);
    }
    if (Math.round(Number(amount) * 100) < 100) {
        throw new Error('Minimum amount is ₹1.00');
    }

    const reference = context.packageId || context.referenceId || description || 'payment';
    const finalIdempotencyKey = idempotencyKey || generateIdempotencyKey(userId, reference, amount);
    const leaseUntil = new Date(Date.now() + 2 * 60 * 1000);
    let reservation;
    try {
        reservation = await PaymentOrderReservationModel.findOneAndUpdate(
            { key: finalIdempotencyKey, $or: [
                { status: 'CREATING', leaseUntil: { $lt: new Date() } },
                { status: 'FAILED' },
            ] },
            { $set: { userId: String(userId), status: 'CREATING', leaseUntil, error: null } }, { new: true }
        );
        if (!reservation) reservation = await PaymentOrderReservationModel.create({ key: finalIdempotencyKey, userId: String(userId), leaseUntil });
        if (reservation.status === 'CREATED' && reservation.paymentId) {
            const existing = await PaymentModel.findById(reservation.paymentId);
            if (existing) return presentOrder(existing);
        }
    } catch (error) {
        if (error.code !== 11000) throw error;
        const existing = await PaymentOrderReservationModel.findOne({ key: finalIdempotencyKey });
        if (existing?.paymentId) return presentOrder(await PaymentModel.findById(existing.paymentId));
        throw Object.assign(new Error('Payment order is already being created; retry shortly'), { statusCode: 409, code: 'ORDER_IN_PROGRESS' });
    }

    const orderId = `order_${nanoid(16)}`;
    let created;
    try { created = await gateway.createOrder({
        orderId,
        amount,
        currency,
        userId,
        email: customer.email,
        phone: customer.phone,
        customerName: customer.name,
        packageId: context.packageId,
        packageName: description,
        months: context.months,
        billingCycle: context.billingCycle
    }); } catch (error) {
        await PaymentOrderReservationModel.updateOne({ _id: reservation._id }, { $set: { status: 'FAILED', error: String(error.message).slice(0, 500), leaseUntil: null } });
        throw error;
    }

    const persistence = { ...(created.persistence || {}) };
    const metadataPatch = persistence.metadataPatch;
    delete persistence.metadataPatch;

    const payment = new PaymentModel({
        userId,
        agencyId: context.agencyId || null,
        ...(context.packageId && { packageId: context.packageId }),
        paymentId: new mongoose.Types.ObjectId(),
        orderId,
        gatewayOrderId: created.gatewayOrderId,
        amount,
        currency,
        baseAmount: context.baseAmount != null ? context.baseAmount : amount,
        discountAmount: context.discountAmount || 0,
        taxAmount: context.taxAmount || 0,
        finalAmount: amount,
        ...(context.billingCycle && { billingCycle: context.billingCycle }),
        ...(context.months && { months: context.months }),
        status: 'PENDING',
        gateway: gateway.schemaId,
        couponCode: context.couponCode || null,
        discountPercentage: context.discountPercentage || 0,
        gstPercentage: context.gstPercentage || 0,
        checkout: created.checkout,
        gatewayResponse: created.raw,
        expiresAt: new Date(Date.now() + 30 * 60 * 1000),
        ...persistence,
        metadata: {
            idempotencyKey: finalIdempotencyKey,
            ipAddress,
            userAgent,
            description: description || null,
            ...(customer.email && { email: customer.email }),
            ...(customer.phone && { phone: customer.phone }),
            ...(metadataPatch || {}),
            ...(context.metadata || {})
        }
    });

    let savedPayment;
    try {
        savedPayment = await payment.save();
    } catch (err) {
        if (err.code === 11000) {
            const existing = await PaymentModel.findOne({ 'metadata.idempotencyKey': finalIdempotencyKey, userId });
            if (existing) {
                await PaymentOrderReservationModel.updateOne({ _id: reservation._id }, { $set: { status: 'CREATED', paymentId: existing._id, orderId: existing.orderId, leaseUntil: null } });
                return presentOrder(existing);
            }
        }
        throw err;
    }

    await PaymentOrderReservationModel.updateOne({ _id: reservation._id }, { $set: { status: 'CREATED', paymentId: savedPayment._id, orderId: savedPayment.orderId, leaseUntil: null } });

    setImmediate(() => {
        logPaymentEvent('PAYMENT_ORDER_CREATED', {
            paymentId: savedPayment._id,
            orderId,
            userId,
            amount: savedPayment.finalAmount,
            status: savedPayment.status,
            gateway: gateway.schemaId,
            ipAddress,
            userAgent
        }).catch((error) => {
            logger.error('Background payment audit log failed', { error: error?.message });
        });
    });

    return presentOrder(savedPayment);
}

module.exports = { createPaymentOrder };
