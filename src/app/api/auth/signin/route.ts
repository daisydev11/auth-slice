import { NextResponse } from "next/server";
import { config } from "@/lib/config";
import { db } from "@/lib/db";
import { crossSiteRequest, errorResponse, getClientIp, limited, parseBody } from "@/lib/http";
import { getDummyHash, verifyPassword } from "@/lib/auth/password";
import { createSession } from "@/lib/auth/session";
import { issueVerificationCode } from "@/lib/auth/verification";
import { signinSchema } from "@/lib/validation/auth";

export async function POST(request: Request) {
  const blocked =
    crossSiteRequest(request) ?? (await limited("signin-ip", getClientIp(request), config.rateLimits.signinByIp));
  if (blocked) return blocked;

  const body = await parseBody(request, signinSchema);
  if (body.response) return body.response;
  const { email, password } = body.data;

  // Second limit keyed by the target account, so a botnet spreading guesses
  // across many IPs still gets only a handful of tries per email.
  const blockedByEmail = await limited("signin-email", email, config.rateLimits.signinByEmail);
  if (blockedByEmail) return blockedByEmail;

  const user = await db.user.findUnique({
    where: { email },
    select: { id: true, email: true, passwordHash: true, emailVerifiedAt: true },
  });

  // Always run one bcrypt comparison, even for an unknown email.
  const passwordMatches = await verifyPassword(password, user?.passwordHash ?? (await getDummyHash()));
  if (!user || !passwordMatches) {
    return errorResponse(401, "INVALID_CREDENTIALS", "That email and password do not match.");
  }

  // Correct password but unverified email: authenticated, not yet allowed in.
  if (!user.emailVerifiedAt) {
    await issueVerificationCode(user);
    return errorResponse(403, "EMAIL_NOT_VERIFIED", "Verify your email to finish signing in.");
  }

  await createSession(user.id);
  return NextResponse.json({ ok: true, next: "dashboard" });
}
