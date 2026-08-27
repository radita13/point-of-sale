import { Router } from 'express';
import { authGuard } from '../middleware/auth.js';
import { asyncHandler, validate } from '../middleware/validate.js';
import {
  syncTransactions,
  getSyncStatus,
  getTransactions,
} from '../controllers/transactions.controller.js';
import {
  syncPayloadSchema,
  syncStatusQuerySchema,
  getTransactionsQuerySchema,
} from '@point-of-sale/shared';

const router = Router();

router.use(authGuard);

router.post('/sync', validate(syncPayloadSchema), asyncHandler(syncTransactions));
router.get('/sync-status', validate(syncStatusQuerySchema, 'query'), asyncHandler(getSyncStatus));
router.get('/', validate(getTransactionsQuerySchema, 'query'), asyncHandler(getTransactions));

export default router;
