const router = require('express').Router();
const getActive = require('@src/controllers/subscription/getActive');

// GET /subscription/active — Retrieve the current active subscription with payment details
router.get('/active', getActive);

module.exports = router;
