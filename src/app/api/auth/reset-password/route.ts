import { NextResponse } from "next/server";
import { config } from "@/lib/config";
import { db } from "@/lib/db";
import { crossSiteRequest, errorResponse, getClientIp, limited, parseBody } from "@/lib/http";
import { hashPassword } from "@/lib/auth/password";
import { sha256 } from "@/lib/auth/tokens";
import { resetPasswordSchema } from "@/lib/validation/auth";

export async function POST(request: Request) {
  const blocked =
    crossSiteRequest(request) ?? (await limited("reset-ip", getClientIp(request), config.rateLimits.resetByIp));
  if (blocked) return blocked;

  const body = await parseBody(request, resetPasswordSchema);
  if (body.response) return body.response;
  const { token, password } = body.data;

  const tokenHash = sha256(token);
  const passwordHash = await hashPassword(password);
  const now = new Date();

  const done = await db.$transaction(async (tx) => {
    // Single use and time limited, enforced in one UPDATE. Its WHERE only
    // matches an unused, unexpired token, so of two simultaneous requests
    // with the same link exactly one gets count === 1.
    const claimed = await tx.passwordResetToken.updateMany({
      where: { tokenHash, usedAt: null, expiresAt: { gt: now } },
      data: { usedAt: now },
    });
    if (claimed.count !== 1) return false;

    const { userId } = await tx.passwordResetToken.findUniqueOrThrow({ where: { tokenHash }, select: { userId: true } });
    // Following the emailed link also proves ownership of the address.
    const user = await tx.user.findUniqueOrThrow({ where: { id: userId }, select: { emailVerifiedAt: true } });
    await tx.user.update({
      where: { id: userId },
      data: { passwordHash, emailVerifiedAt: user.emailVerifiedAt ?? now },
    });
    // Sign out everywhere: whoever knew the old password loses their sessions.
    await tx.session.deleteMany({ where: { userId } });
    return true;
  });

  if (!done) {
    return errorResponse(400, "INVALID_TOKEN", "This reset link has expired or was already used. Request a new one.");
  }
  return NextResponse.json({ ok: true, next: "signin" });
}
