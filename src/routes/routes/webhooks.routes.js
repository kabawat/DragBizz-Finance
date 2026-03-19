const router = require('express').Router();
const express = require('express');
const razorpayWebhookController = require('@src/controllers/payment/webhook');

router.post('/razorpay', razorpayWebhookController);

module.exports = router;
