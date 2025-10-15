import prisma from "../utils/prisma.js";
import { Prisma } from "@prisma/client";

// =========================================================================
// 1. CREATE NEW USER (OPERATOR)
// =========================================================================
export const createUser = async (req, res) => {
    const { employeeId, name, role = "Operator" } = req.body;

    // Validation
    if (!employeeId || !name) {
        return res.status(400).json({
            success: false,
            message: "Employee ID aur Name lazmi hain.",
        });
    }

    try {
        const newUser = await prisma.user.create({
            data: {
                employeeId: employeeId.trim(),
                name: name.trim(),
                role: role,
            },
        });

        res.status(201).json({
            success: true,
            message: "Naya User (Operator) kamyabi se banaya gaya.",
            data: newUser,
        });

    } catch (error) {
        // P2002: Unique constraint violation (Employee ID already exists)
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
            return res.status(409).json({
                success: false,
                message: `Yeh Employee ID '${employeeId}' pehle se maujood hai.`,
            });
        }
        console.error("🔥 Error creating user:", error);
        res.status(500).json({
            success: false,
            message: "User record banane mein nakam raha.",
            error: error.message,
        });
    }
};
