import { Router } from 'express';
import { z } from 'zod';
import { authGuard } from '../middleware/auth.js';
import { asyncHandler, validate } from '../middleware/validate.js';
import { getLowStock, adjustInventory } from '../controllers/inventory.controller.js';
import { inventoryAdjustmentSchema } from '@point-of-sale/shared';

const adjustmentsPayloadSchema = z.object({
  storeId: z.string().min(1),
  adjustments: z.array(inventoryAdjustmentSchema).min(1).max(100),
});

const router = Router();

router.use(authGuard);

router.get('/low-stock', asyncHandler(getLowStock));
router.post('/adjustments', validate(adjustmentsPayloadSchema), asyncHandler(adjustInventory));

export default router;
