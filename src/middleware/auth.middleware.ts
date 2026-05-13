import { Request, Response, NextFunction } from "express";
import { validateAppToken } from "../services/app.service";

// Protects app-specific routes using Authorization: Bearer app_xxx
export function requireAppToken(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const appId = req.params.id;
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).json({
      error: "Missing Authorization header",
    });
  }

  const [scheme, token] = authHeader.split(" ");

  if (scheme !== "Bearer" || !token) {
    return res.status(401).json({
      error: "Invalid Authorization header format",
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