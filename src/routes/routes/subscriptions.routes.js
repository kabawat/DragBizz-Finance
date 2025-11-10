const router = require('express').Router();
const getActiveSubscriptionController = require('@src/controllers/subscription/getActiveSubscription');

// Get active subscription for current user
router.get('/active', getActiveSubscriptionController);

router.get('/', async (req, res) => {
  return res.json({ status: true, data: [] });
});

router.post('/', async (req, res) => {
  return res.status(201).json({ status: true, message: 'Subscription created' });
});

module.exports = router;

