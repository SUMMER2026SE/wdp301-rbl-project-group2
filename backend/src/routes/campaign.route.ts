import { Router } from 'express';
import { authenticate, authorize, optionalAuthenticate } from '@/middlewares';
import { Role } from '@/types/user.type';
import {
  createCampaignHandler,
  deleteCampaignHandler,
  getCampaignByIdHandler,
  getCampaignsHandler,
  updateCampaignHandler,
  updateCampaignStatusHandler,
  trackCampaignActivityHandler,
} from '@/controllers/campaign.controller';

const campaignRoutes = Router();

// GET /api/campaigns - Available to logged-in users or guest (filters differently in controller)
campaignRoutes.get('/', optionalAuthenticate, getCampaignsHandler);

// GET /api/campaigns/:id - Detail view (Public for guests to view landing page)
campaignRoutes.get('/:id', optionalAuthenticate, getCampaignByIdHandler);

// POST /api/campaigns/:id/track - Track views/clicks
campaignRoutes.post('/:id/track', optionalAuthenticate, trackCampaignActivityHandler);

// POST /api/campaigns - Create proposal or approved campaign (Admin/Manager only)
campaignRoutes.post('/', authenticate, authorize(Role.ADMIN, Role.MANAGER), createCampaignHandler);

// PUT /api/campaigns/:id - Update campaign (Admin/Manager only)
campaignRoutes.put('/:id', authenticate, authorize(Role.ADMIN, Role.MANAGER), updateCampaignHandler);

// DELETE /api/campaigns/:id - Delete campaign (Admin/Manager only)
campaignRoutes.delete('/:id', authenticate, authorize(Role.ADMIN, Role.MANAGER), deleteCampaignHandler);

// PATCH /api/campaigns/:id/status - Update campaign status (Admin only)
campaignRoutes.patch('/:id/status', authenticate, authorize(Role.ADMIN), updateCampaignStatusHandler);

export default campaignRoutes;
