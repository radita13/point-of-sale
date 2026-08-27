import { Router } from "express";
import { authGuard } from "../middleware/auth.js";
import { asyncHandler } from "../middleware/validate.js";
import { getMyStore } from "../controllers/stores.controller.js";

const router = Router();

router.use(authGuard);

router.get("/me", asyncHandler(getMyStore));

export default router;
