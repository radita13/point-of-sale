import { Router } from 'express';
import { authGuard } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/validate.js';
import { getProducts, syncProducts } from '../controllers/products.controller.js';

const router = Router();

router.use(authGuard);

router.get('/', asyncHandler(getProducts));
router.post('/sync', asyncHandler(syncProducts));

export default router;
