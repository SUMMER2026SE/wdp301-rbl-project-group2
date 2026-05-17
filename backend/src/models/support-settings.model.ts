import mongoose from 'mongoose';

export interface ISupportSettings {
    user_id: mongoose.Types.ObjectId; // Shop owner or system admin
    welcomeMessage: {
        enabled: boolean;
        content: string;
    };
    outOfOffice: {
        enabled: boolean;
        message: string;
        schedule: {
            days: string[];
            startTime: string;
            endTime: string;
        };
    };
    quickReplies: {
        shortcut: string;
        content: string;
    }[];
}

const SupportSettingsSchema = new mongoose.Schema<ISupportSettings>(
    {
        user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
        welcomeMessage: {
            enabled: { type: Boolean, default: false },
            content: { type: String, default: '' },
        },
        outOfOffice: {
            enabled: { type: Boolean, default: false },
            message: { type: String, default: '' },
            schedule: {
                days: { type: [String], default: [] },
                startTime: { type: String, default: '00:00' },
                endTime: { type: String, default: '23:59' },
            },
        },
        quickReplies: [
            {
                shortcut: { type: String, required: true },
                content: { type: String, required: true },
            },
        ],
    },
    {
        timestamps: true,
    }
);

export const SupportSettingsModel = mongoose.model<ISupportSettings>(
    'SupportSettings',
    SupportSettingsSchema,
    'support_settings'
);
