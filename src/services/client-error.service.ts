import fs from "fs";
import path from "path";

const ERROR_DIR = path.join(process.env.DATA_DIR || "./data/apps", "..", "client-errors");

export type ClientErrorInput = {
  message?: string;
  source?: string;
  lineno?: number;
  colno?: number;
  stack?: string;
  type?: string;
  url?: string;
  userAgent?: string;
};

function ensureDir() {
  fs.mkdirSync(ERROR_DIR, { recursive: true });
}

function errorPath(appId: string) {
  return path.join(ERROR_DIR, `${appId}.jsonl`);
}

export function recordClientError(appId: string, input: ClientErrorInput) {
  ensureDir();
  const event = {
    appId,
    receivedAt: new Date().toISOString(),
    type: input.type ?? "error",
    message: String(input.message ?? "Unknown client error").slice(0, 1000),
    source: input.source ? String(input.source).slice(0, 1000) : null,
    lineno: Number.isFinite(input.lineno) ? input.lineno : null,
    colno: Number.isFinite(input.colno) ? input.colno : null,
    stack: input.stack ? String(input.stack).slice(0, 4000) : null,
    url: input.url ? String(input.url).slice(0, 1000) : null,
    userAgent: input.userAgent ? String(input.userAgent).slice(0, 500) : null,
  };
  fs.appendFileSync(errorPath(appId), JSON.stringify(event) + "\n", "utf8");
  return event;
}

export function getClientErrors(appId: string, since?: string, limit = 50) {
  const filePath = errorPath(appId);
  if (!fs.existsSync(filePath)) {
    return { appId, count: 0, errors: [] };
  }

  const sinceTime = since ? Date.parse(since) : NaN;
  const max = Number.isInteger(limit) && limit > 0 ? Math.min(limit, 200) : 50;
  const errors = fs
    .readFileSync(filePath, "utf8")
    .split("\n")
    .filter(Boolean)
    .map((line) => JSON.parse(line))
    .filter((event) => !Number.isFinite(sinceTime) || Date.parse(event.receivedAt) >= sinceTime)
    .slice(-max)
    .reverse();

  return { appId, count: errors.length, errors };
}

export function getClientErrorSnippet(appId: string) {
  return `<script>(function(){const appId=${JSON.stringify(appId)};function send(type,payload){try{fetch('/apps/'+appId+'/client-errors',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(Object.assign({type,url:location.href,userAgent:navigator.userAgent},payload))});}catch(e){}}window.addEventListener('error',function(event){send('error',{message:event.message,source:event.filename,lineno:event.lineno,colno:event.colno,stack:event.error&&event.error.stack});});window.addEventListener('unhandledrejection',function(event){const reason=event.reason;send('unhandledrejection',{message:reason&&reason.message?reason.message:String(reason),stack:reason&&reason.stack});});})();</script>`;
}
