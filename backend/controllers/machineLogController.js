import prisma from "../utils/prisma.js"; 
import { Prisma } from "@prisma/client";

// =========================================================================
// 1. LOG PRODUCTION OUTPUT AND FULFILL ORDER
// =========================================================================
export const updateProductionFulfillment = async (req, res) => {
    const { productionOrderId, actualQtyProduced, wastageQty, completedAt, shift, operatorId } = req.body;

    if (!productionOrderId || actualQtyProduced === undefined || completedAt === undefined || !shift) {
        return res.status(400).json({
            success: false,
            message: "Production Order ID, Actual Quantity, Completion Date, aur **Shift (DAY/NIGHT/GENERAL) lazmi hain.**",
        });
    }

    const actualQty = parseFloat(actualQtyProduced);
    const wastage = parseFloat(wastageQty || 0);

    if (actualQty < 0 || wastage < 0) {
        return res.status(400).json({ 
            success: false, 
            message: "Quantities negative nahi ho sakti." 
        });
    }
    
    // Shift ki validation
    const validShifts = ['DAY', 'NIGHT', 'GENERAL'];
    if (!validShifts.includes(shift.toUpperCase())) {
        return res.status(400).json({ 
            success: false, 
            message: `Invalid shift value. Please use one of: ${validShifts.join(', ')}.` 
        });
    }

    try {
        // Step 1: Check if the order exists and is not already completed.
        const order = await prisma.productionOrder.findUnique({
            where: { id: parseInt(productionOrderId) },
            select: { 
                id: true, 
                status: true,
                machineId: true, 
            }
        });

        if (!order) {
            return res.status(404).json({ success: false, message: `Order ID ${productionOrderId} maujood nahi hai.` });
        }
        
        if (order.status === 'Completed') {
             return res.status(409).json({ success: false, message: `Order ID ${productionOrderId} pehle hi mukammal ho chuka hai.` });
        }

        if (!order.machineId) {
            return res.status(500).json({ success: false, message: `Production Order ${order.id} ke saath koi machine link nahi hai.` });
        }

        // Step 2: EXECUTE TRANSACTION: Update Order and Create Log
        const [updatedOrder, newLog] = await prisma.$transaction([
            // A. Production Order ko 'Completed' mark karna aur final output record karna
            prisma.productionOrder.update({
                where: { id: order.id },
                data: {
                    actualQtyProduced: actualQty, // Field to update in ProductionOrder
                    completedAt: new Date(completedAt),
                    status: 'Completed',
                },
                include: { recipe: { select: { name: true } } }
            }),

            // B. Machine Log record banana
            prisma.machineLog.create({
                data: {
                    productionOrderId: order.id,
                    machineId: order.machineId,
                    
                    workingHours: 0, 
                    idleHours: 0,
                    downtimeHours: 0,
                    
                    logDate: new Date(completedAt), 
                    shift: shift.toUpperCase(), 
                    
                    notes: `Order fulfillment recorded on ${shift.toUpperCase()} shift. Actual output: ${actualQty}. Wastage: ${wastage}.`, // Notes is only saved here in MachineLog
                    actualQtyProduced: actualQty, 
                    wastageQty: wastage,
                }
            })
        ]);

        res.status(200).json({
            success: true,
            message: `Production Order ${updatedOrder.id} kamyabi se mukammal kiya gaya. Output aur wastage record ho gaya.`,
            data: updatedOrder,
            log: newLog
        });

    } catch (error) {
        console.error("🔥 Error fulfilling production order:", error);
        res.status(500).json({
            success: false,
            message: "Production Order ko mukammal karne mein nakam raha.",
            error: error.message,
        });
    }
};

// =========================================================================
// 2. GET ALL MACHINE LOGS (with Shift Filter)
// =========================================================================
export const getAllMachineLogs = async (req, res) => {
    const { shift } = req.query; 
    
    const whereClause = {};
    if (shift) {
        const upperShift = shift.toUpperCase();
        const validShifts = ['DAY', 'NIGHT', 'GENERAL'];
        if (validShifts.includes(upperShift)) {
            whereClause.shift = upperShift;
        } else {
             return res.status(400).json({ 
                success: false, 
                message: `Invalid shift filter. Use one of: ${validShifts.join(', ')}.` 
            });
        }
    }

    try {
        const logs = await prisma.machineLog.findMany({
            where: whereClause, 
            include: {
                productionOrder: { 
                    select: { 
                        orderNumber: true, 
                        recipe: { select: { designCode: true } } 
                    } 
                },
                machine: { select: { modelName: true } }
            },
            orderBy: { logDate: 'desc' }
        });

        res.status(200).json({
            success: true,
            message: "Sabhi machine logs kamyabi se mil gaye.",
            data: logs
        });
    } catch (error) {
        console.error("🔥 Error fetching machine logs:", error);
        res.status(500).json({
            success: false,
            message: "Machine logs nikalne mein nakam raha.",
            error: error.message,
        });
    }
};
