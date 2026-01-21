const router = require('express').Router();
const getActiveSubscription = require('@src/controllers/subscription/getActiveSubscription');

router.get('/active', getActiveSubscription);

module.exports = router;

