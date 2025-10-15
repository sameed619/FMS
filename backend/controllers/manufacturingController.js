import { Machine, Production } from "../models/ManufacturingModel.js";
import Inventory from "../models/Inventory.js"; // Inventory remains separate for material tracking
import mongoose from "mongoose"; // Needed for transactions

// =====================================================================
// 1. MACHINE CONTROLLERS (CRUD)
// =====================================================================

// POST /api/manufacturing/machines
const createMachine = async (req, res) => {
  try {
    // NOTE: The machineId must be provided by the user in the req.body (e.g., "M-01")
    const newMachine = new Machine(req.body);
    const savedMachine = await newMachine.save();
    res.status(201).json(savedMachine);
  } catch (error) {
    // IMPROVED ERROR HANDLING for duplicate ID
    if (error.code === 11000) {
      return res
        .status(409)
        .json({
          message: `Machine ID '${req.body.machineId}' already exists. Please use a unique ID (e.g., M-07).`,
        });
    }
    res
      .status(400)
      .json({ message: "Failed to create machine.", error: error.message });
  }
};

// GET /api/manufacturing/machines
const getAllMachines = async (req, res) => {
  try {
    const machines = await Machine.find({}).sort({ name: 1 });
    res.status(200).json(machines);
  } catch (error) {
    res
      .status(500)
      .json({ message: "Failed to fetch machines.", error: error.message });
  }
};

// GET /api/manufacturing/machines/:id
const getMachineById = async (req, res) => {
  try {
    const machine = await Machine.findById(req.params.id);
    if (!machine)
      return res.status(404).json({ message: "Machine not found." });
    res.status(200).json(machine);
  } catch (error) {
    res
      .status(500)
      .json({ message: "Failed to fetch machine.", error: error.message });
  }
};

// PUT /api/manufacturing/machines/:id
const updateMachine = async (req, res) => {
  try {
    const updatedMachine = await Machine.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    if (!updatedMachine)
      return res.status(404).json({ message: "Machine not found." });
    res.status(200).json(updatedMachine);
  } catch (error) {
    res
      .status(400)
      .json({ message: "Failed to update machine.", error: error.message });
  }
};

// DELETE /api/manufacturing/machines/:id
const deleteMachine = async (req, res) => {
  // Note: Consider preventing deletion if the machine has active Production records.
  try {
    const deletedMachine = await Machine.findByIdAndDelete(req.params.id);
    if (!deletedMachine)
      return res.status(404).json({ message: "Machine not found." });
    res.status(200).json({ message: "Machine successfully deleted." });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Failed to delete machine.", error: error.message });
  }
};

// =====================================================================
// 2. PRODUCTION CONTROLLERS (CRUD - Requires Transaction for Inventory)
// =====================================================================

// POST /api/manufacturing/production
const createProductionRecord = async (req, res) => {
  const session = await mongoose.startSession(); // <--- CRITICAL ADDITION
  session.startTransaction();

  try {
    // 1. Create the Production document
    const newRecord = new Production(req.body);

    // 2. Prepare Inventory Consumption Updates
    const consumptionUpdates = (newRecord.materialsConsumed || []).map(
      (material) => ({
        updateOne: {
          filter: { _id: material.itemId },
          // Decrement stockQty by the consumed quantity (using negative value in $inc)
          update: { $inc: { stockQty: -material.qtyConsumed } },
        },
      })
    );

    // 3. Perform BULK Inventory Update (Consumption)
    if (consumptionUpdates.length > 0) {
      await Inventory.bulkWrite(consumptionUpdates, { session });
    }

    // 4. Save the Production Record
    const savedRecord = await newRecord.save({ session });

    // 5. Commit the Transaction
    await session.commitTransaction();
    session.endSession();

    res.status(201).json({
      message: "Production record created and inventory consumed successfully.",
      data: savedRecord,
    });
  } catch (error) {
    // 6. Abort Transaction on ANY error
    await session.abortTransaction();
    session.endSession();
    console.error("Production Transaction Error:", error);
    res.status(400).json({
      message: "Failed to create production record or update inventory.",
      error: error.message,
    });
  }
};

// GET /api/manufacturing/production
const getAllProductionRecords = async (req, res) => {
  try {
    const records = await Production.find({})
      .populate("machineId")
      .populate("designId")
      .populate("materialsConsumed.itemId")
      .sort({ date: -1 });
    res.status(200).json(records);
  } catch (error) {
    res.status(500).json({
      message: "Failed to fetch production records.",
      error: error.message,
    });
  }
};

// GET /api/manufacturing/production/:id
const getProductionRecordById = async (req, res) => {
  try {
    const record = await Production.findById(req.params.id)
      .populate("machineId")
      .populate("designId")
      .populate("materialsConsumed.itemId");

    if (!record)
      return res.status(404).json({ message: "Production record not found." });
    res.status(200).json(record);
  } catch (error) {
    res.status(500).json({
      message: "Failed to fetch production record.",
      error: error.message,
    });
  }
};

// PUT /api/manufacturing/production/:id (Placeholder for complex logic)
const updateProductionRecord = async (req, res) => {
  // WARNING: Complex transaction logic required to reverse and reapply stock consumption.
  res.status(501).json({
    message: "Update functionality requires custom stock reversal logic.",
  });
};

// DELETE /api/manufacturing/production/:id (Placeholder for complex logic)
const deleteProductionRecord = async (req, res) => {
  // WARNING: Complex transaction logic required to reverse stock consumption and then delete.
  res.status(501).json({
    message: "Delete functionality requires custom stock reversal logic.",
  });
};

// =====================================================================
// 3. EXPORT ALL FUNCTIONS
// =====================================================================
export {
  createMachine,
  getAllMachines,
  getMachineById,
  updateMachine,
  deleteMachine,
  createProductionRecord,
  getAllProductionRecords,
  getProductionRecordById,
  updateProductionRecord,
  deleteProductionRecord,
};
