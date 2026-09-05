import { Router } from 'express';
import { authGuard } from '../middleware/auth';
import { asyncHandler, validate } from '../middleware/validate';
import { getProducts, syncProducts } from '../controllers/products.controller';
import { productSyncPayloadSchema, getProductsQuerySchema } from '@point-of-sale/shared';

const router = Router();

router.use(authGuard);

router.get('/', validate(getProductsQuerySchema, 'query'), asyncHandler(getProducts));
router.post('/sync', validate(productSyncPayloadSchema), asyncHandler(syncProducts));

export default router;
