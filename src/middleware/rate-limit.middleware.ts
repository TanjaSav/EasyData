import type { Request, Response, NextFunction } from "express";

type Bucket = {
  resetAt: number;
  count: number;
};

const buckets = new Map<string, Bucket>();

export function rateLimit(options: {
  windowMs: number;
  max: number;
  keyPrefix: string;
}) {
  return (req: Request, res: Response, next: NextFunction) => {
    const token = req.headers.authorization ?? req.ip ?? "unknown";
    const key = `${options.keyPrefix}:${token}`;
    const now = Date.now();
    const bucket = buckets.get(key);

    if (!bucket || bucket.resetAt <= now) {
      buckets.set(key, {
        resetAt: now + options.windowMs,
        count: 1,
      });
      next();
      return;
    }

    bucket.count += 1;

    if (bucket.count > options.max) {
      return res.status(429).json({
        error: "Rate limit exceeded",
        retryAfterSeconds: Math.ceil((bucket.resetAt - now) / 1000),
      });
    }

    next();
  };
}
