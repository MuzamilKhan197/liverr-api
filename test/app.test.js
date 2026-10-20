import test from "node:test";
import assert from "node:assert/strict";
import request from "supertest";
import app from "../app.js";

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
