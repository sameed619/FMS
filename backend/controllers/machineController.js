import prisma from "../utils/prisma.js";
import { Prisma } from "@prisma/client";

// =========================================================================
// 1. CREATE MACHINE
// =========================================================================
export const createMachine = async (req, res) => {
    const { modelName, capacity, status = "Operational", notes, purchaseDate } = req.body;

    // Validation for Model Name and Capacity (Your improved logic)
    if (!modelName || capacity === undefined) {
        return res.status(400).json({
            success: false,
            message: "Machine ka Model Name aur Capacity lazmi hai.",
        });
    }
    
    // Capacity ko Integer mein tabdeel karna zaroori hai
    const capacityInt = parseInt(capacity);
    if (isNaN(capacityInt) || capacityInt <= 0) {
        return res.status(400).json({ 
            success: false, 
            message: "Capacity sahi number mein honi chahiye aur 0 se zyada honi chahiye.", 
        });
    }

    try {
        const newMachine = await prisma.machine.create({
            data: {
                modelName: modelName.trim(),
                capacity: capacityInt,
                // Optional fields
                status,
                notes,
                purchaseDate: purchaseDate ? new Date(purchaseDate) : null,
            },
        });

        res.status(201).json({
            success: true,
            message: "Machine record kamyabi se banaya gaya.",
            data: newMachine,
        });

    } catch (error) {
        // P2002: Unique constraint violation (Model Name already exists)
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
            return res.status(409).json({
                success: false,
                message: `Yeh Model Name '${modelName}' pehle se maujood hai. Har machine ka Model Name unique hona chahiye.`,
            });
        }
        console.error("🔥 Error creating machine:", error);
        res.status(500).json({
            success: false,
            message: "Machine record banane mein nakam raha.",
            error: error.message,
        });
    }
};

// =========================================================================
// 2. GET ALL MACHINES (With Search, Filter, Pagination)
// =========================================================================
export const getAllMachines = async (req, res) => {
    // Query parameters se values lena
    const { search, status, page = 1, pageSize = 10, sort = 'modelName:asc' } = req.query;

    const limit = parseInt(pageSize);
    const skip = (parseInt(page) - 1) * limit;

    // 'where' object mein dynamic filter conditions bana rahe hain
    const where = {};

    // 1. Search Logic: 'OR' operator se multiple fields mein search
    if (search) {
        where.OR = [
            { modelName: { contains: search, mode: 'insensitive' } },
            { notes: { contains: search, mode: 'insensitive' } },
        ];
    }

    // 2. Filter Logic: Status filter
    if (status) {
        where.status = status; // Assuming status is a simple string match
    }

    // 3. Sorting Logic: 'modelName:asc' ko array mein tabdeel karna
    const [field, direction] = sort.split(':');
    const orderBy = { [field]: direction };
    
    try {
        // Pehle total count nikalte hain (without skip/take)
        const totalCount = await prisma.machine.count({ where });

        const machines = await prisma.machine.findMany({
            where,
            orderBy, // Sorting
            take: limit, // Pagination limit
            skip, // Pagination offset
        });

        res.status(200).json({
            success: true,
            message: "Sabhi machine records kamyabi se mil gaye.",
            data: machines,
            pagination: {
                totalRecords: totalCount,
                currentPage: parseInt(page),
                pageSize: limit,
                totalPages: Math.ceil(totalCount / limit),
            }
        });

    } catch (error) {
        console.error("🔥 Error fetching machines:", error);
        res.status(500).json({
            success: false,
            message: "Machine records nikalne mein nakam raha.",
            error: error.message,
        });
    }
};
