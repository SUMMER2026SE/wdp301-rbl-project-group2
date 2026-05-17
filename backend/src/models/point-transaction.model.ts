import mongoose from 'mongoose';
import { IPointTransaction, PointTransactionType } from '@/types/point-transaction.type';

const PointTransactionSchema = new mongoose.Schema<IPointTransaction>(
    {
        user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
        amount: { type: Number, required: true },
        type: { type: String, enum: PointTransactionType, required: true },
        description: { type: String, required: true },
        order_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', default: null },
    },
    {
        timestamps: true,
    }
);

PointTransactionSchema.index({ user_id: 1 });
PointTransactionSchema.index({ createdAt: -1 });

const PointTransactionModel = mongoose.model<IPointTransaction>(
    'PointTransaction',
    PointTransactionSchema,
    'point_transactions'
);

export default PointTransactionModel;
