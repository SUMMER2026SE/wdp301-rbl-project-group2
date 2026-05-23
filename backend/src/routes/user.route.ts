import { Router } from 'express';
import { authenticate } from '@/middlewares';
import { getMeHandler } from '@/controllers/auth.controller';
import { updateMeHandler, changePasswordHandler, updateMyAvatarHandler } from '@/controllers/user.controller';
import { getMyPointsHistoryHandler, getMyMembershipHandler, claimReferralHandler } from '@/controllers/membership.controller';
import { uploadImage } from "@/config/multer";

const userRoutes = Router();

userRoutes.get('/me', authenticate, getMeHandler);
userRoutes.patch('/me', authenticate, updateMeHandler);
userRoutes.patch('/me/password', authenticate, changePasswordHandler);
userRoutes.patch("/me/avatar", authenticate, uploadImage.single("file"), updateMyAvatarHandler);

userRoutes.get('/me/points', authenticate, getMyPointsHistoryHandler);
userRoutes.get('/me/membership', authenticate, getMyMembershipHandler);
userRoutes.post('/me/referral/claim', authenticate, claimReferralHandler);

export default userRoutes;
