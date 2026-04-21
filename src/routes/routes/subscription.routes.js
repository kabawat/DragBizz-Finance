const router = require('express').Router();
const getActive = require('@src/controllers/subscription/getActive');
const ownerMiddleware = require('@src/middlewares/owner.middleware');

// GET /subscription/active — Retrieve the current active subscription with payment details
router.get('/active', ownerMiddleware, getActive);

module.exports = router;
