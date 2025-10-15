import express from 'express';
import { createUser } from '../controllers/userController.js'; 

const router = express.Router();

/**
 * @route POST /api/users
 * @description Naye user/operator ki entry karta hai.
 */
router.post('/', createUser);

export default router;
