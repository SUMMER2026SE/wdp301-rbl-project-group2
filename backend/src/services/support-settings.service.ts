import mongoose from 'mongoose';
import { SupportSettingsModel } from '@/models';

export const getSettings = async (userId: mongoose.Types.ObjectId) => {
    let settings = await SupportSettingsModel.findOne({ user_id: userId });
    if (!settings) {
        // Return default settings if none exist
        settings = await SupportSettingsModel.create({
            user_id: userId,
            welcomeMessage: { enabled: false, content: '' },
            outOfOffice: {
                enabled: false,
                message: '',
                schedule: { days: [], startTime: '08:00', endTime: '22:00' },
            },
            quickReplies: [],
        });
    }
    return settings;
};

export const updateSettings = async (userId: mongoose.Types.ObjectId, data: any) => {
    const settings = await SupportSettingsModel.findOneAndUpdate(
        { user_id: userId },
        { $set: data },
        { new: true, upsert: true }
    );
    return settings;
};
