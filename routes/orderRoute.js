import express from "express";
import { verifyToken } from "../middleware/jwt.js";
import {
  getOrders,
  getReviewEligibility,
  intent,
  confirm,
} from "../controllers/orderController.js";

const router = express.Router();

// router.post("/:gigId", verifyToken, createOrder);
router.get("/", verifyToken, getOrders);
router.get("/review-eligibility/:gigId", verifyToken, getReviewEligibility);
router.post("/create-payment-intent/:id", verifyToken, intent);
router.put("/", verifyToken, confirm);

export default router;