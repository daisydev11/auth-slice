import { NextResponse } from "next/server";
import { config } from "@/lib/config";
import { db } from "@/lib/db";
import { crossSiteRequest, getClientIp, limited, parseBody } from "@/lib/http";
import { sendPasswordResetEmail } from "@/lib/auth/email";
import { generateToken, sha256 } from "@/lib/auth/tokens";
import { forgotPasswordSchema } from "@/lib/validation/auth";

export async function POST(request: Request) {
  const blocked =
    crossSiteRequest(request) ?? (await limited("forgot-ip", getClientIp(request), config.rateLimits.forgotByIp));
  if (blocked) return blocked;

  const body = await parseBody(request, forgotPasswordSchema);
  if (body.response) return body.response;
  const { email } = body.data;

  // Per-email limit: stops someone flooding one person's inbox from many IPs.
  const blockedByEmail = await limited("forgot-email", email, config.rateLimits.forgotByEmail);
  if (blockedByEmail) return blockedByEmail;

  const user = await db.user.findUnique({ where: { email }, select: { id: true, email: true } });
  if (user) {
    const token = generateToken();
    const now = new Date();
    await db.$transaction([
      // A new request retires any earlier unused link.
      db.passwordResetToken.updateMany({ where: { userId: user.id, usedAt: null }, data: { usedAt: now } }),
      db.passwordResetToken.create({
        data: { userId: user.id, tokenHash: sha256(token), expiresAt: new Date(now.getTime() + config.passwordReset.ttlMs) },
      }),
    ]);
    await sendPasswordResetEmail(user.email, token);
  }

  // Identical reply whether or not the account exists.
  return NextResponse.json({ ok: true });
}
