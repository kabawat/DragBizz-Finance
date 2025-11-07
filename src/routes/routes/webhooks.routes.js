const router = require('express').Router();
const express = require('express');
const razorpayWebhookController = require('@src/controllers/payment/webhook');

router.post('/razorpay', 
    express.raw({ type: 'application/json' }),
    async (req, res, next) => {
        try {
            req.body = JSON.parse(req.body.toString());
            next();
        } catch (error) {
            return res.status(400).json({ error: 'Invalid JSON payload' });
        }
    },
    razorpayWebhookController
);

router.post('/provider', async (req, res) => {
    return res.status(200).json({ received: true });
});

module.exports = router;

