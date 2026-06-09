import { CREATED, OK } from '@/constants/http';
import { catchErrors } from '@/utils/async-handler';
import {
  createIngredient,
  deleteIngredient,
  listIngredients,
  saveIngredientAiSuggestion,
  suggestAllergensForIngredient,
  updateIngredient,
} from '@/services/ingredient.service';
import {
  ingredientValidator,
  suggestIngredientAllergensValidator,
  updateIngredientValidator,
} from '@/validators/ingredient.validator';

export const getIngredientsHandler = catchErrors(async (_req, res) => {
  const data = await listIngredients();
  return res.success(OK, { data });
});

export const createIngredientHandler = catchErrors(async (req, res) => {
  const body = ingredientValidator.parse(req.body);
  const data = await createIngredient(body);
  return res.success(CREATED, { data, message: 'Tạo nguyên liệu thành công' });
});

export const updateIngredientHandler = catchErrors(async (req, res) => {
  const body = updateIngredientValidator.parse(req.body);
  const data = await updateIngredient(req.params.id, body);
  return res.success(OK, { data, message: 'Cập nhật nguyên liệu thành công' });
});

export const deleteIngredientHandler = catchErrors(async (req, res) => {
  const data = await deleteIngredient(req.params.id);
  return res.success(OK, { data, message: 'Xóa nguyên liệu thành công' });
});

export const suggestIngredientAllergensHandler = catchErrors(async (req, res) => {
  const body = suggestIngredientAllergensValidator.parse(req.body);
  const data = await suggestAllergensForIngredient(body);
  return res.success(OK, { data, message: 'Gợi ý tag dị ứng thành công' });
});

export const suggestExistingIngredientAllergensHandler = catchErrors(async (req, res) => {
  const body = suggestIngredientAllergensValidator.parse(req.body);
  const suggestion = await suggestAllergensForIngredient(body);
  const data = await saveIngredientAiSuggestion(req.params.id, suggestion);
  return res.success(OK, { data, suggestion, message: 'Gợi ý tag dị ứng thành công' });
});
