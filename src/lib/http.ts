import { NextResponse } from "next/server";
import type { z } from "zod";
import { toFieldErrors, type FieldErrors } from "@/lib/validation/auth";
import { rateLimit } from "@/lib/auth/rate-limit";
import type { RateLimitRule } from "@/lib/config";

// The one error shape every endpoint returns, so the forms handle it once.
export type ApiError = { error: { code: string; message: string; fields?: FieldErrors; retryAfterSeconds?: number } };

export function errorResponse(
  status: number,
  code: string,
  message: string,
  extra: { fields?: FieldErrors; retryAfterSeconds?: number } = {},
): NextResponse<ApiError> {
  const headers = extra.retryAfterSeconds ? { "Retry-After": String(extra.retryAfterSeconds) } : undefined;
  return NextResponse.json({ error: { code, message, ...extra } }, { status, headers });
}

export function tooManyRequests(retryAfterSeconds: number): NextResponse<ApiError> {
  return errorResponse(429, "RATE_LIMITED", `Too many attempts. Try again in ${retryAfterSeconds} seconds.`, {
    retryAfterSeconds,
  });
}

/** Best-effort client address. Behind a proxy/host this is the first X-Forwarded-For hop. */
export function getClientIp(request: Request): string {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
}

/** Applies a rate limit rule and returns a 429 response if it is exceeded, otherwise null. */
export async function limited(action: string, identifier: string, rule: RateLimitRule) {
  const result = await rateLimit(action, identifier, rule);
  return result.ok ? null : tooManyRequests(result.retryAfterSeconds);
}

/**
 * Rejects browser requests that come from another site. Browsers always send
 * Origin on a cross-site POST; tools like curl send none and are let through,
 * because they carry no victim's cookies.
 */
export function crossSiteRequest(request: Request): NextResponse<ApiError> | null {
  const origin = request.headers.get("origin");
  if (!origin) return null;
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  try {
    if (new URL(origin).host === host) return null;
  } catch {
    // fall through to rejection
  }
  return errorResponse(403, "CROSS_SITE", "This request came from another site and was refused.");
}

/** Parses the JSON body against a schema. Returns either typed data or a ready 4xx response. */
export async function parseBody<S extends z.ZodTypeAny>(
  request: Request,
  schema: S,
): Promise<{ data: z.infer<S>; response?: undefined } | { data?: undefined; response: NextResponse<ApiError> }> {
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return { response: errorResponse(400, "INVALID_JSON", "The request body must be JSON.") };
  }
  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    return {
      response: errorResponse(422, "VALIDATION_FAILED", "Some fields need attention.", {
        fields: toFieldErrors(parsed.error),
      }),
    };
  }
  return { data: parsed.data };
}
