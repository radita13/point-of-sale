import { Router } from 'express';
import { authGuard } from '../middleware/auth.js';
import { asyncHandler, validate } from '../middleware/validate.js';
import { getLowStock, adjustInventory } from '../controllers/inventory.controller.js';
import { inventoryAdjustmentsPayloadSchema, getLowStockQuerySchema } from '@point-of-sale/shared';

const router = Router();

router.use(authGuard);

router.get('/low-stock', validate(getLowStockQuerySchema, 'query'), asyncHandler(getLowStock));
router.post('/adjustments', validate(inventoryAdjustmentsPayloadSchema), asyncHandler(adjustInventory));

export default router;
