import { beforeAll, describe, it, expect } from "vitest";
import fs from "fs";
import request from "supertest";
import express from "express";
import appRoutes, { legacyRowsRouter } from "../src/routes/app.routes.js";
import oauthRoutes from "../src/routes/oauth.routes.js";
import { writeGeneratedApp } from "../src/services/generated-app.service.js";
import { createApp } from "../src/services/app.service.js";
import { validateEasyDataHtml } from "../src/services/published-app-observability.service.js";

const app = express();
const pngBuffer = Buffer.from([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
  0x00, 0x00, 0x00, 0x0d,
]);

beforeAll(() => {
  process.env.EASYDATA_ADMIN_TOKEN = "test-admin-token";
});

// Test app instance with only the middleware required for API route testing
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(oauthRoutes);
app.use("/apps", appRoutes);
app.use("/api/rows", legacyRowsRouter);
app.use("/app", legacyRowsRouter);

describe("EasyData API", () => {
  let appId: string;
  let apiToken: string;

  it("supports OAuth discovery and authorization code flow", async () => {
    const metadataRes = await request(app).get("/.well-known/oauth-authorization-server");
    expect(metadataRes.status).toBe(200);
    expect(metadataRes.body.authorization_endpoint).toContain("/oauth/authorize");
    expect(metadataRes.body.token_endpoint).toContain("/oauth/token");

    const resourceRes = await request(app).get("/.well-known/oauth-protected-resource");
    expect(resourceRes.status).toBe(200);
    expect(resourceRes.body.resource).toContain("/mcp");

    const registerRes = await request(app)
      .post("/oauth/register")
      .send({
        client_name: "ChatGPT Test Client",
        redirect_uris: ["https://chat.openai.com/oauth/callback"],
      });

    expect(registerRes.status).toBe(201);
    expect(registerRes.body.client_id).toBeDefined();

    const authorizeRes = await request(app)
      .get("/oauth/authorize")
      .query({
        response_type: "code",
        client_id: registerRes.body.client_id,
        redirect_uri: "https://chat.openai.com/oauth/callback",
        state: "state_123",
        scope: "mcp",
      });

    expect(authorizeRes.status).toBe(302);
    expect(authorizeRes.headers.location).toBeDefined();
    const redirectUrl = new URL(authorizeRes.headers.location ?? "");
    const code = redirectUrl.searchParams.get("code");
    expect(code).toBeTruthy();
    expect(redirectUrl.searchParams.get("state")).toBe("state_123");

    const tokenRes = await request(app)
      .post("/oauth/token")
      .type("form")
      .send({
        grant_type: "authorization_code",
        code,
        client_id: registerRes.body.client_id,
        redirect_uri: "https://chat.openai.com/oauth/callback",
      });

    expect(tokenRes.status).toBe(200);
    expect(tokenRes.body.access_token).toMatch(/^mcp_/);
    expect(tokenRes.body.token_type).toBe("Bearer");
  });

  it("creates an app", async () => {
    const res = await request(app).post("/apps").send({
      name: "Test App",
    });

    expect(res.status).toBe(201);
    expect(res.body.id).toBeDefined();
    expect(res.body.apiToken).toBeDefined();
    expect(res.body.retentionPolicy.policy).toBe("end_of_school_year");
    expect(res.body.retentionPolicy.retainUntil).toMatch(/^\d{4}-06-30$/);
    expect(res.body.billing.plan).toBe("free");
    expect(res.body.billing.paymentStatus).toBe("not_required");
    expect(res.body.billing.storageQuotaBytes).toBeGreaterThan(0);

    appId = res.body.id;
    apiToken = res.body.apiToken;
  });

  it("requires admin auth for listing apps", async () => {
    const unauthenticated = await request(app).get("/apps");
    expect(unauthenticated.status).toBe(401);

    const authorized = await request(app)
      .get("/apps")
      .set("Authorization", "Bearer test-admin-token");

    expect(authorized.status).toBe(200);
    expect(authorized.body.apps.length).toBeGreaterThan(0);
    expect(authorized.body.apps[0].apiToken).toBeUndefined();
    expect(authorized.body.apps[0].hasApiToken).toBe(true);
  });

  it("requires auth for schema access", async () => {
    const res = await request(app).get(`/apps/${appId}/schema`);

    expect(res.status).toBe(401);
    expect(res.body.error).toBe("Missing or invalid Authorization header");
  });

  it("returns schema with a valid token", async () => {
    const res = await request(app)
      .get(`/apps/${appId}/schema`)
      .set("Authorization", `Bearer ${apiToken}`);

    expect(res.status).toBe(200);
    expect(res.body.schema).toBeDefined();
  });

  it("requires explicit confirmation for sensitive schemas", async () => {
    const res = await request(app)
      .post(`/apps/${appId}/tables`)
      .set("Authorization", `Bearer ${apiToken}`)
      .send({
        tableName: "needs_confirmation",
        columns: [{ name: "student_name", type: "TEXT" }],
      });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe("Sensitive schema requires confirmSensitiveData: true");
  });

  it("creates a table", async () => {
    const res = await request(app)
      .post(`/apps/${appId}/tables`)
      .set("Authorization", `Bearer ${apiToken}`)
      .send({
        tableName: "submissions",
        confirmSensitiveData: true,
        columns: [
          { name: "student_name", type: "TEXT" },
          { name: "photo_file_name", type: "TEXT" },
          { name: "photo_url", type: "TEXT" },
        ],
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.table).toBe("submissions");
    expect(res.body.warnings.length).toBeGreaterThan(0);
    expect(res.body.warnings.map((warning: any) => warning.field)).toContain("student_name");
  });



  it("returns and updates retention policy", async () => {
    const getRes = await request(app)
      .get(`/apps/${appId}/retention`)
      .set("Authorization", `Bearer ${apiToken}`);

    expect(getRes.status).toBe(200);
    expect(getRes.body.retentionPolicy.policy).toBe("end_of_school_year");

    const putRes = await request(app)
      .put(`/apps/${appId}/retention`)
      .set("Authorization", `Bearer ${apiToken}`)
      .send({
        policy: "custom",
        retainUntil: "2026-12-31",
        note: "Keep until the end of the pilot, then review and delete.",
      });

    expect(putRes.status).toBe(200);
    expect(putRes.body.retentionPolicy.policy).toBe("custom");
    expect(putRes.body.retentionPolicy.retainUntil).toBe("2026-12-31");
  });

  it("returns sensitivity warnings when adding sensitive columns", async () => {
    const res = await request(app)
      .put(`/apps/${appId}/tables/submissions`)
      .set("Authorization", `Bearer ${apiToken}`)
      .send({
        confirmSensitiveData: true,
        columns: [{ name: "health_status", type: "TEXT" }],
      });

    expect(res.status).toBe(200);
    expect(res.body.warnings.length).toBe(1);
    expect(res.body.warnings[0].field).toBe("health_status");
    expect(res.body.warnings[0].category).toBe("health");
  });

  it("rejects unsafe table and column identifiers", async () => {
    const unsafeTable = await request(app)
      .post(`/apps/${appId}/tables`)
      .set("Authorization", `Bearer ${apiToken}`)
      .send({
        tableName: "submissions;DROP_TABLE",
        columns: [{ name: "title", type: "TEXT" }],
      });

    expect(unsafeTable.status).toBe(400);
    expect(unsafeTable.body.error).toContain("Table name is invalid");

    const unsafeColumn = await request(app)
      .post(`/apps/${appId}/tables`)
      .set("Authorization", `Bearer ${apiToken}`)
      .send({
        tableName: "safe_table",
        columns: [{ name: "student-name", type: "TEXT" }],
      });

    expect(unsafeColumn.status).toBe(400);
    expect(unsafeColumn.body.error).toContain("Column name is invalid");

    const reservedTable = await request(app)
      .post(`/apps/${appId}/tables`)
      .set("Authorization", `Bearer ${apiToken}`)
      .send({
        tableName: "_easydata_meta",
        columns: [{ name: "title", type: "TEXT" }],
      });

    expect(reservedTable.status).toBe(400);
    expect(reservedTable.body.error).toContain("Table name is invalid");
  });

  it("rejects unsafe row and query identifiers", async () => {
    const unsafeInsert = await request(app)
      .post(`/apps/${appId}/tables/submissions/rows`)
      .set("Authorization", `Bearer ${apiToken}`)
      .send({
        "student-name": "Alex",
      });

    expect(unsafeInsert.status).toBe(400);
    expect(unsafeInsert.body.error).toContain("Column name is invalid");

    const unsafeWhere = await request(app)
      .get(`/apps/${appId}/tables/submissions/rows?where=student-name:Alex`)
      .set("Authorization", `Bearer ${apiToken}`);

    expect(unsafeWhere.status).toBe(400);
    expect(unsafeWhere.body.error).toContain("Where column is invalid");

    const unsafeOrder = await request(app)
      .get(`/apps/${appId}/tables/submissions/rows?order=student-name:asc`)
      .set("Authorization", `Bearer ${apiToken}`);

    expect(unsafeOrder.status).toBe(400);
    expect(unsafeOrder.body.error).toContain("Order column is invalid");
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

  it("supports legacy /app/:appId/:table routes generated by Gemini", async () => {
    const getRes = await request(app)
      .get(`/app/${appId}/submissions`)
      .set("Authorization", `Bearer ${apiToken}`);

    expect(getRes.status).toBe(200);
    expect(getRes.body.rows.length).toBeGreaterThan(0);

    const postRes = await request(app)
      .post(`/app/${appId}/submissions`)
      .set("Authorization", `Bearer ${apiToken}`)
      .send({
        student_name: "Gemini Legacy",
        photo_url: "/uploads/gemini-legacy.jpg",
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
    expect(res.body.limits.appStorageQuotaBytes).toBeGreaterThan(0);
    expect(res.body.limits.currentStorageUsageBytes).toBeGreaterThanOrEqual(0);
    expect(res.body.billing.plan).toBe("free");
    expect(res.body.storage.remainingStorageBytes).toBeGreaterThanOrEqual(0);
    expect(res.body.upgrade.plan).toBe("paid_storage");
  });

  it("creates a storage upgrade checkout", async () => {
    const previousCheckoutUrl = process.env.STORAGE_UPGRADE_CHECKOUT_URL;
    process.env.STORAGE_UPGRADE_CHECKOUT_URL = "https://payments.example/checkout";

    const billingAppRes = await request(app).post("/apps").send({
      name: "Billing Test App",
    });

    const checkoutRes = await request(app)
      .post(`/apps/${billingAppRes.body.id}/billing/checkout`)
      .set("Authorization", `Bearer ${billingAppRes.body.apiToken}`);

    expect(checkoutRes.status).toBe(200);
    expect(checkoutRes.body.paymentRequired).toBe(true);
    expect(checkoutRes.body.checkoutUrl).toContain("https://payments.example/checkout");
    expect(checkoutRes.body.checkoutUrl).toContain(`appId=${billingAppRes.body.id}`);
    expect(checkoutRes.body.billing.paymentStatus).toBe("payment_required");

    if (previousCheckoutUrl === undefined) {
      delete process.env.STORAGE_UPGRADE_CHECKOUT_URL;
    } else {
      process.env.STORAGE_UPGRADE_CHECKOUT_URL = previousCheckoutUrl;
    }
  });

  it("uploads an allowed image and stores its URL in a row", async () => {
    const uploadRes = await request(app)
      .post(`/apps/${appId}/files`)
      .set("Authorization", `Bearer ${apiToken}`)
      .attach("file", pngBuffer, {
        filename: "project.png",
        contentType: "image/png",
      });

    expect(uploadRes.status).toBe(201);
    expect(uploadRes.body.success).toBe(true);
    expect(uploadRes.body.url).toMatch(new RegExp(`^/apps/${appId}/files/.*?/view\\?expires=`));
    expect(uploadRes.body.fileUrl).toBe(uploadRes.body.url);
    expect(uploadRes.body.file_url).toBe(uploadRes.body.url);
    expect(uploadRes.body.path).toBe(uploadRes.body.url);
    expect(uploadRes.body.file.url).toBe(uploadRes.body.url);
    expect(uploadRes.body.viewUrl).toBe(uploadRes.body.url);
    expect(uploadRes.body.fileName).toBe(uploadRes.body.file.fileName);
    expect(uploadRes.body.file.fileName).toMatch(new RegExp(`^${appId}-`));
    expect(uploadRes.body.storage.appStorageQuotaBytes).toBeGreaterThan(0);

    const fileRes = await request(app).get(uploadRes.body.url);
    expect(fileRes.status).toBe(200);

    const unsignedFileRes = await request(app).get(
      `/apps/${appId}/files/${uploadRes.body.file.fileName}/view`
    );
    expect(unsignedFileRes.status).toBe(403);

    const refreshRes = await request(app)
      .post(`/apps/${appId}/files/${uploadRes.body.fileName}/view-url`)
      .set("Authorization", `Bearer ${apiToken}`);
    expect(refreshRes.status).toBe(200);
    expect(refreshRes.body.fileName).toBe(uploadRes.body.fileName);
    expect(refreshRes.body.viewUrl).toMatch(new RegExp(`^/apps/${appId}/files/.*?/view\\?expires=`));

    const refreshedFileRes = await request(app).get(refreshRes.body.viewUrl);
    expect(refreshedFileRes.status).toBe(200);

    const rowRes = await request(app)
      .post(`/apps/${appId}/tables/submissions/rows`)
      .set("Authorization", `Bearer ${apiToken}`)
      .send({
        student_name: "Mira",
        photo_file_name: uploadRes.body.fileName,
        photo_url: uploadRes.body.file.url,
      });

    expect(rowRes.status).toBe(201);
    expect(rowRes.body.rowId).toBeDefined();
  });



  it("exports app data without exposing app tokens", async () => {
    const res = await request(app)
      .get(`/apps/${appId}/export`)
      .set("Authorization", `Bearer ${apiToken}`);

    expect(res.status).toBe(200);
    expect(res.body.app.apiToken).toBeUndefined();
    expect(res.body.data.schema.length).toBeGreaterThan(0);
    expect(res.body.data.tables.submissions.length).toBeGreaterThan(0);
  });

  it("exports app data as CSV", async () => {
    const res = await request(app)
      .get(`/apps/${appId}/export?format=csv`)
      .set("Authorization", `Bearer ${apiToken}`);

    expect(res.status).toBe(200);
    expect(res.headers["content-type"]).toContain("text/csv");
    expect(res.headers["content-disposition"]).toContain("export.csv");
    expect(res.text).toContain("# table: submissions");
    expect(res.text).toContain("student_name");
    expect(res.text).toContain("Alex");
  });

  it("deletes row-owned files when a row is deleted", async () => {
    const cleanupAppRes = await request(app).post("/apps").send({
      name: "Row File Cleanup App",
    });

    const cleanupAppId = cleanupAppRes.body.id;
    const cleanupToken = cleanupAppRes.body.apiToken;

    await request(app)
      .post(`/apps/${cleanupAppId}/tables`)
      .set("Authorization", `Bearer ${cleanupToken}`)
      .send({
        tableName: "submissions",
        confirmSensitiveData: true,
        columns: [{ name: "photo_file_name", type: "TEXT" }],
      });

    const uploadRes = await request(app)
      .post(`/apps/${cleanupAppId}/files`)
      .set("Authorization", `Bearer ${cleanupToken}`)
      .attach("file", pngBuffer, {
        filename: "cleanup.png",
        contentType: "image/png",
      });

    const rowRes = await request(app)
      .post(`/apps/${cleanupAppId}/tables/submissions/rows`)
      .set("Authorization", `Bearer ${cleanupToken}`)
      .send({ photo_file_name: uploadRes.body.fileName });

    const deleteRes = await request(app)
      .delete(`/apps/${cleanupAppId}/tables/submissions/rows/${rowRes.body.rowId}`)
      .set("Authorization", `Bearer ${cleanupToken}`);

    expect(deleteRes.status).toBe(200);
    expect(deleteRes.body.deletedFiles).toBe(1);

    const staleFileRes = await request(app).get(uploadRes.body.viewUrl);
    expect(staleFileRes.status).toBe(403);
  });

  it("rejects files whose content does not match their declared type", async () => {
    const res = await request(app)
      .post(`/apps/${appId}/files`)
      .set("Authorization", `Bearer ${apiToken}`)
      .attach("file", Buffer.from("not actually png"), {
        filename: "fake.png",
        contentType: "image/png",
      });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe("File content does not match the declared file type.");
  });

  it("returns payment details after the app storage quota is exceeded", async () => {
    const previousQuota = process.env.APP_STORAGE_QUOTA_BYTES;
    const previousPaidQuota = process.env.PAID_APP_STORAGE_QUOTA_BYTES;
    const previousCheckoutUrl = process.env.STORAGE_UPGRADE_CHECKOUT_URL;
    process.env.APP_STORAGE_QUOTA_BYTES = "1";
    process.env.PAID_APP_STORAGE_QUOTA_BYTES = "100";
    process.env.STORAGE_UPGRADE_CHECKOUT_URL = "https://payments.example/checkout";

    const quotaAppRes = await request(app).post("/apps").send({
      name: "Quota Test App",
    });

    const res = await request(app)
      .post(`/apps/${quotaAppRes.body.id}/files`)
      .set("Authorization", `Bearer ${quotaAppRes.body.apiToken}`)
      .attach("file", pngBuffer, {
        filename: "quota.png",
        contentType: "image/png",
      });

    expect(res.status).toBe(413);
    expect(res.body.error).toBe("App storage quota exceeded");
    expect(res.body.appStorageQuotaBytes).toBe(1);
    expect(res.body.paymentRequired).toBe(true);
    expect(res.body.upgrade.checkoutUrl).toContain("https://payments.example/checkout");

    const checkoutRes = await request(app)
      .post(`/apps/${quotaAppRes.body.id}/billing/checkout`)
      .set("Authorization", `Bearer ${quotaAppRes.body.apiToken}`);

    expect(checkoutRes.status).toBe(200);
    expect(checkoutRes.body.paymentRequired).toBe(true);
    expect(checkoutRes.body.billing.paymentStatus).toBe("payment_required");

    const activateRes = await request(app)
      .post(`/apps/${quotaAppRes.body.id}/billing/activate`)
      .set("Authorization", "Bearer test-admin-token")
      .send({ paymentProvider: "test", externalPaymentId: "pay_123" });

    expect(activateRes.status).toBe(200);
    expect(activateRes.body.billing.paymentStatus).toBe("active");
    expect(activateRes.body.storage.appStorageQuotaBytes).toBe(100);

    const paidUploadRes = await request(app)
      .post(`/apps/${quotaAppRes.body.id}/files`)
      .set("Authorization", `Bearer ${quotaAppRes.body.apiToken}`)
      .attach("file", pngBuffer, {
        filename: "paid-quota.png",
        contentType: "image/png",
      });

    expect(paidUploadRes.status).toBe(201);
    expect(paidUploadRes.body.storage.appStorageQuotaBytes).toBe(100);

    if (previousQuota === undefined) {
      delete process.env.APP_STORAGE_QUOTA_BYTES;
    } else {
      process.env.APP_STORAGE_QUOTA_BYTES = previousQuota;
    }

    if (previousPaidQuota === undefined) {
      delete process.env.PAID_APP_STORAGE_QUOTA_BYTES;
    } else {
      process.env.PAID_APP_STORAGE_QUOTA_BYTES = previousPaidQuota;
    }

    if (previousCheckoutUrl === undefined) {
      delete process.env.STORAGE_UPGRADE_CHECKOUT_URL;
    } else {
      process.env.STORAGE_UPGRADE_CHECKOUT_URL = previousCheckoutUrl;
    }
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


  it("deletes an app and its uploaded files", async () => {
    const deleteAppRes = await request(app).post("/apps").send({
      name: "Delete Test App",
    });

    const deleteAppId = deleteAppRes.body.id;
    const deleteAppToken = deleteAppRes.body.apiToken;

    const uploadRes = await request(app)
      .post(`/apps/${deleteAppId}/files`)
      .set("Authorization", `Bearer ${deleteAppToken}`)
      .attach("file", pngBuffer, {
        filename: "delete.png",
        contentType: "image/png",
      });

    expect(uploadRes.status).toBe(201);

    const res = await request(app)
      .delete(`/apps/${deleteAppId}`)
      .set("Authorization", `Bearer ${deleteAppToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.deletedFiles).toBeGreaterThanOrEqual(1);

    const schemaRes = await request(app)
      .get(`/apps/${deleteAppId}/schema`)
      .set("Authorization", `Bearer ${deleteAppToken}`);

    expect(schemaRes.status).toBe(404);
  });


  it("lists and cleans up expired apps through admin retention endpoints", async () => {
    const expiredAppRes = await request(app).post("/apps").send({
      name: "Expired App",
    });

    await request(app)
      .put(`/apps/${expiredAppRes.body.id}/retention`)
      .set("Authorization", `Bearer ${expiredAppRes.body.apiToken}`)
      .send({
        policy: "custom",
        retainUntil: "2000-01-01",
        note: "Expired test data.",
      });

    const expiredRes = await request(app)
      .get("/apps/retention/expired")
      .set("Authorization", "Bearer test-admin-token");

    expect(expiredRes.status).toBe(200);
    expect(expiredRes.body.apps.map((item: any) => item.id)).toContain(expiredAppRes.body.id);

    const cleanupRes = await request(app)
      .post("/apps/retention/cleanup")
      .set("Authorization", "Bearer test-admin-token");

    expect(cleanupRes.status).toBe(200);
    expect(cleanupRes.body.deletedApps.map((item: any) => item.appId)).toContain(expiredAppRes.body.id);
  });

  it("rejects generated apps that use public upload URLs or admin credentials", () => {
    expect(() =>
      writeGeneratedApp("11111111-1111-4111-8111-111111111111", "<img src='/uploads/photo.png'>")
    ).toThrow("Generated app uses public /uploads file URLs");

    expect(() =>
      writeGeneratedApp("22222222-2222-4222-8222-222222222222", "EASYDATA_ADMIN_TOKEN")
    ).toThrow("Generated app must not reference admin credentials");
  });

  it("normalizes generated HTML API routes before publishing", () => {
    const generatedAppId = createApp("Generated HTML test").id;
    const html = [
      "<script>",
      "const APP_ID = \"" + generatedAppId + "\";",
      "const TABLE_NAME = \"workouts\";",
      "const BASE = \"https://easydata.is/api\";",
      "fetch(`/api/apps/${APP_ID}/tables/${TABLE_NAME}/rows`);",
      "fetch(`/api/${APP_ID}/${TABLE_NAME}`);",
      "fetch(`/apps/${APP_ID}/api/${TABLE_NAME}`);",
      "fetch(BASE + \"/\" + APP_ID + \"/tables/\" + TABLE_NAME + \"/rows\", { method: \"PATCH\" });",
      "</script>",
    ].join("\n");

    const appUrl = writeGeneratedApp(generatedAppId, html);
    const outputPath = `public${appUrl}index.html`;
    const saved = fs.readFileSync(outputPath, "utf8");

    expect(saved).not.toContain("https://easydata.is/api");
    expect(saved).not.toContain("/api/${");
    expect(saved).not.toContain("/api/rows");
    expect(saved).not.toContain("/api/${TABLE_NAME}");
    expect(saved).toContain("/apps/${");
    expect(saved).toContain("method: 'PUT'");

    fs.rmSync(`public/generated/${generatedAppId}`, { recursive: true, force: true });
    fs.rmSync(`data/apps/${generatedAppId}.sqlite`, { force: true });
  });

  it("flags generated apps that embed base64 images instead of file uploads", () => {
    const appId = createApp("Base64 upload test").id;
    const html = [
      "<!doctype html>",
      "<script>",
      "const img = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAAB';",
      "const blob = new FileReader();",
      "blob.readAsDataURL(new Blob());",
      "</script>",
    ].join("\n");

    const result = validateEasyDataHtml(appId, html);

    expect(result.valid).toBe(false);
    expect(result.errors.join(' ')).toContain('base64/data URLs');

    fs.rmSync("data/apps/" + appId + ".sqlite", { force: true });
  });

  it("flags generated apps that wrap row payloads", () => {
    const appId = createApp("Wrapped row payload test").id;
    const html = [
      "<!doctype html>",
      "<script>",
      "const data = { student_name: 'Ava' };",
      "fetch('/apps/00000000-0000-4000-8000-000000000000/tables/submissions/rows', { method: 'POST', body: JSON.stringify({ row: data }) });",
      "</script>",
    ].join("\n");

    const result = validateEasyDataHtml(appId, html);

    expect(result.valid).toBe(false);
    expect(result.errors.join(' ')).toContain('{ row: ... }');

    fs.rmSync("data/apps/" + appId + ".sqlite", { force: true });
  });

  it("injects a runtime fetch shim that adds auth and normalizes CRUD requests", () => {
    const generatedAppId = createApp("Generated CRUD shim test").id;
    const html = [
      "<!doctype html>",
      "<html><body>",
      "<script>",
      "fetch('/storage/upload', { method: 'POST', body: new FormData() });",
      "fetch('/apps/33333333-3333-4333-8333-333333333333/tables/submissions/rows', { method: 'POST', body: JSON.stringify({ student_name: 'Ava' }) });",
      "</script>",
      "</body></html>",
    ].join("\n");

    const appUrl = writeGeneratedApp(generatedAppId, html);
    const outputPath = "public" + appUrl + "index.html";
    const saved = fs.readFileSync(outputPath, "utf8");

    expect(saved).toContain("window.easydataFetch");
    expect(saved).toContain("Authorization");
    expect(saved).toContain("/files");
    expect(saved).toContain("fetch('/files'");

    const scripts = Array.from(saved.matchAll(/<script>([\s\S]*?)<\/script>/g)).map((match) => match[1] ?? "");
    const shim = scripts.find((script) => script.includes("window.easydataFetch"));
    expect(shim).toBeTruthy();
    expect(() => new Function(shim ?? "")).not.toThrow();

    fs.rmSync("public/generated/" + generatedAppId, { recursive: true, force: true });
    fs.rmSync("data/apps/" + generatedAppId + ".sqlite", { force: true });
  });
});
