const express = require('express');
const { handlePurwaRpc } = require('../controllers/purwaController');

const router = express.Router();

/**
 * Route tunggal JSON RPC Purwaverse
 * Menerima request POST /api/purwa
 */
router.post('/purwa', handlePurwaRpc);

module.exports = router;
