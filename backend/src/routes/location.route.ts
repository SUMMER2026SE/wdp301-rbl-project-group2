import { Router } from 'express';
import { receiveLocation } from '../controllers/location.controller';

const router = Router();
router.post("/", receiveLocation);

export default router;

