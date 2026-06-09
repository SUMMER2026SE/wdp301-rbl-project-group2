import { Router } from 'express';
import authenticate from '@/middlewares/authenticate';
import authorize from '@/middlewares/authorize';
import { Role } from '@/types/user.type';
import {
  createIngredientHandler,
  deleteIngredientHandler,
  getIngredientsHandler,
  suggestExistingIngredientAllergensHandler,
  suggestIngredientAllergensHandler,
  updateIngredientHandler,
} from '@/controllers/ingredient.controller';

const ingredientRoutes = Router();

ingredientRoutes.get('/', authenticate, authorize(Role.ADMIN), getIngredientsHandler);
ingredientRoutes.post('/', authenticate, authorize(Role.ADMIN), createIngredientHandler);
ingredientRoutes.post('/suggest-allergens', authenticate, authorize(Role.ADMIN), suggestIngredientAllergensHandler);
ingredientRoutes.post('/:id/suggest-allergens', authenticate, authorize(Role.ADMIN), suggestExistingIngredientAllergensHandler);
ingredientRoutes.patch('/:id', authenticate, authorize(Role.ADMIN), updateIngredientHandler);
ingredientRoutes.delete('/:id', authenticate, authorize(Role.ADMIN), deleteIngredientHandler);

export default ingredientRoutes;
