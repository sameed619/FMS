import prisma from "../utils/prisma.js";
import { Prisma } from "@prisma/client";

// =========================================================================
// HELPER: Generate a unique sequential Order Number
// =========================================================================
const generateOrderNumber = async () => {
    try {
        const latestOrder = await prisma.productionOrder.findFirst({
            orderBy: { id: 'desc' },
            select: { orderNumber: true }
        });

        const base = "PROD-";
        if (!latestOrder) return base + "001";
        
        const lastNum = parseInt(latestOrder.orderNumber.split('-').pop());
        // Simple sequential number generation (e.g., PROD-001, PROD-002, ...)
        return base + String(lastNum + 1).padStart(3, '0');
    } catch (error) {
        console.error("Error generating order number:", error);
        // Fallback or re-throw based on required robustness
        return `PROD-${Date.now()}`; 
    }
};

// =========================================================================
// 1. CREATE PRODUCTION ORDER (The core stock consumption logic)
// =========================================================================
export const createProductionOrder = async (req, res) => {
    // Note: We are now calculating the orderNumber, not taking it from the body
    const { 
        recipeId, 
        targetQty, 
        machineId, 
        startedAt 
    } = req.body;

    // Basic validation
    if (!recipeId || targetQty === undefined || targetQty <= 0 || !machineId || !startedAt) {
        return res.status(400).json({
            success: false,
            message: "Recipe ID, Target Quantity, Machine ID, aur Start Date/Time lazmi hain.",
        });
    }

    const targetQuantity = Number(targetQty);

    try {
        // Step 1: Fetch the full Recipe details, Machine details
        const [recipe, machine] = await prisma.$transaction([
            prisma.productRecipe.findUnique({
                where: { id: parseInt(recipeId) },
                include: { requiredMaterials: true }
            }),
            prisma.machine.findUnique({
                where: { id: parseInt(machineId) }
            })
        ]);

        if (!recipe) {
            return res.status(404).json({ success: false, message: `Recipe ID ${recipeId} maujood nahi hai.` });
        }
        if (!machine) {
            return res.status(404).json({ success: false, message: `Machine ID ${machineId} maujood nahi hai.` });
        }
        
        const inventoryUpdateOperations = [];
        const productionItemCreations = [];

        // Step 2: PRE-FLIGHT CHECK - Check stock sufficiency and calculate consumption
        for (const mat of recipe.requiredMaterials) {
            // quantityRequired is Decimal/String from DB, targetQuantity is Number
            const requiredPerUnit = Number(mat.quantityRequired); 
            const totalRequired = requiredPerUnit * targetQuantity;

            // Fetch current stock
            const inventoryItem = await prisma.inventory.findUnique({
                where: { id: mat.inventoryId }, // *** FIX: Use inventoryId (FK) instead of assuming inventoryItemId exists ***
                select: { stockQty: true, itemId: true }
            });

            if (!inventoryItem || Number(inventoryItem.stockQty) < totalRequired) {
                 // Insufficient Stock Error handled BEFORE transaction starts
                return res.status(409).json({
                    success: false,
                    message: `Stock ki kami: Item '${inventoryItem?.itemId || 'Unknown'}' (${inventoryItem?.stockQty || 0} ${recipe.requiredMaterials.find(r => r.inventoryId === mat.inventoryId)?.inventoryItem?.unit || 'units'}) mein. Zaroorat: ${totalRequired}.`,
                });
            }

            // Prepare Inventory Update (decrement stock)
            inventoryUpdateOperations.push(
                prisma.inventory.update({
                    where: { id: mat.inventoryId }, // Use the correct ID field
                    data: {
                        stockQty: { decrement: totalRequired } // Stock deduction
                    }
                })
            );

            // ProductionItem record banana (Jitni miqdaar kharch hui)
            productionItemCreations.push({
                inventoryId: mat.inventoryId, // *** FIX: Use inventoryId (FK) ***
                quantityConsumed: totalRequired,
                wastageQty: 0,
            });
        }
        
        // Step 3: Atomic Transaction - Stock Deduction aur Order Creation
        const newOrderNumber = await generateOrderNumber(); // Generate unique order number

        const createOrderOperation = prisma.productionOrder.create({
            data: {
                orderNumber: newOrderNumber,
                targetQty: targetQuantity,
                startedAt: new Date(startedAt),
                machineId: machine.id,
                recipeId: recipe.id,
                
                // ProductionItem records ko nested write ke zariye banana
                consumedItems: {
                    create: productionItemCreations,
                }
            },
            include: {
                recipe: { select: { designCode: true, name: true } },
                consumedItems: {
                    include: { inventoryItem: { select: { itemId: true, name: true, unit: true } } }
                }
            }
        });

        // Transaction: Pehle Inventory update ho, phir Order create ho
        const transactionResult = await prisma.$transaction([
            ...inventoryUpdateOperations,
            createOrderOperation
        ]);

        const newOrder = transactionResult[transactionResult.length - 1];

        res.status(201).json({
            success: true,
            message: `Naya Production Order ${newOrder.orderNumber} ban gaya aur Inventory stock kam kar diya gaya.`,
            data: newOrder
        });

    } catch (error) {
        // P2025: Agar Inventory Update fail ho (Stock < Required Quantity) - Though we pre-checked this.
        if (error.code === 'P2025') {
            return res.status(400).json({
                success: false,
                message: "Internal Error: Stock check fail ho gaya ya koi record missing hai. Transaction roll back ho gaya.",
            });
        }
        
        console.error("🔥 Production Order Creation Error:", error);
        res.status(500).json({
            success: false,
            message: "Production Order banane mein nakam raha. System error dekhein.",
            error: error.message
        });
    }
};

