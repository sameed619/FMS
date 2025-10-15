import express from "express";
import {
  getAllPurchaseEntries,
  getPurchaseEntryById,
  createPurchaseEntry,
  updatePurchaseEntry,
  deletePurchaseEntry,
} from "../controllers/purchaseController.js";

const router = express.Router();

// @route   GET /api/purchase
// @desc    Get all purchase entries
// @access  Public
router.get("/", getAllPurchaseEntries);

// @route   GET /api/purchase/:id
// @desc    Get single purchase entry by ID
// @access  Public
router.get("/:id", getPurchaseEntryById);

// @route   POST /api/purchase
// @desc    Create new purchase entry
// @access  Public
router.post("/", createPurchaseEntry);

// @route   PUT /api/purchase/:id
// @desc    Update purchase entry
// @access  Public
router.put("/:id", updatePurchaseEntry);

// @route   DELETE /api/purchase/:id
// @desc    Delete purchase entry
// @access  Public
router.delete("/:id", deletePurchaseEntry);

export default router;



