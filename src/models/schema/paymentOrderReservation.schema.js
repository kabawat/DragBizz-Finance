const mongoose = require('mongoose');

const RESERVATION_STATUS = ['CREATING', 'CREATED', 'FAILED'];

const paymentOrderReservationSchema = new mongoose.Schema(
    {
        key: {
            type: String,
            required: true,
            unique: true,
            trim: true,
        },
        userId: {
            type: String,
            required: true,
            index: true,
            trim: true,
        },
        status: {
            type: String,
            enum: RESERVATION_STATUS,
            default: 'CREATING',
            index: true,
        },
        paymentId: {
            type: mongoose.Schema.Types.ObjectId,
            default: null,
            index: true,
            ref: 'Payment',
        },
        orderId: {
            type: String,
            default: null,
            trim: true,
        },
        error: {
            type: String,
            default: null,
        },
        leaseUntil: {
            type: Date,
            default: null,
            index: true,
        },
    },
    {
        timestamps: true,
        strict: 'throw',
    }
);

paymentOrderReservationSchema.index({ status: 1, leaseUntil: 1 });

module.exports = paymentOrderReservationSchema;
