import { Router } from 'express';
import authenticate from '@/middlewares/authenticate';
import authorize from '@/middlewares/authorize';
import { requireManagerStore } from '@/middlewares';
import {
  cancelManagerStaffRequestHandler,
  confirmManagerCodCollectionHandler,
  createManagerCreateStaffRequestHandler,
  createManagerDeactivateStaffRequestHandler,
  getManagerCashOverviewHandler,
  getManagerContext,
  getManagerDashboardMetricsHandler,
  getManagerMenuHandler,
  getManagerOrderDetailHandler,
  getManagerOrdersHandler,
  getManagerProductDetailHandler,
  getManagerSettingsHandler,
  getManagerStaffHandler,
  getManagerStaffRequestDetailHandler,
  getManagerStaffRequestsHandler,
  managerAssignDeliveryHandler,
  managerCancelOrderHandler,
  managerConfirmOrderHandler,
  managerManualCompleteOrderHandler,
  managerOrderOverrideStatusHandler,
  managerRejectOrderHandler,
  updateManagerProductAvailabilityHandler,
  updateManagerSettingsHandler,
} from '@/controllers/manager.controller';
import { Role } from '@/types/user.type';

const router = Router();

router.use(authenticate, authorize(Role.MANAGER), requireManagerStore);

router.get('/me', getManagerContext);
router.get('/dashboard/metrics', getManagerDashboardMetricsHandler);
router.get('/cash', getManagerCashOverviewHandler);
router.patch('/cash/collect', confirmManagerCodCollectionHandler);
router.get('/settings', getManagerSettingsHandler);
router.put('/settings', updateManagerSettingsHandler);

router.get('/orders', getManagerOrdersHandler);
router.get('/orders/:id', getManagerOrderDetailHandler);
router.patch('/orders/:id/confirm', managerConfirmOrderHandler);
router.patch('/orders/:id/reject', managerRejectOrderHandler);
router.patch('/orders/:id/cancel', managerCancelOrderHandler);
router.patch('/orders/:id/assign-delivery', managerAssignDeliveryHandler);
router.patch('/orders/:id/manual-complete', managerManualCompleteOrderHandler);
router.patch('/orders/:id/override-status', managerOrderOverrideStatusHandler);

router.get('/menu', getManagerMenuHandler);
router.get('/menu/:id', getManagerProductDetailHandler);
router.patch('/menu/:id/availability', updateManagerProductAvailabilityHandler);

router.get('/staff', getManagerStaffHandler);
router.get('/staff-requests', getManagerStaffRequestsHandler);
router.get('/staff-requests/:id', getManagerStaffRequestDetailHandler);
router.post('/staff-requests/create-staff', createManagerCreateStaffRequestHandler);
router.post('/staff-requests/deactivate-staff', createManagerDeactivateStaffRequestHandler);
router.patch('/staff-requests/:id/cancel', cancelManagerStaffRequestHandler);

export default router;
