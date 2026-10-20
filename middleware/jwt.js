import jwt from "jsonwebtoken";
import createError from "../utils/createError.js";

export const verifyToken = (req, res, next) => {
  const token = req.cookies?.accessToken;
  if (!token) {
    return next(createError(401, "You are not authenticated."));
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_KEY);
    if (
      typeof payload === "string" ||
      typeof payload.id !== "string" ||
      typeof payload.isSeller !== "boolean"
    ) {
      return next(createError(403, "Token is not valid."));
    }

    req.userId = payload.id;
    req.isSeller = payload.isSeller;
    return next();
  } catch {
    return next(createError(403, "Token is not valid."));
  }
};