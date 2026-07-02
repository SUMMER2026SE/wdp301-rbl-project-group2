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

const ProductStoreAvailabilitySchema = new mongoose.Schema(
  {
    storeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Store', required: true },
    status: {
      type: String,
      required: true,
      enum: [ProductStatus.ACTIVE, ProductStatus.INACTIVE, ProductStatus.OUT_OF_STOCK],
    },
  },
  { _id: false }
);

const ProductSchema = new mongoose.Schema<IProduct>(
  {
    nameEmbedding: { type: String, default: null },
    imgEmbedding: { type: String, required: true },
    name: { type: String, required: true, trim: true },
    description: { type: String },
    image: { type: String },
    price: {
      type: Number,
      required: true,
      min: [0.01, 'Price must be greater than 0'],
    },
    category: { type: String, required: true, enum: ProductCategory },
    restaurant: { type: String, trim: true },
    time: { type: String, trim: true },
    rating: { type: Number, default: 0, min: 0, max: 5 },
    reviewCount: { type: Number, default: 0, min: 0 },
    recipe: { type: [ProductRecipeItemSchema], default: [] },
    allergenTags: { type: [String], default: [] },
    healthWarning: { type: String },
    healthTags: { type: [String], default: [] },
    isAvailable: { type: Boolean, default: true },
    isCampaignRunning: { type: Boolean, default: false },
    variationIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Variation' }],
    storeAvailability: { type: [ProductStoreAvailabilitySchema], default: [] },
    crossContaminationRisk: { type: Boolean, default: false },
    mayContain: { type: [String], default: [] },
    embedding: { type: [Number], default: [] },
    tags: { type: [String], default: [] },
    operationalNote: { type: String, trim: true },
  },
  {
    timestamps: true,
  }
);

// Indexes
ProductSchema.index({ category: 1 });
ProductSchema.index({ 'storeAvailability.storeId': 1 });
ProductSchema.index({ price: 1 });
ProductSchema.index({ name: 'text', description: 'text' }); // Text search indexing

const ProductModel = mongoose.model<IProduct>('Product', ProductSchema, 'products');

export default ProductModel;
