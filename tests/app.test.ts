import { describe, it, expect } from "vitest";
import request from "supertest";
import express from "express";
import appRoutes from "../src/routes/app.routes";

const app = express();

// Test app instance with only the middleware required for API route testing
app.use(express.json());
app.use("/apps", appRoutes);

describe("EasyData API", () => {
  let appId: string;
  let apiToken: string;

  it("creates an app", async () => {
    const res = await request(app).post("/apps").send({
      name: "Test App",
    });

    expect(res.status).toBe(201);
    expect(res.body.id).toBeDefined();
    expect(res.body.apiToken).toBeDefined();

    appId = res.body.id;
    apiToken = res.body.apiToken;
  });

  it("requires auth for schema access", async () => {
    const res = await request(app).get(`/apps/${appId}/schema`);

    expect(res.status).toBe(401);
    expect(res.body.error).toBe("Missing Authorization header");
  });

  it("returns schema with a valid token", async () => {
    const res = await request(app)
      .get(`/apps/${appId}/schema`)
      .set("Authorization", `Bearer ${apiToken}`);

    expect(res.status).toBe(200);
    expect(res.body.schema).toBeDefined();
  });

  it("creates a table", async () => {
    const res = await request(app)
      .post(`/apps/${appId}/tables`)
      .set("Authorization", `Bearer ${apiToken}`)
      .send({
        tableName: "submissions",
        columns: [
          { name: "student_name", type: "TEXT" },
          { name: "photo_url", type: "TEXT" },
        ],
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.table).toBe("submissions");
  });

  it("inserts a row", async () => {
    const res = await request(app)
      .post(`/apps/${appId}/tables/submissions/rows`)
      .set("Authorization", `Bearer ${apiToken}`)
      .send({
        student_name: "Alex",
        photo_url: "/uploads/test.jpg",
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.rowId).toBeDefined();
  });

  it("gets rows", async () => {
    const res = await request(app)
      .get(`/apps/${appId}/tables/submissions/rows`)
      .set("Authorization", `Bearer ${apiToken}`);

    expect(res.status).toBe(200);
    expect(res.body.rows.length).toBeGreaterThan(0);
  });
});