import mongoose from 'mongoose';

export enum PointTransactionType {
    EARN = 'earn',
    REDEEM = 'redeem',
    REFERRAL = 'referral',
    BONUS = 'bonus',
}

export interface IPointTransaction extends mongoose.Document {
    user_id: mongoose.Types.ObjectId;
    amount: number;
    type: PointTransactionType;
    description: string;
    order_id?: mongoose.Types.ObjectId;
    createdAt: Date;
    updatedAt: Date;
}
