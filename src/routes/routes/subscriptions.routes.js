const router = require('express').Router();

router.get('/', async (req, res) => {
  return res.json({ status: true, data: [] });
});

router.post('/', async (req, res) => {
  return res.status(201).json({ status: true, message: 'Subscription created' });
});

module.exports = router;

