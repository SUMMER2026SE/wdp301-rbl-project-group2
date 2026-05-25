import { IProduct } from '@/types';
import { ProductCategory, ProductStatus } from '@/types/product.type';
import mongoose from 'mongoose';

const ProductRecipeItemSchema = new mongoose.Schema(
  {
    ingredientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Ingredient', required: true },
    quantity: { type: Number, required: true },
    unit: { type: String, required: true, trim: true },
  },
  { _id: false }
);

const VariantOptionSchema = new mongoose.Schema(
  {
    choice: { type: String, required: true, trim: true },
    extraPrice: { type: Number, default: 0, min: 0 },
  },
  { _id: false }
);

const VariantGroupSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    required: { type: Boolean, default: false },
    multiple: { type: Boolean, default: false },
    maxChoices: { type: Number, min: 1 },
    options: { type: [VariantOptionSchema], default: [] },
  },
  { _id: false }
);

const ProductSchema = new mongoose.Schema<IProduct>(
  {
    storeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Store', required: true },
    status: { type: String, required: true, enum: ProductStatus, default: ProductStatus.ACTIVE },
    nameEmbedding: { type: String, default: null },
    imgEmbedding: { type: String, required: true },
    name: { type: String, required: true, trim: true },
    description: { type: String },
    imageUrl: { type: String },
    price: {
      type: Number,
      required: true,
      min: [0.01, 'Price must be greater than 0'],
    },
    category: { type: String, required: true, enum: ProductCategory },
    recipe: { type: [ProductRecipeItemSchema], default: [] },
    allergenTags: { type: [String], default: [] },
    isAvailable: { type: Boolean, default: true },
    variants: { type: [VariantGroupSchema], default: [] },
    tags: { type: [String], default: [] },
  },
  {
    timestamps: true,
  }
);

// Indexes
ProductSchema.index({ storeId: 1 });
ProductSchema.index({ status: 1 });
ProductSchema.index({ category: 1 });
ProductSchema.index({ price: 1 });
ProductSchema.index({ name: 'text', description: 'text' }); // Text search indexing

// Compound Indexes
ProductSchema.index({ storeId: 1, category: 1 });
ProductSchema.index({ storeId: 1, status: 1 });

const ProductModel = mongoose.model<IProduct>('Product', ProductSchema, 'products');

export default ProductModel;
