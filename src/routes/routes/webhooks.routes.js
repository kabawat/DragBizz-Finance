const router = require('express').Router();

// Provider will post events here
router.post('/provider', async (req, res) => {
  // Verify signature with provider SDK in implementation
  return res.status(200).json({ received: true });
});

module.exports = router;

