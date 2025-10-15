// src/controllers/purchaseController.js

import prisma from "../utils/prisma.js";
import { Prisma } from "@prisma/client";

// =========================================================================
// HELPER: Purchase ID Generator (Replaces Mongoose pre-save hook)
// =========================================================================
const generateNextPurchaseId = async () => {
  // ... (Implementation of finding the latest ID and generating PURxxx)
  const latestPurchase = await prisma.purchase.findFirst({
    orderBy: { id: "desc" },
    select: { purchaseId: true },
  });
  let newCount = 1;
  const prefix = "PUR";
  if (latestPurchase && latestPurchase.purchaseId) {
    const currentCount = parseInt(
      latestPurchase.purchaseId.replace(prefix, "")
    );
    if (!isNaN(currentCount)) newCount = currentCount + 1;
  }
  return `${prefix}${String(newCount).padStart(3, "0")}`;
};

// =========================================================================
// 1. CREATE PURCHASE ENTRY
// =========================================================================
export const createPurchaseEntry = async (req, res) => {
  const { supplier, billNumber, items, totalAmount, contact, purchaseDate } =
    req.body;
  const purchaseDateObj = purchaseDate ? new Date(purchaseDate) : new Date();

  if (!supplier || !billNumber || !items?.length || totalAmount === undefined) {
    return res.status(400).json({
      message:
        "Missing required fields: supplier, billNumber, totalAmount, or items.",
    });
  }

  try {
    const newPurchaseId = await generateNextPurchaseId();

    // Temp structure to hold both the operation promise and the item details
    const itemProcessingPromises = items.map(async (item) => {
      // Item validation...
      if (
        !item.itemId ||
        item.qty === undefined ||
        item.pricePerUnit === undefined ||
        item.qty <= 0
      ) {
        throw new Error(
          `Invalid data for item ${item.itemId}: missing qty or pricePerUnit.`
        );
      }

      const itemId = item.itemId.trim().toUpperCase();

      // 1. Check if the inventory record exists (Lookup by unique itemId)
      const existingInventory = await prisma.inventory.findUnique({
        where: { itemId },
      });

      let inventoryOperationPromise;

      if (existingInventory) {
        // Case 1: Existing Item (Update Stock)
        inventoryOperationPromise = prisma.inventory.update({
          where: { id: existingInventory.id },
          data: {
            stockQty: { increment: item.qty },
            pricePerUnit: item.pricePerUnit,
            supplier,
            billNumber,
            lastPurchaseDate: purchaseDateObj,
          },
        });

        // Return the existing ID (Int)
        return {
          inventoryOperationPromise,
          inventoryId: existingInventory.id, // <--- Already have the ID
          qty: item.qty,
          pricePerUnit: item.pricePerUnit,
        };
      } else {
        // Case 2: New Item (Create Stock)
        if (!item.name || !item.itemType || !item.unit) {
          throw new Error(
            `New item ${itemId} requires 'name', 'itemType', and 'unit' fields.`
          );
        }

        // Inventory record ko create karein (Transaction se bahar)
        const newInventoryRecord = await prisma.inventory.create({
          data: {
            itemId,
            name: item.name,
            itemType: item.itemType,
            unit: item.unit,
            supplier,
            billNumber,
            stockQty: item.qty,
            pricePerUnit: item.pricePerUnit,
            lastPurchaseDate: purchaseDateObj,
          },
        });

        // ✅ FIX 1: inventoryOperationPromise ko null set karein
        // Kyunki creation operation abhi hi execute ho chuka hai.
        inventoryOperationPromise = null; 

        // Return the newly created ID (Int)
        return {
          inventoryOperationPromise: inventoryOperationPromise, // Null
          inventoryId: newInventoryRecord.id, // <--- New ID is available
          qty: item.qty,
          pricePerUnit: item.pricePerUnit,
        };
      }
    });

    // Resolve all item promises (This gets us all necessary inventory IDs and operations)
    const resolvedItems = await Promise.all(itemProcessingPromises);

    // Separate operations for the main transaction
    // ✅ FIX 2: Filter logic simple rakhein to only include update promises
    const updateOperations = resolvedItems
        .map((item) => item.inventoryOperationPromise)
        .filter(Boolean);
      

    const purchaseItemCreations = resolvedItems.map((item) => ({
      inventoryId: item.inventoryId, // <--- Correct FK: Inventory ID (Int)
      qty: item.qty,
      pricePerUnit: item.pricePerUnit,
    }));

    // 2. EXECUTE MAIN TRANSACTION: Updates FIRST, Purchase LAST
    const results = await prisma.$transaction([
      ...updateOperations,

      prisma.purchase.create({
        data: {
          purchaseId: newPurchaseId,
          supplier,
          billNumber,
          totalAmount: parseFloat(totalAmount),
          contact: contact ? String(contact) : null,
          purchaseDate: purchaseDateObj,
          items: { create: purchaseItemCreations }, // Use the corrected list
        },
        include: { items: true },
      }),
    ]);

    // 3. Extract the last item (the new purchase record)
    const newPurchase = results[results.length - 1];

    res.status(201).json({
      success: true,
      message: "Purchase entry created and inventory updated successfully.",
      data: newPurchase,
    });
  } catch (error) {
    // Handle custom validation errors (from item processing)
    if (
      error.message.includes("Invalid data for item") ||
      error.message.includes("New item")
    ) {
      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }

    console.error("🔥 Prisma Transaction Error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to create purchase entry or update inventory.",
      error: error.message,
    });
  }
};

