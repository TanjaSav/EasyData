import type { Request, Response, NextFunction } from "express";
import { validateAppToken } from "../services/app.service.js";

function readBearerToken(authHeader: string | undefined) {
  if (!authHeader) {
    return null;
  }

  const [scheme, token] = authHeader.split(" ");

  if (scheme !== "Bearer" || !token) {
    return null;
  }

  return token;
}

// Protects app-specific routes using Authorization: Bearer app_xxx
export function requireAppToken(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const appId = req.params.id as string;
  const token = readBearerToken(req.headers.authorization);

  if (!token) {
    return res.status(401).json({
      error: "Missing or invalid Authorization header",
    });
  }

  try {
    const valid = validateAppToken(appId, token);

    if (!valid) {
      return res.status(403).json({
        error: "Invalid API token",
      });
    }

    next();
  } catch (error: any) {
    return res.status(404).json({
      error: error.message,
    });
  }
}

// Protects owner/admin-only routes such as listing every app.
export function requireAdminToken(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const adminToken = process.env.EASYDATA_ADMIN_TOKEN;
  const token = readBearerToken(req.headers.authorization);

  if (!adminToken) {
    return res.status(503).json({
      error: "Admin token is not configured",
    });
  }

  if (!token) {
    return res.status(401).json({
      error: "Missing or invalid Authorization header",
    });
  }

  if (token !== adminToken) {
    return res.status(403).json({
      error: "Invalid admin token",
    });
  }

  next();
}
