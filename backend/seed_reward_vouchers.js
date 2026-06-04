const mongoose = require('mongoose');
const dotenv = require('dotenv');

// Load env vars
dotenv.config();

const MONGO_URI = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/foodie_dash";

const connectDB = async () => {
    try {
        await mongoose.connect(MONGO_URI);
        console.log('MongoDB connected');
    } catch (error) {
        console.error('MongoDB connection failed:', error.message);
        process.exit(1);
    }
};

const seedRewards = async () => {
    await connectDB();

    const VoucherModel = mongoose.model('Voucher', new mongoose.Schema({
        code: String,
        title: String,
        description: String,
        category: String,
        discountType: String,
        discountValue: Number,
        maxDiscount: Number,
        minOrderValue: Number,
        usageLimit: Number,
        usedCount: Number,
        isActive: Boolean,
        isReward: Boolean,
        pointCost: Number,
        ownerId: mongoose.Schema.Types.ObjectId,
        startAt: Date,
        endAt: Date,
    }), 'vouchers');

    // Clear old reward templates
    await VoucherModel.deleteMany({ isReward: true });

    // Design the dataset strategy
    const now = new Date();
    const nextYear = new Date();
    nextYear.setFullYear(now.getFullYear() + 1);

    const rewards = [
        {
            code: 'RWD-LV1-5PERC',
            title: 'Giảm 5% toàn Menu',
            description: 'Đổi 100 điểm lấy mã giảm giá 5% cho đơn hàng bất kỳ. Giảm tối đa 30K.',
            category: 'discount',
            discountType: 'percentage',
            discountValue: 5,
            maxDiscount: 30000,
            minOrderValue: 0,
            usageLimit: 999999,
            usedCount: 0,
            isActive: true,
            isReward: true,
            pointCost: 100,
            ownerId: null,
            startAt: now,
            endAt: nextYear
        },
        {
            code: 'RWD-LV2-12PERC',
            title: 'Giảm 12% toàn Menu',
            description: 'Đổi 200 điểm lấy mã giảm giá 12%. Cơ hội tiết kiệm cực tốt! Giảm tối đa 60K.',
            category: 'discount',
            discountType: 'percentage',
            discountValue: 12,
            maxDiscount: 60000,
            minOrderValue: 0,
            usageLimit: 999999,
            usedCount: 0,
            isActive: true,
            isReward: true,
            pointCost: 200,
            ownerId: null,
            startAt: now,
            endAt: nextYear
        },
        {
            code: 'RWD-LV3-25PERC',
            title: 'Giảm 25% siêu hấp dẫn',
            description: 'Giữ điểm lâu, thưởng càng sâu! Đổi 400 điểm lấy ngay mã giảm 25% (Tối đa 100K).',
            category: 'special',
            discountType: 'percentage',
            discountValue: 25,
            maxDiscount: 100000,
            minOrderValue: 150000,
            usageLimit: 999999,
            usedCount: 0,
            isActive: true,
            isReward: true,
            pointCost: 400,
            ownerId: null,
            startAt: now,
            endAt: nextYear
        },
        {
            code: 'RWD-LV4-FIX100K',
            title: 'Giảm thẳng 100K',
            description: 'Đổi 1.000 điểm để được giảm thẳng 100.000đ trừ vào tổng tiền thanh toán.',
            category: 'special',
            discountType: 'fixed',
            discountValue: 100000,
            maxDiscount: null,
            minOrderValue: 0,
            usageLimit: 999999,
            usedCount: 0,
            isActive: true,
            isReward: true,
            pointCost: 1000,
            ownerId: null,
            startAt: now,
            endAt: nextYear
        },
        {
            code: 'RWD-LV5-FIX300K',
            title: 'Giảm siêu cấp 300K',
            description: 'Phần thưởng xứng đáng cho người sành ăn! Đổi 2.500 điểm lấy mã giảm giá trị 300.000đ.',
            category: 'special',
            discountType: 'fixed',
            discountValue: 300000,
            maxDiscount: null,
            minOrderValue: 0,
            usageLimit: 999999,
            usedCount: 0,
            isActive: true,
            isReward: true,
            pointCost: 2500,
            ownerId: null,
            startAt: now,
            endAt: nextYear
        },
        {
            code: 'RWD-LV6-FREESHIP',
            title: 'Miễn phí giao hàng xịn',
            description: 'Đổi 150 điểm để không phải lo nghĩ về phí ship! Miễn phí vận chuyển lên tới 50.000đ.',
            category: 'freeship',
            discountType: 'fixed', // assuming fixed discount applied to shipping
            discountValue: 50000,
            maxDiscount: null,
            minOrderValue: 0,
            usageLimit: 999999,
            usedCount: 0,
            isActive: true,
            isReward: true,
            pointCost: 150,
            ownerId: null,
            startAt: now,
            endAt: nextYear
        }
    ];

    try {
        await VoucherModel.insertMany(rewards);
        console.log(`Successfully inserted ${rewards.length} reward vouchers!`);
    } catch (e) {
        console.error('Failed to insert rewards:', e);
    } finally {
        process.exit(0);
    }
};

seedRewards();
