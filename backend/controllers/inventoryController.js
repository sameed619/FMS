// Change this import to your local Prisma Client instance
import prisma from '../utils/prisma.js'; // Adjust the path as necessary, e.g., '../lib/prisma.js'

// Helper function to handle the custom itemId formatting and validation
// This replaces the Mongoose pre-save hook and regex validation.
const formatAndValidateItemId = (itemId) => {
    if (!itemId) {
        throw new Error("Item ID is required.");
    }
    let formattedId = itemId.trim().toUpperCase();
    const prefix = 'MSK-';

    // Logic: Prepend prefix if only number is given
    if (!formattedId.startsWith(prefix) && !isNaN(formattedId) && formattedId.length > 0) {
        formattedId = prefix + formattedId;
    }
    
    // Validation: Must match the format /^MSK-\d+$/
    const regex = /^MSK-\d+$/;
    if (!regex.test(formattedId)) {
        throw new Error("Item ID must be in the format 'MSK-XXX'.");
    }
    
    return formattedId;
};

// =========================================================================

// @desc      Get all inventory items
// @route     GET /api/inventory
// @access    Public
export const getAllInventory = async (req, res) => {
    try {
        const { itemType } = req.query;
        let where = {}; // Prisma uses 'where' instead of Mongoose's direct query object

        if (itemType) {
            // Prisma will automatically validate itemType against the ItemType Enum
            where.itemType = itemType; 
        }

        const inventory = await prisma.inventory.findMany({
            where: where,
            // Mongoose: .sort({ createdAt: -1 }) -> Prisma: orderBy: { createdAt: 'desc' }
            orderBy: {
                createdAt: 'desc',
            },
        });

        res.status(200).json({
            success: true,
            count: inventory.length,
            data: inventory,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Error fetching inventory",
            error: error.message,
        });
    }
};

// -------------------------------------------------------------------------

// @desc      Get single inventory item
// @route     GET /api/inventory/:id
// @access    Public
export const getInventoryByItemId = async (req, res) => {
    try {
        const { itemId } = req.params;

        // 1. Format the itemId to match the stored format (e.g., MSK-101)
        // This ensures the search works regardless of user's casing/spacing in the request.
        const searchItemId = itemId.trim().toUpperCase();

        // 2. Use Prisma's findUnique method on the @unique field (itemId)
        const inventory = await prisma.inventory.findUnique({
            where: {
                itemId: searchItemId,
            },
        });

        if (!inventory) {
            // 404 if no item found
            return res.status(404).json({
                success: false,
                message: `Inventory item with itemId ${searchItemId} not found`,
            });
        }

        // 200 success response
        res.status(200).json({
            success: true,
            data: inventory,
        });
    } catch (error) {
        // Generic 500 error handling
        res.status(500).json({
            success: false,
            message: "Error fetching inventory item by itemId",
            error: error.message,
        });
    }
};
export const getInventoryById = async (req, res) => {
    try {
        // Mongoose: findById(req.params.id) -> Prisma: findUnique({ where: { id: ... } })
        // Note: Prisma IDs are Int, so we must parse the parameter.
        const id = parseInt(req.params.id);
        if (isNaN(id)) {
             return res.status(400).json({ success: false, message: "Invalid ID format" });
        }
        
        const inventory = await prisma.inventory.findUnique({
            where: {
                id: id,
            },
        });

        if (!inventory) {
            return res.status(404).json({
                success: false,
                message: "Inventory item not found",
            });
        }

        res.status(200).json({
            success: true,
            data: inventory,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Error fetching inventory item",
            error: error.message,
        });
    }
};

// -------------------------------------------------------------------------

// @desc      Create new inventory item
// @route     POST /api/inventory
// @access    Public
export const createInventoryItem = async (req, res) => {
    const {
        itemId,
        itemType,
        name,
        stockQty,
        unit,
        supplier,
        billNumber,
        pricePerUnit,
    } = req.body;

    try {
        // --- Step 1: Controller-Level Validation ---
        // Validate required fields (using existing Mongoose logic)
        if (
            !itemId || !itemType || !name || 
            stockQty === undefined || !unit || !supplier || 
            pricePerUnit === undefined // Use undefined check for 0 values
        ) {
            return res.status(400).json({
                success: false,
                message: "Please provide all required fields: itemType, name, stockQty, unit, supplier, pricePerUnit",
            });
        }
        
        // Validate stockQty and pricePerUnit are non-negative
        if (stockQty < 0 || pricePerUnit < 0) {
            return res.status(400).json({ success: false, message: "Stock quantity and price cannot be negative." });
        }

        // Validate itemType using the Enum values
        if (!["Fabric", "Thread"].includes(itemType)) {
            return res.status(400).json({
                success: false,
                message: 'itemType must be either "Fabric" or "Thread"',
            });
        }

        // Apply custom itemId formatting and validation (replaces Mongoose pre-save hook)
        const validatedItemId = formatAndValidateItemId(itemId);

        // --- Step 2: Database Creation ---
        // Mongoose: new Inventory().save() -> Prisma: create()
        const inventory = await prisma.inventory.create({
            data: {
                itemId: validatedItemId,
                itemType: itemType, // Enum value passed as string
                name: name,
                stockQty: parseInt(stockQty), // Ensure Int
                unit: unit,
                supplier: supplier,
                billNumber: billNumber,
                pricePerUnit: parseFloat(pricePerUnit), // Ensure Float
                // lastPurchaseDate is defaulted by Prisma schema
            },
        });

        res.status(201).json({
            success: true,
            message: "Inventory item created successfully",
            data: inventory,
        });
    } catch (error) {
        // Catch Prisma errors, specifically P2002 (Unique constraint failed) for itemId
        let errorMessage = "Error creating inventory item";
        if (error.code === 'P2002' && error.meta?.target.includes('itemId')) {
            errorMessage = "Inventory item ID (itemId) must be unique.";
            return res.status(400).json({ success: false, message: errorMessage });
        }
        
        res.status(500).json({
            success: false,
            message: errorMessage,
            error: error.message,
        });
    }
};

