import fs from "fs";
import path from "path";

export function getPublicBaseUrl() {
  return process.env.PUBLIC_BASE_URL || "https://easydata.is";
}

// Persists each generated single-file app under a stable public URL.
export function writeGeneratedApp(appId: string, html: string) {
  const outputDir = path.join("public", "generated", appId);
  fs.mkdirSync(outputDir, { recursive: true });

  const outputPath = path.join(outputDir, "index.html");
  fs.writeFileSync(outputPath, html, "utf8");

  return `/generated/${appId}/`;
}

export function getGeneratedAppFullUrl(appUrl: string) {
  return `${getPublicBaseUrl()}${appUrl}`;
}
