import rateLimit from "express-rate-limit";

/** Bounds abuse of the AI-backed import endpoint: 30 requests per IP per 15 minutes. */
export const importRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: { code: "rate_limited", message: "Too many import requests, try again later" } },
});