// =========================================================================
// 2. GET ALL PURCHASE ENTRIES
// =========================================================================
export const getAllPurchaseEntries = async (req, res) => {
  try {
    const entries = await prisma.purchase.findMany({
      // Use include to fetch the related PurchaseItem details
      // Then use nested include to fetch the related Inventory item details
      include: {
        items: {
          include: {
            inventoryItem: true, // Include the linked Inventory object
          },
        },
      },
      orderBy: {
        purchaseDate: "desc", // Sort by purchase date descending
      },
    });

    // Note: Prisma returns the raw array, so we adjust the response format
    res.status(200).json({
      success: true,
      count: entries.length,
      data: entries,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch purchase entries.",
      error: error.message,
    });
  }
};

// =========================================================================
// 3. GET PURCHASE ENTRY BY ID
// =========================================================================
export const getPurchaseEntryById = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid ID format" });
    }

    const entry = await prisma.purchase.findUnique({
      where: { id: id },
      include: {
        items: {
          include: {
            inventoryItem: true, // Include the linked Inventory object
          },
        },
      },
    });

    if (!entry) {
      return res
        .status(404)
        .json({ success: false, message: "Purchase entry not found." });
    }

    res.status(200).json({
      success: true,
      data: entry,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch purchase entry.",
      error: error.message,
    });
  }
};

// =========================================================================
// 4. UPDATE PURCHASE ENTRY
// =========================================================================
export const updatePurchaseEntry = async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) {
    return res
      .status(400)
      .json({ success: false, message: "Invalid ID format" });
  }

  const { items, totalAmount, ...updateHeaderData } = req.body;

  try {
    // 1. Get the original Purchase Entry and its linked data (MUST include inventoryItem to get its itemId)
    const originalEntry = await prisma.purchase.findUnique({
      where: { id: id },
      include: { items: { include: { inventoryItem: true } } }, // Fetch nested Inventory data
    });

    if (!originalEntry) {
      return res
        .status(404)
        .json({ success: false, message: "Purchase entry not found." });
    }

    // --- Step 2: Calculate the NET stock change for each item ---
    const oldItemsMap = new Map(
      originalEntry.items.map((item) => [
        item.inventoryItem.itemId, // ✅ FIX 3: Use inventoryItem relation to get the string ID
        { ...item, itemId: item.inventoryItem.itemId }, // Add string itemId back for processing
      ])
    ); 
    const newItemsMap = new Map(
      (items || []).map((item) => [item.itemId, item])
    );

    const allItemIds = new Set([...oldItemsMap.keys(), ...newItemsMap.keys()]);

    // This array will hold promises for stock updates
    const stockUpdateOperationsPromises = [];

    // This array will hold data for recreating PurchaseItems
    const newPurchaseItemCreations = [];

    for (const itemId of allItemIds) {
      const oldItem = oldItemsMap.get(itemId);
      const newItem = newItemsMap.get(itemId);

      const oldQty = oldItem?.qty || 0;
      const newQty = newItem?.qty || 0;
      const qtyDifference = newQty - oldQty;

      // Find Inventory ID (must be done before transaction)
      const inventoryLookup = await prisma.inventory.findUnique({
        where: { itemId: itemId }, // Lookup using the unique string itemId
        select: { id: true },
      });

      if (!inventoryLookup) {
        // Agar Inventory item maujood nahi hai, toh error throw karein
        throw new Error(
          `Inventory item with ID ${itemId} not found for stock adjustment.`
        );
      }

      const inventoryId = inventoryLookup.id; // 👍 Inventory's integer ID

      // 2.1: Prepare Stock Update Operation
      if (qtyDifference !== 0) {
        stockUpdateOperationsPromises.push(
          prisma.inventory.update({
            where: { id: inventoryId }, // Update using integer ID
            data: {
              stockQty: { increment: qtyDifference },
              pricePerUnit: newItem?.pricePerUnit || oldItem?.pricePerUnit,
              supplier: updateHeaderData.supplier || originalEntry.supplier,
            },
          })
        );
      }

      // 2.2: Prepare new PurchaseItem Creation data
      if (newItem) {
        newPurchaseItemCreations.push({
          inventoryId: inventoryId, // Use the correct integer Foreign Key
          qty: newItem.qty,
          pricePerUnit: newItem.pricePerUnit,
        });
      }
    }

    // Note: stockUpdateOperationsPromises array contains the raw Promises
    // No need to await here, we pass them directly to the transaction later.

    // 3. Prepare the Purchase update operation
    const updatePurchaseOp = prisma.purchase.update({
      where: { id: id },
      data: {
        ...updateHeaderData,
        totalAmount: totalAmount ? parseFloat(totalAmount) : undefined,

        // --- Relational Update: Delete and Recreate Items ---
        items: {
          deleteMany: {}, // Delete all existing PurchaseItem records (linked by FK)
          create: newPurchaseItemCreations, // Create using the list with correct FK (inventoryId: Int)
        },
      },
      include: { items: true },
    });

    // 4. Execute the Transaction (Stock updates first, then Purchase update)
    const transactionOperations = [...stockUpdateOperationsPromises, updatePurchaseOp];

    const results = await prisma.$transaction(transactionOperations);
    const updatedPurchase = results[results.length - 1]; // Last item is the updated Purchase record

    res.status(200).json({
      success: true,
      message: "Purchase entry and inventory updated successfully.",
      data: updatedPurchase,
    });
  } catch (error) {
    // Handle custom and Prisma errors
    let errorMessage = error.message.includes("not found for stock adjustment")
      ? error.message
      : "Failed to update purchase entry or inventory.";

    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2025"
    ) {
      errorMessage = "Purchase entry or Inventory item not found.";
    }

    console.error("🔥 Update Transaction Error:", error);
    res.status(500).json({
      success: false,
      message: errorMessage,
      error: error.message,
    });
  }
};

