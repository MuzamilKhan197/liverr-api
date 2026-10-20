import "dotenv/config";
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import { rateLimit } from "express-rate-limit";
import authRoute from "./routes/authRoute.js";
import userRoute from "./routes/userRoute.js";
import gigRoute from "./routes/gigRoute.js";
import orderRoute from "./routes/orderRoute.js";
import conversationRoute from "./routes/conversationRoute.js";
import messageRoute from "./routes/messageRoute.js";
import reviewRoute from "./routes/reviewRoute.js";
import uploadRoute from "./routes/uploadRoute.js";
import createError from "./utils/createError.js";
import connectToDatabase from "./utils/connectToDatabase.js";

const allowedOrigins = (process.env.CLIENT_URL || "http://localhost:5173")
  .split(",")
  .map((origin) => origin.trim().replace(/\/$/, ""))
  .filter(Boolean);

export const app = express();

app.disable("x-powered-by");
app.set("trust proxy", process.env.TRUST_PROXY === "1" ? 1 : false);
app.use(helmet());
app.use(
  cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(createError(403, "Origin is not allowed."));
    },
    credentials: true,
  }),
);
app.use(express.json({ limit: "1mb" }));
app.use(cookieParser());
app.use((req, res, next) => {
  const isMutation = ["POST", "PUT", "PATCH", "DELETE"].includes(req.method);
  const origin = req.get("origin");
  if (isMutation && origin && !allowedOrigins.includes(origin)) {
    return next(createError(403, "Origin is not allowed."));
  }
  return next();
});

app.get("/health", async (req, res) => {
  try {
    await connectToDatabase();
    return res.status(200).json({ status: "ok", database: "connected" });
  } catch {
    return res
      .status(503)
      .json({ status: "unavailable", database: "disconnected" });
  }
});

const ensureDatabaseConnection = (req, res, next) => {
  connectToDatabase().then(
    () => next(),
    (error) => next(error),
  );
};

app.get("/live", (req, res) => {
  res.status(200).json({ status: "ok" });
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: { message: "Too many authentication attempts. Try again later." },
});

app.use("/api/auth", authLimiter, ensureDatabaseConnection, authRoute);
app.use("/api/users", ensureDatabaseConnection, userRoute);
app.use("/api/gigs", ensureDatabaseConnection, gigRoute);
app.use("/api/orders", ensureDatabaseConnection, orderRoute);
app.use("/api/conversations", ensureDatabaseConnection, conversationRoute);
app.use("/api/messages", ensureDatabaseConnection, messageRoute);
app.use("/api/reviews", ensureDatabaseConnection, reviewRoute);
app.use("/api/upload", uploadRoute);

app.use((req, res, next) => {
  next(createError(404, "Route not found."));
});

app.use((err, req, res, next) => {
  if (res.headersSent) {
    return next(err);
  }

  const status = err.status || (err.name === "ValidationError" ? 400 : 500);
  if (status >= 500) {
    console.error("Request failed:", err.message);
  }

  return res.status(status).json({
    message:
      status >= 500 && process.env.NODE_ENV === "production"
        ? "An unexpected error occurred."
        : err.message || "Something went wrong.",
  });
});

export default app;
