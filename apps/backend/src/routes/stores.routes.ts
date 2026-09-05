import { Router } from "express";
import { authGuard } from "../middleware/auth";
import { asyncHandler, validate } from "../middleware/validate";
import { getMyStore, updateMyStore } from "../controllers/stores.controller";
import { updateStoreSchema } from "@point-of-sale/shared";

const router = Router();

router.use(authGuard);

router.get("/me", asyncHandler(getMyStore));
router.patch("/me", validate(updateStoreSchema), asyncHandler(updateMyStore));

export default router;
