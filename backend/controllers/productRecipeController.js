// src/controllers/productRecipeController.js

import prisma from "../utils/prisma.js";
import { Prisma } from "@prisma/client";

// =========================================================================
// 1. CREATE PRODUCT RECIPE (Header only)
// =========================================================================
export const createProductRecipe = async (req, res) => {
    const { designCode, name, description, stitchesRequired, frontDetail, backDetail } = req.body;

    if (!designCode || !name || stitchesRequired === undefined) {
        return res.status(400).json({
            success: false,
            message: "Missing required fields: designCode, name, or stitchesRequired.",
        });
    }
    
    try {
        const newRecipe = await prisma.productRecipe.create({
            data: {
                designCode: designCode.toUpperCase().trim(),
                name,
                description,
                stitchesRequired: parseInt(stitchesRequired),
                frontDetail,
                backDetail,
            },
        });

        res.status(201).json({
            success: true,
            message: "Product Recipe header created successfully. Now add materials.",
            data: newRecipe,
        });

    } catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
            return res.status(409).json({
                success: false,
                message: `Recipe with design code '${designCode}' already exists.`,
            });
        }
        console.error("🔥 Error creating product recipe:", error);
        res.status(500).json({
            success: false,
            message: "Failed to create product recipe.",
            error: error.message,
        });
    }
};

// =========================================================================
// 2. GET ALL PRODUCT RECIPES (Header only)
// =========================================================================
export const getAllProductRecipes = async (req, res) => {
    try {
        const recipes = await prisma.productRecipe.findMany({
            select: {
                id: true,
                designCode: true,
                name: true,
                description: true,
                stitchesRequired: true,
            },
            orderBy: { id: 'asc' }
        });

        res.status(200).json({
            success: true,
            message: "All Product Recipes fetched successfully.",
            data: recipes,
        });

    } catch (error) {
        console.error("🔥 Error fetching all product recipes:", error);
        res.status(500).json({
            success: false,
            message: "Failed to fetch product recipes.",
            error: error.message,
        });
    }
};


// =========================================================================
// 3. GET SINGLE PRODUCT RECIPE (with all its required materials)
// =========================================================================
export const getProductRecipeById = async (req, res) => {
    const recipeId = parseInt(req.params.id);

    if (isNaN(recipeId)) {
        return res.status(400).json({
            success: false,
            message: "Invalid Recipe ID provided.",
        });
    }

    try {
        const recipe = await prisma.productRecipe.findUnique({
            where: { id: recipeId },
            include: {
                requiredMaterials: {
                    select: {
                        id: true,
                        quantityRequired: true,
                        inventoryItem: {
                            select: {
                                itemId: true,
                                name: true,
                                itemType: true,
                                unit: true,
                            }
                        }
                    }
                }
            }
        });

        if (!recipe) {
            return res.status(404).json({
                success: false,
                message: `Product Recipe with ID ${recipeId} not found.`,
            });
        }

        res.status(200).json({
            success: true,
            message: `Product Recipe ${recipe.designCode} details fetched successfully.`,
            data: recipe,
        });

    } catch (error) {
        console.error("🔥 Error fetching single product recipe:", error);
        res.status(500).json({
            success: false,
            message: "Failed to fetch product recipe details.",
            error: error.message,
        });
    }
};


// =========================================================================
// 4. ADD/UPDATE RECIPE MATERIALS (The core logic)
// =========================================================================
export const updateRecipeMaterials = async (req, res) => {
    const recipeId = parseInt(req.params.id);
    const { materials } = req.body;

    if (isNaN(recipeId) || !materials || !Array.isArray(materials) || materials.length === 0) {
        return res.status(400).json({
            success: false,
            message: "Invalid Recipe ID or missing 'materials' array in the request body.",
        });
    }

    try {
        const itemCreations = [];

        // 1. Validate Materials and convert itemId (string) to inventoryId (integer FK)
        for (const material of materials) {
            if (!material.itemId || material.quantityRequired === undefined || material.quantityRequired <= 0) {
                throw new Error(`Invalid material data: missing itemId or quantityRequired for item ${material.itemId}.`);
            }

            const itemId = material.itemId.toUpperCase().trim();
            const inventoryLookup = await prisma.inventory.findUnique({
                where: { itemId },
                select: { id: true }
            });

            if (!inventoryLookup) {
                throw new Error(`Inventory item with ID '${itemId}' not found. Cannot link to recipe.`);
            }

            itemCreations.push({
                inventoryId: inventoryLookup.id,
                // Quantity is converted to a string here for Prisma's Decimal type handling
                quantityRequired: Number(material.quantityRequired) 
            });
        }
        
        // 2. EXECUTE TRANSACTION: Delete old materials, then Create new ones.
        const [deleteResult, updateResult] = await prisma.$transaction([
            // A. Delete all existing materials linked to this recipe
            prisma.recipeMaterial.deleteMany({
                where: { recipeId },
            }),

            // B. Create new materials using the validated list (ProductRecipe is updated)
            prisma.productRecipe.update({
                where: { id: recipeId },
                data: {
                    requiredMaterials: {
                        create: itemCreations,
                    },
                },
                include: {
                    requiredMaterials: {
                        include: {
                            inventoryItem: {
                                select: { itemId: true, name: true, unit: true }
                            }
                        }
                    }
                }
            })
        ]);

        res.status(200).json({
            success: true,
            message: `Recipe materials updated successfully for Recipe ID ${recipeId}.`,
            data: updateResult,
        });

    } catch (error) {
        console.error("🔥 Error updating recipe materials:", error);
        res.status(500).json({
            success: false,
            message: error.message.includes('Inventory item') ? error.message : "Failed to update recipe materials.",
            error: error.message,
        });
    }
};