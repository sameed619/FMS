import prisma from "../utils/prisma.js";
import { Prisma } from "@prisma/client";

// Utility function to calculate duration in minutes
const calculateDuration = (start, end) => {
    if (!start || !end) return null;
    const diffMs = new Date(end).getTime() - new Date(start).getTime();
    return diffMs / (1000 * 60); // Difference in minutes
};

// =========================================================================
// 1. START OPERATOR WORK ENTRY (Create New Entry)
// =========================================================================
export const startWork = async (req, res) => {
    const { productionOrderId, operatorId, activityType, notes } = req.body;

    if (!productionOrderId || !operatorId) {
        return res.status(400).json({
            success: false,
            message: "Production Order ID aur Operator ID lazmi hain."
        });
    }
    
    // --- DEBUG LOG START: 1. Input Data Check ---
    // IDs ko integer mein tabdeel karein
    const prodIdInt = parseInt(productionOrderId);
    const opIdInt = parseInt(operatorId);
    
    console.log("-----------------------------------------");
    console.log(`[DEBUG - 1. INPUT] Production Order ID (String): ${productionOrderId}`);
    console.log(`[DEBUG - 1. INPUT] Production Order ID (Int): ${prodIdInt}`); // Check karein ke yeh "2" hai ya nahi
    console.log(`[DEBUG - 1. INPUT] Operator ID (Int): ${opIdInt}`);
    console.log("-----------------------------------------");
    // --- DEBUG LOG END: 1 ---

    try {
        // 1. Check if the Production Order and Operator exist
        const [order, operator] = await prisma.$transaction([
            prisma.productionOrder.findUnique({ where: { id: prodIdInt } }),
            prisma.user.findUnique({ where: { id: opIdInt } })
        ]);

        // --- DEBUG LOG START: 2. Prisma Result Check ---
        if (order) {
            console.log(`[DEBUG - 2. RESULT] SUCCESS: Production Order found. Order ID: ${order.id}, Number: ${order.orderNumber}.`);
        } else {
            // Agar yeh log dikhta hai, to database connection mein issue hai
            console.log(`[DEBUG - 2. RESULT] FAILURE: Production Order with ID ${prodIdInt} NOT found in server DB.`);
        }
        // --- DEBUG LOG END: 2 ---


        if (!order) {
            return res.status(404).json({ success: false, message: `Production Order ID ${productionOrderId} maujood nahi hai.` });
        }
        if (!operator) {
            return res.status(404).json({ success: false, message: `Operator ID ${operatorId} maujood nahi hai.` });
        }

        // 2. Check for an existing OPEN entry for this operator (to prevent overlaps)
        const existingEntry = await prisma.operatorEntry.findFirst({
            where: {
                operatorId: opIdInt,
                endTime: null, // Check for entries that haven't been stopped
            },
        });

        if (existingEntry) {
            return res.status(409).json({ 
                success: false, 
                message: "Yeh operator pehle se hi kaam record kar raha hai. Kripya pehle pichli entry ko 'stop' karein.",
                data: existingEntry
            });
        }
        
        // 3. Create the new work entry
        const newEntry = await prisma.operatorEntry.create({
            data: {
                productionOrderId: order.id,
                operatorId: operator.id,
                startTime: new Date(),
                activityType: activityType || 'Production',
                notes: notes,
            },
            include: { operator: { select: { name: true } } }
        });

        res.status(201).json({
            success: true,
            message: `Operator ${operator.name} ne Order ${order.id} par kaam shuru kiya.`,
            data: newEntry
        });

    } catch (error) {
        // --- DEBUG LOG START: 3. System Error Catch ---
        console.error("-----------------------------------------");
        console.error("🔥 Error starting work entry (CATCH BLOCK):", error);
        console.error("-----------------------------------------");
        // --- DEBUG LOG END: 3 ---
        res.status(500).json({
            success: false,
            message: "Work entry shuru karne mein nakam raha.",
            error: error.message,
        });
    }
};

// =========================================================================
// 2. STOP OPERATOR WORK ENTRY (Update Existing Entry)
// =========================================================================
export const stopWork = async (req, res) => {
    const { entryId, notes } = req.body;
    
    if (!entryId) {
        return res.status(400).json({
            success: false,
            message: "Work Entry ID lazmi hai."
        });
    }

    try {
        // 1. Find the existing entry
        const entry = await prisma.operatorEntry.findUnique({
            where: { id: parseInt(entryId) },
        });

        if (!entry) {
            return res.status(404).json({ success: false, message: `Work Entry ID ${entryId} maujood nahi hai.` });
        }

        if (entry.endTime !== null) {
            return res.status(409).json({ success: false, message: `Yeh entry pehle hi mukammal ho chuki hai.` });
        }
        
        const stopTime = new Date();
        const durationMinutes = calculateDuration(entry.startTime, stopTime);

        // 2. Update the entry with stop time and duration
        const updatedEntry = await prisma.operatorEntry.update({
            where: { id: entry.id },
            data: {
                endTime: stopTime,
                durationMinutes: durationMinutes,
                // Append notes if provided
                notes: notes ? (entry.notes ? `${entry.notes}; Stop Note: ${notes}` : `Stop Note: ${notes}`) : entry.notes,
            },
            include: { operator: { select: { name: true } } }
        });

        res.status(200).json({
            success: true,
            message: `Work entry ${updatedEntry.id} mukammal. Total duration: ${durationMinutes.toFixed(2)} minutes.`,
            data: updatedEntry
        });

    } catch (error) {
        console.error("🔥 Error stopping work entry:", error);
        res.status(500).json({
            success: false,
            message: "Work entry ko mukammal karne mein nakam raha.",
            error: error.message,
        });
    }
};

// =========================================================================
// 3. GET ALL OPEN ENTRIES (To see who is currently working)
// =========================================================================
export const getOpenEntries = async (req, res) => {
    try {
        const openEntries = await prisma.operatorEntry.findMany({
            where: { endTime: null },
            include: { 
                operator: { select: { employeeId: true, name: true } },
                productionOrder: { select: { orderNumber: true, status: true } }
            },
            orderBy: { startTime: 'asc' }
        });

        res.status(200).json({
            success: true,
            message: "Sabhi open work entries kamyabi se mil gaye.",
            data: openEntries
        });
    } catch (error) {
        console.error("🔥 Error fetching open entries:", error);
        res.status(500).json({
            success: false,
            message: "Open work entries nikalne mein nakam raha.",
            error: error.message,
        });
    }
};
