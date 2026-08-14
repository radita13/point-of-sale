import { Router } from 'express';
import { authGuard } from '../middleware/auth.js';
import { asyncHandler, validate } from '../middleware/validate.js';
import { getProducts, syncProducts } from '../controllers/products.controller.js';
import { productSyncPayloadSchema } from '@point-of-sale/shared';

const router = Router();

router.use(authGuard);

router.get('/', asyncHandler(getProducts));
router.post('/sync', validate(productSyncPayloadSchema), asyncHandler(syncProducts));

export default router;
