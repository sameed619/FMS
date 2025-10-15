import express from 'express';
// Ensure the function names here match what you exported in operatorEntryController.js
import { startWork, stopWork, getOpenEntries } from '../controllers/operatorEntryController.js'; 

const router = express.Router();

/**
 * @route POST /api/operator-entries/start
 * @description Operator ke kaam ko shuru karta hai.
 */
router.post('/start', startWork);

/**
 * @route PUT /api/operator-entries/stop
 * @description Operator ke chal rahe kaam ko khatam karta hai.
 */
router.put('/stop', stopWork);

/**
 * @route GET /api/operator-entries/open
 * @description Sabhi open operator work entries (jinmein endTime NULL hai) deta hai.
 */
router.get('/open', getOpenEntries);

// 🛑 Yeh line zaroori hai! Router ko default export karna zaroori hai. 🛑
export default router;
