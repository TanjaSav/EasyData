import fs from "fs";
import path from "path";

const auditLogPath = process.env.AUDIT_LOG_PATH || "./data/audit.log";

export type AuditEvent = {
  action: string;
  appId?: string;
  tableName?: string;
  rowId?: string;
  details?: Record<string, unknown>;
};

export function writeAuditEvent(event: AuditEvent) {
  const dir = path.dirname(auditLogPath);

  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  const entry = {
    timestamp: new Date().toISOString(),
    ...event,
  };

  fs.appendFileSync(auditLogPath, JSON.stringify(entry) + "\n", "utf8");
}

export function getAuditLogPath() {
  return auditLogPath;
}
