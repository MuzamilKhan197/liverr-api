import mongoose from "mongoose";
import createError from "../utils/createError.js";
import Review from "../models/reviewModel.js";
import Gig from "../models/gigModel.js";
import Order from "../models/orderModel.js";

export const createReview = async (req, res, next) => {
  if (req.isSeller) {
    return next(createError(403, "Sellers cannot create a review."));
  }

  const { gigId, desc, star } = req.body || {};
  const rating = Number(star);
  if (
    typeof gigId !== "string" ||
    !mongoose.isValidObjectId(gigId) ||
    typeof desc !== "string" ||
    !desc.trim() ||
    desc.trim().length > 2000 ||
    !Number.isInteger(rating) ||
    rating < 1 ||
    rating > 5
  ) {
    return next(createError(400, "Provide a valid review and rating."));
  }

  try {
    const gig = await Gig.findById(gigId).select("_id");
    if (!gig) {
      return next(createError(404, "Gig not found."));
    }
    const order = await Order.findOne({
      gigId,
      buyerId: req.userId,
      isCompleted: true,
    });
    if (!order) {
      return next(createError(403, "Purchase this gig before reviewing it."));
    }

    const existingReview = await Review.findOne({
      gigId,
      userId: req.userId,
    });
    if (existingReview) {
      return next(createError(409, "You have already reviewed this gig."));
    }

    const savedReview = await new Review({
      userId: req.userId,
      gigId,
      desc: desc.trim(),
      star: rating,
    }).save();

    await Gig.findByIdAndUpdate(gigId, {
      $inc: { totalStars: rating, starNumber: 1 },
    });
    return res.status(201).json(savedReview);
  } catch (err) {
    return next(err);
  }
};

export const getReviews = async (req, res, next) => {
  if (!mongoose.isValidObjectId(req.params.gigId)) {
    return next(createError(400, "Invalid gig id."));
  }

  try {
    const reviews = await Review.find({ gigId: req.params.gigId })
      .sort({ createdAt: -1 })
      .limit(100);
    return res.status(200).json(reviews);
  } catch (err) {
    return next(err);
  }
};

export const deleteReview = async (req, res, next) => {
  if (!mongoose.isValidObjectId(req.params.id)) {
    return next(createError(400, "Invalid review id."));
  }

  try {
    const review = await Review.findOneAndDelete({
      _id: req.params.id,
      userId: req.userId,
    });
    if (!review) {
      return next(createError(404, "Review not found."));
    }

    await Gig.findByIdAndUpdate(review.gigId, {
      $inc: { totalStars: -review.star, starNumber: -1 },
    });
    return res.status(200).json({ message: "Review has been deleted." });
  } catch (err) {
    return next(err);
  }
};
