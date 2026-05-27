import fs from "fs";
import path from "path";

export function getPublicBaseUrl() {
  return process.env.PUBLIC_BASE_URL || "https://easydata.is";
}

function normalizeGeneratedHtml(html: string) {
  let normalized = html;

  // Generated apps from different models often invent /api variants. Store the
  // published HTML with the canonical browser API so new apps work immediately.
  normalized = normalized
    .replace(/https?:\/\/easydata\.is\/api\/apps/g, "/apps")
    .replace(/https?:\/\/easydata\.is\/api/g, "/apps")
    .replace(/\/api\/apps\//g, "/apps/")
    .replace(/\/api\/(?=\$\{[^}]+\}\/tables\/)/g, "/apps/")
    .replace(/\/api\/([0-9a-f-]{36})\/tables\//gi, "/apps/$1/tables/")
    .replace(/method:\s*(["'])PATCH\1/g, "method: 'PUT'");

  normalized = normalized.replace(
    /\/api\/rows\/\$\{([^}]+)\}\/\$\{([^}]+)\}/g,
    (_match, appExpression, tableExpression) =>
      "/apps/${" + appExpression + "}/tables/${" + tableExpression + "}/rows"
  );

  normalized = normalized.replace(
    /\/api\/\$\{([^}]+)\}\/\$\{([^}]+)\}/g,
    (_match, appExpression, tableExpression) =>
      "/apps/${" + appExpression + "}/tables/${" + tableExpression + "}/rows"
  );

  normalized = normalized.replace(
    /\/apps\/\$\{([^}]+)\}\/api\/\$\{([^}]+)\}/g,
    (_match, appExpression, tableExpression) =>
      "/apps/${" + appExpression + "}/tables/${" + tableExpression + "}/rows"
  );

  return normalized;
}

// Persists each generated single-file app under a stable public URL.
export function writeGeneratedApp(appId: string, html: string) {
  const outputDir = path.join("public", "generated", appId);
  fs.mkdirSync(outputDir, { recursive: true });

  const outputPath = path.join(outputDir, "index.html");
  fs.writeFileSync(outputPath, normalizeGeneratedHtml(html), "utf8");

  return "/generated/" + appId + "/";
}

export function getGeneratedAppFullUrl(appUrl: string) {
  return getPublicBaseUrl() + appUrl;
}
