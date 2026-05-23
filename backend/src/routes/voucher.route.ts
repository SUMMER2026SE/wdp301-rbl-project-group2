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
} from '@/controllers/voucher.controller';

const router = Router();

// Public routes
router.get('/', getAllVouchersHandler);
router.get('/code/:code', getVoucherByCodeHandler);
router.get('/:id', getVoucherByIdHandler);
router.post('/validate', validateVoucherHandler);

// Admin routes (add auth middleware later)
router.post('/', createVoucherHandler);
router.put('/:id', updateVoucherHandler);
router.delete('/:id', deleteVoucherHandler);
router.post('/:id/use', useVoucherHandler);

export default router;
