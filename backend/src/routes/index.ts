import { Router } from 'express';
import authRoutes from './auth.route';
import fileRoutes from './file.route';
import userRoutes from './user.route';
import { uploadImage } from '@/config/multer';
import { uploadBuffer } from '@/utils/uploadFile';
import reviewRoutes from './review.route';
import settingsRoute from './settings.route';
import supportChatRoutes from './support-chat.route';

const appRoutes = Router();

appRoutes.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

appRoutes.use('/auth', authRoutes);
appRoutes.use('/files', fileRoutes);
appRoutes.use('/users', userRoutes);

appRoutes.use('/reviews', reviewRoutes);
appRoutes.use('/settings', settingsRoute);
appRoutes.use('/support', supportChatRoutes);




appRoutes.post('/upload', uploadImage.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ message: 'Thiếu ảnh' });

  const result = await uploadBuffer({
    file: req.file,
  });

  return res.json(result);
});

export default appRoutes;
