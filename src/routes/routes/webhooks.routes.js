const router = require('express').Router();
const createWebhookController = require('@src/controllers/payment/webhook');

router.post('/payment', createWebhookController(null));
router.post('/:provider', (req, res) => createWebhookController(req.params.provider)(req, res));

module.exports = router;
