import { Router } from "express";
import { authGuard } from "../middleware/auth.js";
import { asyncHandler, validate } from "../middleware/validate.js";
import {
  getStoreInsightHandler,
  chatAiHandler,
  getConversationsHandler,
  deleteConversationHandler,
} from "../controllers/ai.controller.js";
import { aiChatPayloadSchema } from "@point-of-sale/shared";

const router = Router();

router.use(authGuard);

router.get("/insight", asyncHandler(getStoreInsightHandler));
router.post("/chat", validate(aiChatPayloadSchema), asyncHandler(chatAiHandler));
router.get("/conversations", asyncHandler(getConversationsHandler));
router.delete("/conversations/:id", asyncHandler(deleteConversationHandler));

export default router;
