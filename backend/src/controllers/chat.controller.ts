import { Request, Response } from 'express';
import { getAIResponseForChat } from '@/services/ai.service';
import UserModel from '@/models/users.model';
import ProductModel from '@/models/product.model';

export const handleChat = async (req: Request, res: Response) => {
    try {
        const { message, history } = req.body;
        const userId = req.userId;

        if (!message) {
            return res.status(400).json({ message: 'Vui lòng cung nhập tin nhắn.' });
        }

        // Fetch User Context
        let userContext = null;
        if (userId) {
            const user = await UserModel.findById(userId).lean();
            if (user) {
                // Fetch a few safe foods for context
                const preferences = user.preferences || { dietary: [], allergies: [], health_goals: [] };
                const userAllergies = preferences.allergies.map((a: string) => a.normalize('NFC').toLowerCase().trim());

                const allAvailableProducts = await ProductModel.find({ isAvailable: true }).limit(20).lean();
                const safeProducts = allAvailableProducts.filter(product => {
                    const ingredients = (product.recipe || []).map((r: any) =>
                        r.name.normalize('NFC').toLowerCase().trim()
                    );
                    return !ingredients.some((ingredient: string) =>
                        userAllergies.some((allergy: string) => {
                            const cleanAllergy = allergy.normalize('NFC').toLowerCase().trim();
                            return ingredient.includes(cleanAllergy) || cleanAllergy.includes(ingredient);
                        })
                    );
                }).slice(0, 5); // Just 5 for context to keep prompt small

                userContext = {
                    fullName: (user.username || user.fullName || 'Người dùng').toString(),
                    preferences: preferences as any,
                    safeProducts: safeProducts.map(p => ({
                        name: p.name.toString(),
                        description: (p.description || '').toString()
                    }))
                };
            }
        }

        // Format history for Gemini (e.g. { role, parts: [{ text }] })
        const formattedHistory = (history || []).map((h: any) => ({
            role: h.role === 'user' ? 'user' : 'model',
            parts: [{ text: h.content || h.parts[0].text }],
        }));

        const response = await getAIResponseForChat(formattedHistory, message, userContext);

        return res.json({ response });
    } catch (error: any) {
        console.error('Chat controller error:', error);
        return res.status(500).json({ message: 'Lỗi server.', error: error.message });
    }
};
