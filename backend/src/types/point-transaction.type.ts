import mongoose from 'mongoose';

export enum PointTransactionType {
    EARN = 'earn',
    REDEEM = 'redeem',
    REFERRAL = 'referral',
    BONUS = 'bonus',
}

export interface IPointTransaction extends mongoose.Document<mongoose.Types.ObjectId> {
    userId: mongoose.Types.ObjectId;
    amount: number;
    type: PointTransactionType;
    description: string;
    orderId?: mongoose.Types.ObjectId;
    createdAt: Date;
    updatedAt: Date;
}
