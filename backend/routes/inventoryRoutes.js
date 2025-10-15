import express from "express";
import {
    getAllInventory,
    getInventoryById,
    createInventoryItem,
    updateInventoryItem,
    deleteInventoryItem,
    getInventoryByItemId,
    updateStock // The custom function to adjust stock levels
} from "../controllers/inventoryController.js";

const router = express.Router();

// --- Routes for /api/inventory ---

router.route("/")
    // @route   GET /api/inventory
    // @desc    Get all inventory items (with optional itemType filter)
    // @access  Public
    .get(getAllInventory)

    // @route   POST /api/inventory
    // @desc    Create new inventory item
    // @access  Public
    .post(createInventoryItem);

    router.route("/item/:itemId") // <-- NEW ROUTE PATH
    // @route   GET /api/inventory/item/:itemId
    // @desc    Get single inventory item by custom itemId (e.g., MSK-101)
    // @access  Public
    .get(getInventoryByItemId); // <-- MAPPED TO THE NEW CONTROLLER

// --- Routes for /api/inventory/:id ---

router.route("/:id")
    // @route   GET /api/inventory/:id
    // @desc    Get single inventory item by ID
    // @access  Public
    .get(getInventoryById)

    // @route   PUT /api/inventory/:id
    // @desc    Update inventory item (e.g., name, price, supplier)
    // @access  Public
    .put(updateInventoryItem)

    // @route   DELETE /api/inventory/:id
    // @desc    Delete inventory item
    // @access  Public
    .delete(deleteInventoryItem);

// --- Custom Stock Update Route ---

router.route("/:id/stock")
    // @route   PUT /api/inventory/:id/stock
    // @desc    Update stock quantity (add or subtract)
    // @access  Public
    .put(updateStock);

export default router;