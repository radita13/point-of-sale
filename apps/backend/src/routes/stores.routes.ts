import { Router } from "express";
import { authGuard } from "../middleware/auth";
import { asyncHandler } from "../middleware/validate";
import { getMyStore } from "../controllers/stores.controller";

const router = Router();

router.use(authGuard);

router.get("/me", asyncHandler(getMyStore));

export default router;
