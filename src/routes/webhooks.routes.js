const router = require('express').Router();
const createWebhookController = require('@src/controllers/payment/webhook.controller');
const { handleRetailWebhookController } = require('@src/controllers/payment/retailWebhook.controller');

router.post('/retail/:provider', handleRetailWebhookController);
router.post('/payment', createWebhookController(null));
router.post('/:provider', (req, res) => createWebhookController(req.params.provider)(req, res));

module.exports = router;
