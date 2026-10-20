import mongoose from "mongoose";
import Gig from "../models/gigModel.js";
import createError from "../utils/createError.js";

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export const createGig = async (req, res, next) => {
  if (!req.isSeller) {
    return next(createError(403, "Only sellers can create a gig."));
  }

  const {
    title,
    desc,
    cat,
    price,
    cover,
    images,
    shortTitle,
    shortDesc,
    deliveryTime,
    revisionNumber,
    features,
  } = req.body || {};
  const numericPrice = Number(price);
  if (!Number.isFinite(numericPrice) || numericPrice < 1) {
    return next(createError(400, "Price must be a positive number."));
  }

  try {
    const savedGig = await new Gig({
      userId: req.userId,
      title,
      desc,
      cat,
      price: numericPrice,
      cover,
      images: Array.isArray(images) ? images : [],
      shortTitle,
      shortDesc,
      deliveryTime,
      revisionNumber,
      features: Array.isArray(features) ? features : [],
    }).save();
    return res.status(201).json(savedGig);
  } catch (err) {
    return next(err);
  }
};

export const deleteGig = async (req, res, next) => {
  if (!mongoose.isValidObjectId(req.params.id)) {
    return next(createError(400, "Invalid gig id."));
  }

  try {
    const gig = await Gig.findById(req.params.id);
    if (!gig) {
      return next(createError(404, "Gig not found."));
    }
    if (gig.userId !== req.userId) {
      return next(createError(403, "You can delete only your gig."));
    }

    await gig.deleteOne();
    return res.status(200).json({ message: "Gig has been deleted." });
  } catch (err) {
    return next(err);
  }
};

export const getGig = async (req, res, next) => {
  if (!mongoose.isValidObjectId(req.params.id)) {
    return next(createError(400, "Invalid gig id."));
  }

  try {
    const gig = await Gig.findById(req.params.id);
    if (!gig) {
      return next(createError(404, "Gig not found."));
    }
    return res.status(200).json(gig);
  } catch (err) {
    return next(err);
  }
};

export const getGigs = async (req, res, next) => {
  const { userId, cat, min, max, search, sort } = req.query;
  const filters = {};

  if (userId) {
    if (!mongoose.isValidObjectId(userId)) {
      return next(createError(400, "Invalid user id."));
    }
    filters.userId = userId;
  }
  if (cat) {
    if (typeof cat !== "string" || cat.length > 80) {
      return next(createError(400, "Invalid category."));
    }
    filters.cat = cat;
  }
  if (min !== undefined || max !== undefined) {
    const price = {};
    if (min !== undefined && min !== "") {
      price.$gte = Number(min);
    }
    if (max !== undefined && max !== "") {
      price.$lte = Number(max);
    }
    if (
      Object.values(price).some((value) => !Number.isFinite(value) || value < 0) ||
      (price.$gte !== undefined &&
        price.$lte !== undefined &&
        price.$gte > price.$lte)
    ) {
      return next(createError(400, "Invalid price range."));
    }
    if (Object.keys(price).length > 0) {
      filters.price = price;
    }
  }
  if (search) {
    if (typeof search !== "string" || search.length > 100) {
      return next(createError(400, "Search query is too long."));
    }
    filters.title = { $regex: escapeRegex(search), $options: "i" };
  }

  const sortField = ["sales", "createdAt", "price"].includes(sort)
    ? sort
    : "sales";

  try {
    const gigs = await Gig.find(filters).sort({ [sortField]: -1 }).limit(100);
    return res.status(200).json(gigs);
  } catch (err) {
    return next(err);
  }
};
