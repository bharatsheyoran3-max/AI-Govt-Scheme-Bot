import type { ZodSchema } from "zod";

// Simplified API Gateway simulation running as server middleware inside TanStack Start / Nitro
// Provides Rate Limiting, Input Sanitization, and Strict Request Schema Validation

const rateLimitStore: Record<string, { tokens: number; lastRefill: number }> = {};
const RATE_LIMIT_CAPACITY = 60; // Max 60 requests per minute
const RATE_LIMIT_REFILL_RATE = 1; // 1 token per second

export function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  if (!rateLimitStore[ip]) {
    rateLimitStore[ip] = { tokens: RATE_LIMIT_CAPACITY, lastRefill: now };
  }

  const client = rateLimitStore[ip];
  const delta = Math.max(0, now - client.lastRefill) / 1000;
  client.tokens = Math.min(RATE_LIMIT_CAPACITY, client.tokens + delta * RATE_LIMIT_REFILL_RATE);
  client.lastRefill = now;

  if (client.tokens >= 1) {
    client.tokens -= 1;
    return true;
  }
  return false;
}

export function sanitizeHtml(str: string): string {
  if (typeof str !== "string") return str;
  // Deeply escape brackets/quotes/scripts to prevent XSS
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;")
    .replace(/\//g, "&#x2F;");
}

export function sanitizeObject<T>(obj: T): T {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj === "string") {
    return sanitizeHtml(obj) as unknown as T;
  }
  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeObject(item)) as unknown as T;
  }
  if (typeof obj === "object") {
    const res: any = {};
    for (const key of Object.keys(obj)) {
      res[key] = sanitizeObject((obj as any)[key]);
    }
    return res as T;
  }
  return obj;
}

export async function validateRequest<T>(
  request: Request,
  schema: ZodSchema<T>
): Promise<{ success: true; data: T } | { success: false; response: Response }> {
  // Validate Rate Limiter
  const clientIp = request.headers.get("x-forwarded-for") || "127.0.0.1";
  if (!checkRateLimit(clientIp)) {
    return {
      success: false,
      response: new Response(
        JSON.stringify({ error: "Too many requests. Please slow down." }),
        { status: 429, headers: { "Content-Type": "application/json" } }
      ),
    };
  }

  // Validate CSRF
  const origin = request.headers.get("origin");
  const host = request.headers.get("host");
  if (
    request.method !== "GET" &&
    origin &&
    host &&
    !origin.includes(host) &&
    process.env.NODE_ENV === "production"
  ) {
    return {
      success: false,
      response: new Response(
        JSON.stringify({ error: "CSRF verification failed." }),
        { status: 403, headers: { "Content-Type": "application/json" } }
      ),
    };
  }

  // Parse Body
  let body: any;
  try {
    const text = await request.clone().text();
    if (text) {
      body = JSON.parse(text);
    } else {
      body = {};
    }
  } catch (err) {
    return {
      success: false,
      response: new Response(
        JSON.stringify({ error: "Invalid JSON request payload." }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      ),
    };
  }

  // Validate against Zod Schema
  const result = schema.safeParse(body);
  if (!result.success) {
    return {
      success: false,
      response: new Response(
        JSON.stringify({
          error: "Schema validation failed",
          details: result.error.format(),
        }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      ),
    };
  }

  // Sanitize validated data
  const sanitizedData = sanitizeObject(result.data);

  return {
    success: true,
    data: sanitizedData,
  };
}