// =========================================================================
// 2. GET ALL PRODUCTION ORDERS
// =========================================================================
export const getAllProductionOrders = async (req, res) => {
    try {
        const orders = await prisma.productionOrder.findMany({
            include: {
                machine: {
                    select: { modelName: true, capacity: true }
                },
                recipe: {
                    select: { designCode: true, name: true, stitchesRequired: true }
                },
                consumedItems: {
                    include: {
                        inventoryItem: {
                            select: { name: true, unit: true }
                        }
                    }
                },
            },
            orderBy: {
                startedAt: 'desc' 
            }
        });

        res.status(200).json({
            success: true,
            message: "Sabhi Production Orders kamyabi se mil gaye.",
            data: orders
        });

    } catch (error) {
        console.error("🔥 Get Production Orders Error:", error);
        res.status(500).json({
            success: false,
            message: "Production Orders nikalne mein nakam raha.",
            error: error.message
        });
    }
};

export const getOpenProductionOrders = async (req, res) => {
    try {
        // Sirf woh orders fetch karein jinhe abhi tak complete nahi kiya gaya hai
        const openOrders = await prisma.productionOrder.findMany({
            where: {
                status: {
                    in: ['In Progress', 'Scheduled', 'On Hold'] // Woh statuses jin par kaam jaari hai
                }
            },
            select: { // Sirf zaroori data fetch karein
                id: true,
                orderNumber: true,
                targetQty: true,
                machineId: true,
                status: true,
                recipe: {
                    select: { name: true }
                }
            },
            orderBy: {
                startedAt: 'asc'
            }
        });

        res.status(200).json({
            success: true,
            message: "Open production orders successfully retrieved.",
            data: openOrders
        });

    } catch (error) {
        console.error("🔥 Get Open Orders Error:", error);
        res.status(500).json({
            success: false,
            message: "Open production orders nikalne mein nakam raha.",
            error: error.message
        });
    }
};
export const getProductionOrderById = async (req, res) => {
    const { id } = req.params;

    try {
        const order = await prisma.productionOrder.findUnique({
            where: { id: parseInt(id) },
            include: {
                machine: {
                    select: { modelName: true }
                },
                recipe: {
                    select: { name: true, designCode: true }
                },
                // Add more includes if needed for detailed view
            }
        });

        if (!order) {
            return res.status(404).json({ success: false, message: `Production Order ID ${id} maujood nahi hai.` });
        }

        res.status(200).json({
            success: true,
            message: "Production Order details retrieved.",
            data: order
        });

    } catch (error) {
        console.error("🔥 Get Order by ID Error:", error);
        res.status(500).json({
            success: false,
            message: "Production Order details nikalne mein nakam raha.",
            error: error.message
        });
    }
};

// =========================================================================
// 5. UPDATE PRODUCTION ORDER STATUS (Required after fulfillment/completion)
//    ROUTE: PUT /api/production-orders/:id
// =========================================================================
export const updateProductionOrder = async (req, res) => {
    const { id } = req.params;
    const { status, actualQtyProduced, completedAt } = req.body;

    // Validation: Status aur ID zaroori hain
    if (!status || !id) {
        return res.status(400).json({ success: false, message: "Order ID aur naya Status lazmi hain." });
    }

    try {
        const updatedOrder = await prisma.productionOrder.update({
            where: { id: parseInt(id) },
            data: {
                status: status, // Naya status set karein (e.g., 'Completed', 'Cancelled')
                actualQty: actualQtyProduced ? Number(actualQtyProduced) : undefined, // Agar fulfillment se aaya hai toh update karein
                completedAt: completedAt ? new Date(completedAt) : undefined // Agar complete hua hai toh timestamp set karein
            }
        });

        res.status(200).json({
            success: true,
            message: `Production Order ${updatedOrder.orderNumber} ka status '${updatedOrder.status}' kar diya gaya.`,
            data: updatedOrder
        });

    } catch (error) {
        // P2025: Agar Order ID galat ho
        if (error.code === 'P2025') {
            return res.status(404).json({ success: false, message: `Production Order ID ${id} maujood nahi hai.` });
        }
        console.error("🔥 Update Order Error:", error);
        res.status(500).json({
            success: false,
            message: "Production Order update karne mein nakam raha.",
            error: error.message
        });
    }
};

// =========================================================================
// FINAL EXPORTS (Saare zaroori functions ko export karein)
// =========================================================================

