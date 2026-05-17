import { IProduct } from '@/types';
import mongoose from 'mongoose';

const VariantOptionSchema = new mongoose.Schema(
  {
    choice: { type: String, required: true, trim: true },
    extra_price: { type: Number, default: 0, min: 0 },
  },
  { _id: false }
);

const VariantGroupSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    required: { type: Boolean, default: false },
    multiple: { type: Boolean, default: false },
    max_choices: { type: Number, min: 1 },
    options: { type: [VariantOptionSchema], default: [] },
  },
  { _id: false }
);

const ProductSchema = new mongoose.Schema<IProduct>(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String, required: true },
    image: { type: mongoose.Schema.Types.ObjectId, ref: 'File' },
    price: {
      type: Number,
      required: true,
      min: [0, 'Price must be a positive number'],
    },
    category: { type: String, required: true, trim: true },
    restaurant: { type: String, required: true, trim: true },
    time: { type: String, required: true },
    rating: { type: Number, default: 0, min: 0, max: 5 },
    review_count: { type: Number, default: 0, min: 0 },

    recipe: [
      {
        name: { type: String },
        quantity: { type: String },
        _id: false,
      },
    ],
    tags: [{ type: String }],
    health_warning: { type: String },
    health_tags: [{ type: String }],
    isAvailable: { type: Boolean, default: true },
    variants: { type: [VariantGroupSchema], default: [] },
  },
  {
    timestamps: true,
  }
);

// Indexes for searching and filtering
ProductSchema.index({
  name: 'text',
  description: 'text',
  health_warning: 'text',
  health_tags: 'text',
}); // Text search
ProductSchema.index({ category: 1 });
ProductSchema.index({ tags: 1 });
ProductSchema.index({ health_tags: 1 });
ProductSchema.index({ price: 1 });
ProductSchema.index({ rating: -1 });
ProductSchema.index({ isAvailable: 1 });

const ProductModel = mongoose.model<IProduct>('Product', ProductSchema, 'products');

export default ProductModel;
