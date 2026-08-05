import { Router } from 'express';
import { authGuard } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/validate.js';
import { getLowStock, adjustInventory } from '../controllers/inventory.controller.js';

const router = Router();

router.use(authGuard);

router.get('/low-stock', asyncHandler(getLowStock));
router.post('/adjustments', asyncHandler(adjustInventory));

export default router;