// -------------------------------------------------------------------------

// @desc      Update inventory item
// @route     PUT /api/inventory/:id
// @access    Public
export const updateInventoryItem = async (req, res) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
         return res.status(400).json({ success: false, message: "Invalid ID format" });
    }
    
    // Destructure to ensure itemId is NOT updated via this route, if desired, 
    // or validate it if it is allowed to change. Here, we'll allow it but validate.
    const { itemId, itemType, stockQty, pricePerUnit, ...updateData } = req.body;
    let dataToUpdate = { ...updateData };

    try {
        // Validate and format itemId if provided
        if (itemId) {
            dataToUpdate.itemId = formatAndValidateItemId(itemId);
        }
        
        // Validate itemType if provided
        if (itemType && !["Fabric", "Thread"].includes(itemType)) {
            return res.status(400).json({ success: false, message: 'itemType must be either "Fabric" or "Thread"' });
        }
        if (itemType) dataToUpdate.itemType = itemType;
        
        // Handle numeric conversions and validation
        if (stockQty !== undefined) {
             if (stockQty < 0) return res.status(400).json({ success: false, message: "Stock quantity cannot be negative." });
             dataToUpdate.stockQty = parseInt(stockQty);
        }
        if (pricePerUnit !== undefined) {
             if (pricePerUnit < 0) return res.status(400).json({ success: false, message: "Price per unit cannot be negative." });
             dataToUpdate.pricePerUnit = parseFloat(pricePerUnit);
        }

        // Mongoose: findByIdAndUpdate -> Prisma: update
        const inventory = await prisma.inventory.update({
            where: { id: id },
            data: dataToUpdate,
        });

        res.status(200).json({
            success: true,
            message: "Inventory item updated successfully",
            data: inventory,
        });
    } catch (error) {
        // Handle 404 Not Found (Prisma error P2025) or Unique constraint failure (P2002)
        let errorMessage = "Error updating inventory item";
        if (error.code === 'P2025') {
            return res.status(404).json({ success: false, message: "Inventory item not found" });
        }
        if (error.code === 'P2002') {
            errorMessage = "Inventory item ID (itemId) must be unique.";
            return res.status(400).json({ success: false, message: errorMessage });
        }
        
        res.status(500).json({
            success: false,
            message: errorMessage,
            error: error.message,
        });
    }
};

// -------------------------------------------------------------------------

// @desc      Delete inventory item
// @route     DELETE /api/inventory/:id
// @access    Public
export const deleteInventoryItem = async (req, res) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
         return res.status(400).json({ success: false, message: "Invalid ID format" });
    }
    
    try {
        // Mongoose: findByIdAndDelete -> Prisma: delete
        await prisma.inventory.delete({
            where: { id: id },
        });

        res.status(200).json({
            success: true,
            message: "Inventory item deleted successfully",
            data: {},
        });
    } catch (error) {
        // Handle 404 Not Found (Prisma error P2025)
        if (error.code === 'P2025') {
            return res.status(404).json({
                success: false,
                message: "Inventory item not found",
            });
        }
        
        res.status(500).json({
            success: false,
            message: "Error deleting inventory item",
            error: error.message,
        });
    }
};

// -------------------------------------------------------------------------

// @desc      Update stock quantity
// @route     PUT /api/inventory/:id/stock
// @access    Public
export const updateStock = async (req, res) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
         return res.status(400).json({ success: false, message: "Invalid ID format" });
    }
    
    try {
        const { qty, operation } = req.body; // operation: 'add' or 'subtract'

        if (!qty || !operation) {
            return res.status(400).json({
                success: false,
                message: "Please provide qty and operation (add/subtract)",
            });
        }
        
        const numericQty = parseInt(qty);

        // Prisma Atomic Updates: Perform the calculation directly in the database
        let updateOperation;

        if (operation === "add") {
            // Prisma method to increment a field
            updateOperation = { stockQty: { increment: numericQty } };
            
        } else if (operation === "subtract") {
            // Check for insufficient stock BEFORE the update (requires a find operation)
            const inventory = await prisma.inventory.findUnique({ where: { id: id } });
            
            if (!inventory) {
                return res.status(404).json({ success: false, message: "Inventory item not found" });
            }
            if (inventory.stockQty - numericQty < 0) {
                return res.status(400).json({ success: false, message: "Insufficient stock quantity" });
            }
            
            // Prisma method to decrement a field
            updateOperation = { stockQty: { decrement: numericQty } };
            
        } else {
            return res.status(400).json({
                success: false,
                message: 'Operation must be either "add" or "subtract"',
            });
        }

        // Perform the update
        const updatedInventory = await prisma.inventory.update({
            where: { id: id },
            data: updateOperation,
        });

        res.status(200).json({
            success: true,
            message: "Stock updated successfully",
            data: updatedInventory,
        });
    } catch (error) {
        let errorMessage = "Error updating stock";
        if (error.code === 'P2025') {
            errorMessage = "Inventory item not found";
            return res.status(404).json({ success: false, message: errorMessage });
        }
        
        res.status(500).json({
            success: false,
            message: errorMessage,
            error: error.message,
        });
    }
};