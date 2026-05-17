import mongoose from 'mongoose';

export interface ISupportConversation {
    _id: mongoose.Types.ObjectId;
    user_id: mongoose.Types.ObjectId;
    order_id: mongoose.Types.ObjectId;
    store_id?: mongoose.Types.ObjectId | null;
    status: 'open' | 'closed';
    createdAt: Date;
    updatedAt: Date;
}

export interface ISupportMessage {
    _id: mongoose.Types.ObjectId;
    conversation_id: mongoose.Types.ObjectId;
    sender_type: 'USER' | 'STAFF';
    sender_id: mongoose.Types.ObjectId;
    content: string;
    image_url?: string;
    is_read: boolean;
    createdAt: Date;
    updatedAt: Date;
}

export default ISupportConversation;

