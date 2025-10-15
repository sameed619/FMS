import express from "express";
import * as ManufacturingController from "../controllers/manufacturingController.js";

const router = express.Router();

// =========================================================
// 1. MACHINE ROUTES (/api/manufacturing/machines)
//    Handles Machine CRUD operations
// =========================================================

// @route  POST /api/manufacturing/machines
// @desc   Create new Machine
router.post("/machines", ManufacturingController.createMachine);

// @route  GET /api/manufacturing/machines
// @desc   Get all Machines
router.get("/machines", ManufacturingController.getAllMachines);

// @route  GET /api/manufacturing/machines/:id
// @desc   Get single Machine by ID
router.get("/machines/:id", ManufacturingController.getMachineById);

// @route  PUT /api/manufacturing/machines/:id
// @desc   Update Machine
router.put("/machines/:id", ManufacturingController.updateMachine);

// @route  DELETE /api/manufacturing/machines/:id
// @desc   Delete Machine
router.delete("/machines/:id", ManufacturingController.deleteMachine);

// =========================================================
// 2. PRODUCTION ROUTES (/api/manufacturing/production)
//    Handles unified Production Record CRUD and logging
// =========================================================

// @route  POST /api/manufacturing/production
// @desc   Create new unified Production Record (with transaction)
router.post("/production", ManufacturingController.createProductionRecord);

// @route  GET /api/manufacturing/production
// @desc   Get all Production Records
router.get("/production", ManufacturingController.getAllProductionRecords);

// @route  GET /api/manufacturing/production/:id
// @desc   Get single Production Record by ID
router.get("/production/:id", ManufacturingController.getProductionRecordById);

// @route  PUT /api/manufacturing/production/:id
// @desc   Update Production Record (requires stock reversal logic in controller)
router.put("/production/:id", ManufacturingController.updateProductionRecord);

// @route  DELETE /api/manufacturing/production/:id
// @desc   Delete Production Record (requires stock reversal logic in controller)
router.delete(
  "/production/:id",
  ManufacturingController.deleteProductionRecord
);

export default router;
