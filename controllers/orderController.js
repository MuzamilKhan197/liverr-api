import mongoose from "mongoose";
import Stripe from "stripe";
import createError from "../utils/createError.js";
import Gig from "../models/gigModel.js";
import Order from "../models/orderModel.js";
import Review from "../models/reviewModel.js";

const getStripe = (next) => {
  if (!process.env.STRIPE_SECRET_KEY) {
    next(createError(503, "Payments are not configured."));
    return null;
  }
  return new Stripe(process.env.STRIPE_SECRET_KEY);
};

export const intent = async (req, res, next) => {
  if (!mongoose.isValidObjectId(req.params.id)) {
    return next(createError(400, "Invalid gig id."));
  }
  const stripe = getStripe(next);
  if (!stripe) return;

  try {
    const gig = await Gig.findById(req.params.id);
    if (!gig) {
      return next(createError(404, "Gig not found."));
    }
    if (gig.userId === req.userId) {
      return next(createError(400, "You cannot purchase your own gig."));
    }

    const amount = Math.round(gig.price * 100);
    if (!Number.isSafeInteger(amount) || amount < 1) {
      return next(createError(400, "Gig price is invalid for payment."));
    }

    const paymentIntent = await stripe.paymentIntents.create({
      amount,
      currency: "usd",
      automatic_payment_methods: { enabled: true },
      metadata: {
        gigId: gig._id.toString(),
        buyerId: req.userId,
      },
    });

    await new Order({
      gigId: gig._id.toString(),
      img: gig.cover,
      title: gig.title,
      buyerId: req.userId,
      sellerId: gig.userId,
      price: gig.price,
      payment_intent: paymentIntent.id,
    }).save();

    return res.status(200).json({
      clientSecret: paymentIntent.client_secret,
    });
  } catch (err) {
    return next(err);
  }
};

export const getOrders = async (req, res, next) => {
  try {
    const orders = await Order.find({
      ...(req.isSeller ? { sellerId: req.userId } : { buyerId: req.userId }),
      isCompleted: true,
    }).sort({ createdAt: -1 });

    return res.status(200).json(orders);
  } catch (err) {
    return next(err);
  }
};

export const getReviewEligibility = async (req, res, next) => {
  if (req.isSeller) {
    return res.status(200).json({ canReview: false });
  }
  if (!mongoose.isValidObjectId(req.params.gigId)) {
    return next(createError(400, "Invalid gig id."));
  }

  try {
    const [order, existingReview] = await Promise.all([
      Order.exists({
        gigId: req.params.gigId,
        buyerId: req.userId,
        isCompleted: true,
      }),
      Review.exists({ gigId: req.params.gigId, userId: req.userId }),
    ]);
    return res.status(200).json({
      canReview: Boolean(order) && !existingReview,
    });
  } catch (err) {
    return next(err);
  }
};

export const confirm = async (req, res, next) => {
  const paymentIntentId = req.body?.payment_intent;
  if (
    typeof paymentIntentId !== "string" ||
    !paymentIntentId.startsWith("pi_")
  ) {
    return next(createError(400, "A valid payment intent is required."));
  }
  const stripe = getStripe(next);
  if (!stripe) return;

  try {
    const order = await Order.findOne({
      payment_intent: paymentIntentId,
      buyerId: req.userId,
    });
    if (!order) {
      return next(createError(404, "Order not found."));
    }

    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
    const expectedAmount = Math.round(order.price * 100);
    if (
      paymentIntent.status !== "succeeded" ||
      paymentIntent.amount_received !== expectedAmount ||
      paymentIntent.currency !== "usd" ||
      paymentIntent.metadata.buyerId !== req.userId ||
      paymentIntent.metadata.gigId !== order.gigId
    ) {
      return next(createError(402, "Payment has not been completed."));
    }

    if (!order.isCompleted) {
      const completedOrder = await Order.findOneAndUpdate(
        { _id: order._id, isCompleted: false },
        { $set: { isCompleted: true } },
        { new: true },
      );
      if (completedOrder) {
        await Gig.findByIdAndUpdate(order.gigId, { $inc: { sales: 1 } });
      }
    }

    return res.status(200).json({ message: "Order has been confirmed." });
  } catch (err) {
    return next(err);
  }
};
