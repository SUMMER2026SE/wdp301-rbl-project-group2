import { Router } from 'express';
import authRoutes from './auth.route';
import adminRoutes from './admin.route';
import voucherRoutes from './voucher.route';
import productRoute from './product.route';
import locationRoutes from './location.route';
import orderRoutes from './order.route';
import fileRoutes from './file.route';
import userRoutes from './user.route';
import cartRouter from './cart.route';
import chatRoutes from './chat.route';
import supportChatRoutes from './support-chat.route';
import paymentRoutes from './payment.route';
import notificationRoutes from './notification.route';
import reviewRoutes from './review.route';
import { uploadImage } from '@/config/multer';
import { uploadBuffer } from '@/utils/upload-file';
import { parseFormData } from '@/utils/parse-form-data';
import settingsRoute from './settings.route';
import storeRoutes from './store.route';
import ingredientRoutes from './ingredient.route';
import { ALLERGEN_CATALOG } from '@/constants/allergen-catalog';
import campaignRoutes from './campaign.route';
import managerRoutes from './manager.route';

const appRoutes = Router();

appRoutes.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

appRoutes.get('/allergens', (_req, res) => {
  res.json({ success: true, data: ALLERGEN_CATALOG });
});

appRoutes.use('/auth', authRoutes);
appRoutes.use('/admin', adminRoutes);
appRoutes.use('/manager', managerRoutes);
appRoutes.use('/vouchers', voucherRoutes);
appRoutes.use('/campaigns', campaignRoutes);
appRoutes.use('/products', productRoute);
appRoutes.use('/location', locationRoutes);
appRoutes.use('/orders', orderRoutes);
appRoutes.use('/notifications', notificationRoutes);
appRoutes.use('/reviews', reviewRoutes);

// File upload / management — bảo vệ bằng auth trong file.route.ts
appRoutes.use('/files', fileRoutes);
appRoutes.use('/users', userRoutes);
appRoutes.use('/cart', cartRouter);
appRoutes.use('/chat', chatRoutes);
appRoutes.use('/support', supportChatRoutes);
appRoutes.use('/payments', paymentRoutes);
appRoutes.use('/settings', settingsRoute);
appRoutes.use('/stores', storeRoutes);
appRoutes.use('/ingredients', ingredientRoutes);

appRoutes.post('/upload', uploadImage.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ message: 'Thiếu ảnh' });

  const file = req.file;
  const data = parseFormData(req.body);

  const result = await uploadBuffer({
    file: req.file,
  });

  return res.json(result);
});

export default appRoutes;
