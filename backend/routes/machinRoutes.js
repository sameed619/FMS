import express from 'express';
import { 
    createMachine, // Handles POST to /api/machines
    getAllMachines // Handles GET to /api/machines
} from '../controllers/machineController.js';

const router = express.Router();

/**
 * @route POST /api/machines
 * @description Nayi machine ki entry karta hai.
 */
router.post('/', createMachine);

/**
 * @route GET /api/machines
 * @description Sabhi machine records deta hai. Search, filter aur pagination support karta hai.
 */
router.get('/', getAllMachines);

export default router;
