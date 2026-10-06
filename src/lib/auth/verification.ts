import { config } from "@/lib/config";
import { db } from "@/lib/db";
import { sendVerificationEmail } from "@/lib/auth/email";
import { rateLimit, type RateLimitResult } from "@/lib/auth/rate-limit";
import { generateNumericCode, safeEqual, sha256 } from "@/lib/auth/tokens";

/**
 * Creates and emails a new code, unless one was issued within the cooldown.
 * The cooldown uses the atomic rate limiter (1 per window, keyed by user), so
 * it holds even when two resend requests arrive in the same instant.
 */
export async function issueVerificationCode(user: { id: string; email: string }): Promise<RateLimitResult> {
  const cooldown = await rateLimit("code-cooldown", user.id, {
    max: 1,
    windowMs: config.verification.resendCooldownMs,
  });
  if (!cooldown.ok) return cooldown;

  const code = generateNumericCode(config.verification.codeLength);
  await db.verificationCode.create({
    data: {
      userId: user.id,
      codeHash: sha256(code),
      expiresAt: new Date(Date.now() + config.verification.ttlMs),
    },
  });
  await sendVerificationEmail(user.email, code);
  return { ok: true };
}

/**
 * Checks a submitted code against the user's most recent one and, if it
 * matches, marks the email verified. Returns false for wrong, expired, used
 * up, or already consumed: the caller shows one message for all of them.
 */
export async function consumeVerificationCode(userId: string, submitted: string): Promise<boolean> {
  const now = new Date();
  // Only the newest code counts. Expiry is part of the query: a code past
  // its expiresAt is simply not found, whatever the interface showed.
  const latest = await db.verificationCode.findFirst({
    where: { userId },
    orderBy: { createdAt: "desc" },
  });
  if (!latest || latest.consumedAt || latest.expiresAt <= now) return false;
  if (latest.attempts >= config.verification.maxAttempts) return false;

  if (!safeEqual(latest.codeHash, sha256(submitted))) {
    await db.verificationCode.update({ where: { id: latest.id }, data: { attempts: { increment: 1 } } });
    return false;
  }

  // Claim the code and verify the user together. The WHERE repeats the
  // conditions, so if two requests race, only one updates a row.
  return db.$transaction(async (tx) => {
    const claimed = await tx.verificationCode.updateMany({
      where: { id: latest.id, consumedAt: null, expiresAt: { gt: now } },
      data: { consumedAt: now },
    });
    if (claimed.count !== 1) return false;
    await tx.user.update({ where: { id: userId }, data: { emailVerifiedAt: now } });
    return true;
  });
}
