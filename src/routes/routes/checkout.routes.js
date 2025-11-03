const router = require('express').Router();

router.post('/session', async (req, res) => {
  return res.status(201).json({ status: true, data: { checkoutUrl: null } });
});

module.exports = router;

