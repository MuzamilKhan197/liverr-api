import { Router } from "express";
import multer from "multer";
import { rateLimit } from "express-rate-limit";
import createError from "../utils/createError.js";
import { uploadImageFile } from "../controllers/uploadController.js";

const router = Router();
const receiveImage = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 4 * 1024 * 1024, files: 1 },
}).single("file");

const uploadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: { message: "Too many image uploads. Try again later." },
});

router.post("/", uploadLimiter, (req, res, next) => {
  receiveImage(req, res, (error) => {
    if (!error) {
      return uploadImageFile(req, res, next);
    }
    if (error.code === "LIMIT_FILE_SIZE") {
      return next(createError(413, "Image must be 4 MB or smaller."));
    }
    return next(createError(400, "Invalid image upload."));
  });
});

export default router;
