import { Router } from 'express';
import {
    getAllVouchersHandler,
    getVoucherByIdHandler,
    getVoucherByCodeHandler,
    createVoucherHandler,
    updateVoucherHandler,
    deleteVoucherHandler,
    validateVoucherHandler,
    useVoucherHandler,
    redeemRewardVoucherHandler,
} from '@/controllers/voucher.controller';
import authenticate from '@/middlewares/authenticate';
import optionalAuthenticate from '@/middlewares/optional-authenticate';

const router = Router();

// Public routes
router.get('/', optionalAuthenticate, getAllVouchersHandler);
router.get('/code/:code', getVoucherByCodeHandler);
router.get('/:id', getVoucherByIdHandler);
router.post('/validate', optionalAuthenticate, validateVoucherHandler);

// Protected routes (User)
router.post('/:id/redeem', authenticate, redeemRewardVoucherHandler);

// Admin routes (add auth middleware later)
router.post('/', createVoucherHandler);
router.put('/:id', updateVoucherHandler);
router.delete('/:id', deleteVoucherHandler);
router.post('/:id/use', useVoucherHandler);

export default router;