// =========================================================================
// 5. DELETE PURCHASE ENTRY
// =========================================================================
export const deletePurchaseEntry = async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) {
    return res
      .status(400)
      .json({ success: false, message: "Invalid ID format" });
  }

  try {
    // 1. Find the Purchase Entry and its items to get quantities (must include items)
    const entryToDelete = await prisma.purchase.findUnique({
      where: { id: id },
      include: { items: { include: { inventoryItem: true } } }, // ✅ FIX 4: Fetch nested Inventory data
    });

    if (!entryToDelete) {
      return res
        .status(404)
        .json({ success: false, message: "Purchase entry not found." });
    }

    // 2. Prepare Inventory Reversal Updates (Subtract stock)
    const reversalOperationsPromises = entryToDelete.items.map(async (item) => {
      // Find Inventory ID using the item's unique string ID (inventoryItemId)
      // ✅ FIX 5: Use the correct relation to get the itemId string
      const itemIdString = item.inventoryItem.itemId; 
      
      // Item ID lookup is now redundant since we have item.inventoryId, 
      // but we'll use the itemId string for safety/consistency in the error message
      if (!itemIdString) {
        throw new Error(
          `Inventory item details (itemId) not found during reversal for PurchaseItem ${item.id}.`
        );
      }

      return prisma.inventory.update({
        where: { id: item.inventoryId }, // ✅ Use the direct integer FK to update
        // Use decrement to subtract the purchased quantity from stockQty
        data: { stockQty: { decrement: item.qty } },
      });
    });

    // Resolve all reversal promises
    const reversalOperations = await Promise.all(reversalOperationsPromises);

    // 3. Prepare Delete Operation
    const deleteOperation = prisma.purchase.delete({
      where: { id: id },
    });

    // 4. Execute all operations in a single transaction
    await prisma.$transaction([
      ...reversalOperations, // First reverse all stock
      deleteOperation, // Then delete the purchase
    ]);

    res.status(200).json({
      success: true,
      message: "Purchase entry and inventory successfully deleted.",
    });
  } catch (error) {
    let errorMessage = error.message.includes("not found during reversal")
      ? error.message
      : "Failed to delete purchase entry or reverse inventory.";

    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2025"
    ) {
      errorMessage =
        "Inventory item or Purchase entry not found during reversal/deletion.";
    }

    console.error("🔥 Delete Transaction Error:", error);
    res.status(500).json({
      success: false,
      message: errorMessage,
      error: error.message,
    });
  }
};