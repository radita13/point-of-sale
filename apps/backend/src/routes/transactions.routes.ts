import { Router } from 'express';
import { authGuard } from '../middleware/auth';
import { asyncHandler, validate } from '../middleware/validate';
import {
  syncTransactions,
  getSyncStatus,
  getTransactions,
} from '../controllers/transactions.controller';
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
