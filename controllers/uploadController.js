import createError from "../utils/createError.js";
import { isCloudinaryConfigured, uploadImage } from "../utils/cloudinary.js";

export const uploadImageFile = async (req, res, next) => {
  if (!req.file || !req.file.mimetype.startsWith("image/")) {
    return next(createError(400, "Choose a valid image file to upload."));
  }
  if (!isCloudinaryConfigured()) {
    return next(createError(503, "Image uploads are not configured."));
  }

  try {
    const url = await uploadImage(req.file);
    return res.status(201).json({ url });
  } catch (error) {
    return next(error);
  }
};
