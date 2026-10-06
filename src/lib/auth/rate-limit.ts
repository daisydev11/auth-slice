import { Prisma } from "@prisma/client";
import { db, dbSchema } from "@/lib/db";
import type { RateLimitRule } from "@/lib/config";

export type RateLimitResult = { ok: true } | { ok: false; retryAfterSeconds: number };

const table = Prisma.raw(`"${dbSchema}"."RateLimit"`);

/**
 * Fixed-window counter stored in Postgres. One atomic statement both counts
 * the request and reports the total, so two requests arriving together cannot
 * both read "4 of 5" and both pass.
 */
export async function rateLimit(
  action: string,
  identifier: string,
  rule: RateLimitRule,
): Promise<RateLimitResult> {
  const key = `${action}:${identifier}`;
  const now = new Date();
  const windowFloor = new Date(now.getTime() - rule.windowMs);

  const rows = await db.$queryRaw<{ count: number; windowStart: Date }[]>`
    INSERT INTO ${table} AS r ("key", "count", "windowStart")
    VALUES (${key}, 1, ${now})
    ON CONFLICT ("key") DO UPDATE SET
      "count" = CASE WHEN r."windowStart" <= ${windowFloor} THEN 1 ELSE r."count" + 1 END,
      "windowStart" = CASE WHEN r."windowStart" <= ${windowFloor} THEN ${now} ELSE r."windowStart" END
    RETURNING "count", "windowStart"`;

  const { count, windowStart } = rows[0];
  if (count <= rule.max) return { ok: true };

  const resetsAt = windowStart.getTime() + rule.windowMs;
  return { ok: false, retryAfterSeconds: Math.max(1, Math.ceil((resetsAt - now.getTime()) / 1000)) };
}
