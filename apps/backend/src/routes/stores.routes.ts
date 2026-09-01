import { Router } from "express";
import { authGuard } from "../middleware/auth.js";
import { asyncHandler, validate } from "../middleware/validate.js";
import { getMyStore, updateMyStore } from "../controllers/stores.controller.js";
import { updateStoreSchema } from "@point-of-sale/shared";

const router = Router();

router.use(authGuard);

router.get("/me", asyncHandler(getMyStore));
router.patch("/me", validate(updateStoreSchema), asyncHandler(updateMyStore));

export default router;
