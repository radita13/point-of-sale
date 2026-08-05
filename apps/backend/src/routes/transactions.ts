import { Router } from 'express';
import { authGuard } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/validate.js';
import {
  syncTransactions,
  getSyncStatus,
  getTransactions,
} from '../controllers/transactions.controller.js';

const router = Router();

router.use(authGuard);

router.post('/sync', asyncHandler(syncTransactions));
router.get('/sync-status', asyncHandler(getSyncStatus));
router.get('/', asyncHandler(getTransactions));

export default router;
