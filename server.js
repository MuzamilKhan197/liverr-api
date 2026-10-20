import "dotenv/config";
import mongoose from "mongoose";
import app from "./app.js";

const required = ["MONGO_URI", "JWT_KEY"];
const missing = required.filter((name) => !process.env[name]);

if (missing.length > 0) {
  console.error(`Missing required environment variables: ${missing.join(", ")}`);
  process.exit(1);
}

if (
  process.env.NODE_ENV === "production" &&
  process.env.JWT_KEY.length < 32
) {
  console.error("JWT_KEY must contain at least 32 characters in production.");
  process.exit(1);
}

if (process.env.NODE_ENV === "production" && !process.env.CLIENT_URL) {
  console.error("CLIENT_URL must be configured in production.");
  process.exit(1);
}

const port = Number(process.env.PORT || 8000);
if (!Number.isInteger(port) || port < 1 || port > 65535) {
  console.error("PORT must be a valid TCP port.");
  process.exit(1);
}

try {
  await mongoose.connect(process.env.MONGO_URI);
  const server = app.listen(port, () => {
    console.info(`API listening on port ${port}`);
  });

  const shutdown = async (signal) => {
    console.info(`${signal} received; closing server.`);
    server.close(async (error) => {
      if (error) {
        console.error("HTTP server shutdown failed.");
        process.exitCode = 1;
      }
      await mongoose.disconnect();
    });
  };

  process.once("SIGINT", () => shutdown("SIGINT"));
  process.once("SIGTERM", () => shutdown("SIGTERM"));
} catch {
  console.error("MongoDB connection failed; API startup aborted.");
  process.exit(1);
}
