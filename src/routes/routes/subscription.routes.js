const router = require('express').Router();
const getActiveSubscriptionController = require('@src/controllers/subscription/getActive');

// GET /subscription/active — Retrieve the current active subscription with payment details
router.get('/active', getActiveSubscriptionController);

module.exports = router;
