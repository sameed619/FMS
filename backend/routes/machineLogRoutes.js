import express from 'express';
import { 
    updateProductionFulfillment, // Handles PUT to /api/machine-logs/fulfill
    getAllMachineLogs           // Handles GET to /api/machine-logs
} from '../controllers/machineLogController.js';

const router = express.Router();

/**
 * @route PUT /api/machine-logs/fulfill
 * @description Production Order ko 'Completed' mark karta hai aur final output/wastage record karta hai.
 */
router.put('/fulfill', updateProductionFulfillment);

/**
 * @route GET /api/machine-logs
 * @description Sabhi Machine Logs records deta hai. Shift filter support karta hai.
 */
router.get('/', getAllMachineLogs);

export default router;
