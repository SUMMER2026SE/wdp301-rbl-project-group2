import { IVariation, IVariationOption } from '@/types/variation.type';
import mongoose from 'mongoose';

// --- VARIATIONS ---
const VariationSchema = new mongoose.Schema<IVariation>(
  {
    name: { type: String, required: true, unique: true, trim: true },
    description: { type: String, trim: true },
  },
  {
    timestamps: true,
  }
);

export const VariationModel = mongoose.model<IVariation>('Variation', VariationSchema, 'variations');

// --- VARIATION OPTIONS ---
const VariationOptionSchema = new mongoose.Schema<IVariationOption>(
  {
    variationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Variation', required: true },
    name: { type: String, required: true, trim: true },
    extraPrice: { type: Number, required: true, default: 0, min: 0 },
    isAvailable: { type: Boolean, default: true },
  },
  {
    timestamps: true,
  }
);

VariationOptionSchema.index({ variationId: 1 });
VariationOptionSchema.index({ variationId: 1, name: 1 }, { unique: true });

export const VariationOptionModel = mongoose.model<IVariationOption>('VariationOption', VariationOptionSchema, 'variation_options');
