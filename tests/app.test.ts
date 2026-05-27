import { describe, it, expect } from "vitest";
import request from "supertest";
import express from "express";
import appRoutes, { legacyRowsRouter } from "../src/routes/app.routes.js";

const app = express();

// Test app instance with only the middleware required for API route testing
app.use(express.json());
app.use("/apps", appRoutes);
app.use("/api/rows", legacyRowsRouter);

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

  it("supports legacy /api/rows routes", async () => {
    const getRes = await request(app)
      .get(`/api/rows/${appId}/submissions`)
      .set("Authorization", `Bearer ${apiToken}`);

    expect(getRes.status).toBe(200);
    expect(getRes.body.rows.length).toBeGreaterThan(0);

    const postRes = await request(app)
      .post(`/api/rows/${appId}/submissions`)
      .set("Authorization", `Bearer ${apiToken}`)
      .send({
        student_name: "Legacy",
        photo_url: "/uploads/legacy.jpg",
      });

    expect(postRes.status).toBe(201);
    expect(postRes.body.success).toBe(true);
  });

  it("returns local upload instructions", async () => {
    const res = await request(app)
      .post(`/apps/${appId}/upload-url`)
      .set("Authorization", `Bearer ${apiToken}`);

    expect(res.status).toBe(200);
    expect(res.body.uploadUrl).toBe(`/apps/${appId}/files`);
    expect(res.body.fieldName).toBe("file");
    expect(res.body.limits.maxFileSizeBytes).toBe(5 * 1024 * 1024);
    expect(res.body.limits.allowedMimeTypes).toContain("image/png");
  });

  it("uploads an allowed image and stores its URL in a row", async () => {
    const uploadRes = await request(app)
      .post(`/apps/${appId}/files`)
      .set("Authorization", `Bearer ${apiToken}`)
      .attach("file", Buffer.from("fake png content"), {
        filename: "project.png",
        contentType: "image/png",
      });

    expect(uploadRes.status).toBe(201);
    expect(uploadRes.body.success).toBe(true);
    expect(uploadRes.body.url).toMatch(/^\/uploads\//);
    expect(uploadRes.body.fileUrl).toBe(uploadRes.body.url);
    expect(uploadRes.body.file_url).toBe(uploadRes.body.url);
    expect(uploadRes.body.path).toBe(uploadRes.body.url);
    expect(uploadRes.body.file.url).toBe(uploadRes.body.url);

    const rowRes = await request(app)
      .post(`/apps/${appId}/tables/submissions/rows`)
      .set("Authorization", `Bearer ${apiToken}`)
      .send({
        student_name: "Mira",
        photo_url: uploadRes.body.file.url,
      });

    expect(rowRes.status).toBe(201);
    expect(rowRes.body.rowId).toBeDefined();
  });

  it("rejects unsupported upload file types", async () => {
    const res = await request(app)
      .post(`/apps/${appId}/files`)
      .set("Authorization", `Bearer ${apiToken}`)
      .attach("file", Buffer.from("console.log('no')"), {
        filename: "script.js",
        contentType: "application/javascript",
      });

    expect(res.status).toBe(400);
    expect(res.body.error).toContain("Unsupported file type");
  });

  it("rejects oversized uploads", async () => {
    const res = await request(app)
      .post(`/apps/${appId}/files`)
      .set("Authorization", `Bearer ${apiToken}`)
      .attach("file", Buffer.alloc(5 * 1024 * 1024 + 1), {
        filename: "large.jpg",
        contentType: "image/jpeg",
      });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe("File too large");
    expect(res.body.maxFileSizeBytes).toBe(5 * 1024 * 1024);
  });

});
