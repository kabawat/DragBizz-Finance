const express = require('express');
const checkUsageController = require('@src/controllers/usage/checkUsage');
const getQuotaController = require('@src/controllers/usage/getQuota');
const incrementUsageController = require('@src/controllers/usage/incrementUsage');

const router = express.Router();

// Check if user can use a feature
router.post('/check', checkUsageController);

// Get remaining quota
router.get('/quota', getQuotaController);

// Increment usage (should be called after successful operation)
router.post('/increment', incrementUsageController);

module.exports = router;

