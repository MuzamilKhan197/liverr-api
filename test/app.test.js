import test from "node:test";
import assert from "node:assert/strict";
import request from "supertest";
import app from "../app.js";

const allowedOrigin = (process.env.CLIENT_URL || "http://localhost:5173")
  .split(",")[0]
  .trim()
  .replace(/\/$/, "");

test("liveness check is available without a database connection", async () => {
  const response = await request(app).get("/live");

  assert.equal(response.status, 200);
  assert.deepEqual(response.body, { status: "ok" });
});

test("readiness check reports the database connection state", async () => {
  const response = await request(app).get("/health");

  assert.ok([200, 503].includes(response.status));
  assert.equal(response.body.database, response.status === 200 ? "connected" : "disconnected");
});

test("unknown routes return a JSON 404", async () => {
  const response = await request(app).get("/not-a-route");

  assert.equal(response.status, 404);
  assert.equal(response.body.message, "Route not found.");
});

test("mutation requests reject an untrusted browser origin", async () => {
  const response = await request(app)
    .post("/api/auth/login")
    .set("Origin", "https://untrusted.example")
    .send({ username: "user", password: "password" });

  assert.equal(response.status, 403);
  assert.equal(response.body.message, "Origin is not allowed.");
});

test("login preflight allows the configured frontend origin and request headers", async () => {
  const response = await request(app)
    .options("/api/auth/login")
    .set("Origin", allowedOrigin)
    .set("Access-Control-Request-Method", "POST")
    .set("Access-Control-Request-Headers", "content-type,authorization");

  assert.equal(response.status, 204);
  assert.equal(response.headers["access-control-allow-origin"], allowedOrigin);
  assert.equal(response.headers["access-control-allow-credentials"], "true");
  assert.deepEqual(
    response.headers["access-control-allow-methods"]
      .split(",")
      .map((method) => method.trim()),
    ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  );
  assert.deepEqual(
    response.headers["access-control-allow-headers"]
      .split(",")
      .map((header) => header.trim().toLowerCase())
      .sort(),
    ["authorization", "content-type"],
  );
});

test("login is mounted under the /api prefix", async () => {
  const response = await request(app)
    .post("/auth/login")
    .set("Origin", allowedOrigin)
    .send({ username: "user", password: "password" });

  assert.equal(response.status, 404);
  assert.equal(response.body.message, "Route not found.");
});

test("image uploads reject files larger than the serverless request limit", async () => {
  const response = await request(app)
    .post("/api/upload")
    .attach("file", Buffer.alloc(4 * 1024 * 1024 + 1), {
      filename: "large.png",
      contentType: "image/png",
    });

  assert.equal(response.status, 413);
  assert.equal(response.body.message, "Image must be 4 MB or smaller.");
});
