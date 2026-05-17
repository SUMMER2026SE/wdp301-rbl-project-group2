import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '.env') });

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';
console.log('API Key:', GEMINI_API_KEY.substring(0, 10) + '...');

const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

async function testChat() {
    try {
        const modelName = 'gemini-2.5-flash';
        console.log(`Testing with model: ${modelName}`);
        const model = genAI.getGenerativeModel({ model: modelName });
        const result = await model.generateContent("Hello");
        console.log('Response:', result.response.text());
    } catch (err: any) {
        console.error('Error:', err.message);
    }
}

testChat();
