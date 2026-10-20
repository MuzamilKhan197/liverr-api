import mongoose from "mongoose";
import User from "../models/userModel.js";
import createError from "../utils/createError.js";

export const deleteUser = async (req, res, next) => {
  if (req.userId !== req.params.id) {
    return next(createError(403, "You can delete only your account."));
  }
  if (!mongoose.isValidObjectId(req.params.id)) {
    return next(createError(400, "Invalid user id."));
  }

  try {
    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) {
      return next(createError(404, "User not found."));
    }
    return res.status(200).json({ message: "User has been deleted." });
  } catch (err) {
    return next(err);
  }
};

export const getUser = async (req, res, next) => {
  if (!mongoose.isValidObjectId(req.params.id)) {
    return next(createError(400, "Invalid user id."));
  }

  try {
    const user = await User.findById(req.params.id).select(
      "username img country desc isSeller createdAt",
    );
    if (!user) {
      return next(createError(404, "User not found."));
    }
    return res.status(200).json(user);
  } catch (err) {
    return next(err);
  }
};
