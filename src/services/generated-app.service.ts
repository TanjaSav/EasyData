import fs from "fs";
import path from "path";
import { getClientErrorSnippet } from "./client-error.service.js";
import { getAppMeta } from "./app.service.js";

export function getPublicBaseUrl() {
  return process.env.PUBLIC_BASE_URL || "https://easydata.is";
}

function injectClientErrorSnippet(appId: string, html: string) {
  if (html.includes("/client-errors")) {
    return html;
  }

  const snippet = getClientErrorSnippet(appId);
  if (html.includes("</body>")) {
    return html.replace("</body>", snippet + "\n</body>");
  }

  return html + "\n" + snippet;
}

function normalizeGeneratedHtml(appId: string, html: string) {
  let normalized = html;

  // Generated apps from different models often invent /api variants. Store the
  // published HTML with the canonical browser API so new apps work immediately.
  normalized = normalized
    .replace(/https?:\/\/easydata\.just-build\.it\/apps/g, "/apps")
    .replace(/https?:\/\/[0-9a-f-]{36}\.easydata\.app\/apps/gi, "/apps")
    .replace(/https?:\/\/(?:api\.)?easydata\.(?:is|dev)(?:\/v1)?\/apps/g, "/apps")
    .replace(/https?:\/\/(?:api\.)?easydata\.(?:is|dev)(?:\/v1)?\/api/g, "/apps")
    .replace(/https?:\/\/(?:api\.)?easydata\.(?:is|dev)(?:\/v1)?/g, "")
    .replace(/\/apps\/([0-9a-f-]{36})\/storage\/upload/gi, "/apps/$1/files")
    .replace(/\/storage\/upload/g, "/files")
    .replace(/\/api\/apps\//g, "/apps/")
    .replace(/\/api\/(?=\$\{[^}]+\}\/tables\/)/g, "/apps/")
    .replace(/\/api\/([0-9a-f-]{36})\/tables\//gi, "/apps/$1/tables/")
    .replace(/\/app\/([0-9a-f-]{36})\/([A-Za-z_][A-Za-z0-9_]*)/gi, "/apps/$1/tables/$2/rows")
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

  if (normalized.includes("/uploads/")) {
    throw new Error(
      "Generated app uses public /uploads file URLs. Store fileName and refresh signed view URLs instead."
    );
  }

  if (normalized.includes("EASYDATA_ADMIN_TOKEN")) {
    throw new Error("Generated app must not reference admin credentials.");
  }

  if (/\/api\/(apps|rows|[0-9a-f-]{36}|\$\{)/i.test(normalized)) {
    throw new Error("Generated app contains unsupported legacy /api routes.");
  }

  const withClientErrorSnippet = injectClientErrorSnippet(appId, normalized);
  if (withClientErrorSnippet.includes("window.easydataFetch")) {
    return withClientErrorSnippet;
  }

  const fetchShim = getGeneratedAppFetchShim(appId);
  if (withClientErrorSnippet.includes("</body>")) {
    return withClientErrorSnippet.replace("</body>", fetchShim + "\n</body>");
  }

  return withClientErrorSnippet + "\n" + fetchShim;
}

function getGeneratedAppFetchShim(appId: string) {
  const { apiToken } = getAppMeta(appId);
  const script = [
    "(function(){",
    "const appId=" + JSON.stringify(appId) + ";",
    "const apiToken=" + JSON.stringify(apiToken) + ";",
    "const originalFetch=window.fetch.bind(window);",
    "function isUuid(value){return typeof value==='string'&&value.length===36&&value.split('-').length===5;}",
    "function normalizePath(path){const parts=String(path||'').split('/').filter(Boolean);if(parts[0]==='storage'&&parts[1]==='upload')return '/apps/'+appId+'/files';if(parts[0]==='files')return '/apps/'+appId+'/files';if(parts[0]==='apps'&&isUuid(parts[1])&&parts[2]==='storage'&&parts[3]==='upload')return '/apps/'+parts[1]+'/files';if(parts[0]==='app'&&isUuid(parts[1])&&parts[2])return '/apps/'+parts[1]+'/tables/'+parts[2]+'/rows'+(parts.length>3?'/'+parts.slice(3).join('/'):'');if(parts[0]==='api'&&parts[1]==='apps')return '/apps/'+parts.slice(2).join('/');if(parts[0]==='api'&&isUuid(parts[1])&&parts[2]==='tables')return '/apps/'+parts.slice(1).join('/');if(parts[0]==='api'&&isUuid(parts[1])&&parts[2])return '/apps/'+parts[1]+'/tables/'+parts[2]+'/rows'+(parts.length>3?'/'+parts.slice(3).join('/'):'');if(parts[0]==='apps'&&isUuid(parts[1])&&parts[2]==='api'&&parts[3])return '/apps/'+parts[1]+'/tables/'+parts[3]+'/rows'+(parts.length>4?'/'+parts.slice(4).join('/'):'');return path;}",
    "function normalizeUrl(input){const raw=typeof input==='string'?input:input&&typeof input.url==='string'?input.url:String(input);try{const parsed=new URL(raw,location.href);const host=parsed.hostname.toLowerCase();const generatedHost=host.endsWith('.easydata.app');const knownHost=host==='easydata.just-build.it'||host==='easydata.is'||host==='api.easydata.is'||host==='easydata.dev'||host==='api.easydata.dev'||generatedHost||parsed.origin===location.origin;if(!knownHost)return raw;let path=parsed.pathname;if(path.startsWith('/v1/apps'))path=path.slice(3);if(path.startsWith('/v1/api'))path='/api'+path.slice(7);return normalizePath(path)+parsed.search+parsed.hash;}catch(error){return normalizePath(raw);}}",
    "function shouldAttachAuth(url){try{const parsed=new URL(url,location.href);const path=parsed.pathname;return parsed.origin===location.origin&&(path.startsWith('/apps/')||path.startsWith('/app/')||path.startsWith('/api/')||path==='/files'||path.startsWith('/files/')||path.startsWith('/storage/'));}catch(error){return url.startsWith('/apps/')||url.startsWith('/app/')||url.startsWith('/api/')||url==='/files'||url.startsWith('/files/')||url.startsWith('/storage/');}}",
    "function toHeaders(existing){return new Headers(existing||{});}",
    "function maybeUnwrapBody(url,method,body,headers){if(body===undefined||body instanceof FormData)return body;if(!['POST','PUT','PATCH'].includes(method))return body;if(!(url.includes('/tables/')&&url.includes('/rows')))return body;const contentType=headers.get('Content-Type')||headers.get('content-type')||'';if(contentType&&!contentType.toLowerCase().includes('application/json'))return body;if(typeof body!=='string')return body;try{const parsed=JSON.parse(body);const keys=parsed&&typeof parsed==='object'&&!Array.isArray(parsed)?Object.keys(parsed):[];if(keys.length===1&&['row','fields','data'].includes(keys[0])&&parsed[keys[0]]&&typeof parsed[keys[0]]==='object'&&!Array.isArray(parsed[keys[0]])){headers.set('Content-Type','application/json');return JSON.stringify(parsed[keys[0]]);}}catch(error){}return body;}",
    "window.fetch=function(input,init){try{const url=normalizeUrl(input);const nextInit=init?Object.assign({},init):{};const headers=toHeaders(nextInit.headers||(input&&input.headers));if(shouldAttachAuth(url))headers.set('Authorization','Bearer '+apiToken);const method=String(nextInit.method||(input&&input.method)||'GET').toUpperCase();const inheritedBody=nextInit.body!==undefined?nextInit.body:input&&input.body!==undefined?input.body:undefined;let body=inheritedBody;if(body!==undefined&&(method==='POST'||method==='PUT'||method==='PATCH'||method==='DELETE')&&!(body instanceof FormData)&&!headers.has('Content-Type'))headers.set('Content-Type','application/json');body=maybeUnwrapBody(url,method,body,headers);nextInit.headers=headers;if(body!==undefined)nextInit.body=body;return originalFetch.call(window,url,nextInit);}catch(error){return originalFetch.call(window,input,init);}};",
    "window.easydataFetch=window.fetch;window.easydataAppId=appId;window.easydataApiToken=apiToken;",
    "})();",
  ].join("");

  return "<script>" + script + "</script>";
}
// Persists each generated single-file app under a stable public URL.
export function writeGeneratedApp(appId: string, html: string) {
  const outputDir = path.join("public", "generated", appId);
  fs.mkdirSync(outputDir, { recursive: true });

  const outputPath = path.join(outputDir, "index.html");
  fs.writeFileSync(outputPath, normalizeGeneratedHtml(appId, html), "utf8");

  return "/generated/" + appId + "/";
}

export function getGeneratedAppFullUrl(appUrl: string) {
  return getPublicBaseUrl() + appUrl;
}
