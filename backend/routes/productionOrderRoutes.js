import express from 'express';
import { 
    createProductionOrder, 
    getAllProductionOrders, 
    getOpenProductionOrders, // 🔥 Import Zaroori Fix
    getProductionOrderById,   // 🔥 Import Naya Function
    updateProductionOrder     // 🔥 Import Naya Function
} from '../controllers/productionController.js'; // Note: File name 'productionController.js' se 'productionOrderController.js' mein badal diya gaya hai.

const router = express.Router();

// =======================================================
// PRODUCTION ORDER ENDPOINTS
// =======================================================

// 1. GET ALL ORDERS (List View)
router.get('/', getAllProductionOrders);

// 2. GET OPEN ORDERS (Fulfillment Form Dropdown FIX)
// ROUTE: GET /api/production-orders/open
router.get('/open', getOpenProductionOrders); // 🔥 Yahi route pichle error ko theek karega

// 3. CREATE ORDER (Stock Consumption)
// ROUTE: POST /api/production-orders
router.post('/', createProductionOrder);

// 4. GET SINGLE ORDER BY ID (Detail View)
// ROUTE: GET /api/production-orders/:id
router.get('/:id', getProductionOrderById);

// 5. UPDATE ORDER STATUS/DETAILS (Used by Fulfillment form to mark as 'Completed')
// ROUTE: PUT /api/production-orders/:id
router.put('/:id', updateProductionOrder); 


export default router;