// src/routes/productRecipeRoutes.js

import express from 'express';
import { 
    createProductRecipe, 
    getAllProductRecipes, 
    getProductRecipeById, 
    updateRecipeMaterials,
} from '../controllers/productRecipeController.js';

const router = express.Router();

// Recipe Header CRUD
router.post('/', createProductRecipe);
router.get('/', getAllProductRecipes);
router.get('/:id', getProductRecipeById); 

// Recipe Materials (Ingredients) update
router.put('/:id/materials', updateRecipeMaterials); 

export default router;