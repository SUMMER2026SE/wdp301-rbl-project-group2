import mongoose from 'mongoose';

const PaymentRequestSchema = new mongoose.Schema(
  {
    orderCode: { type: Number, required: true, unique: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    orderData: { type: Object, required: true }, // Stores the resolved order data
    expireAt: { type: Date, default: () => new Date(Date.now() + 24 * 60 * 60 * 1000) }, // Expires after 24 hours
  },
  {
    timestamps: true,
  }
);

// Auto-delete expired requests
PaymentRequestSchema.index({ expireAt: 1 }, { expireAfterSeconds: 0 });

const PaymentRequestModel = mongoose.model('PaymentRequest', PaymentRequestSchema);

export default PaymentRequestModel;
