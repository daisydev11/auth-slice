import { NextResponse } from "next/server";
import { config } from "@/lib/config";
import { db } from "@/lib/db";
import { crossSiteRequest, getClientIp, limited, parseBody, tooManyRequests } from "@/lib/http";
import { issueVerificationCode } from "@/lib/auth/verification";
import { resendSchema } from "@/lib/validation/auth";

// This is the endpoint that costs money: every success is a sent email.
// It has two guards: a per-IP limit and a per-account cooldown.
export async function POST(request: Request) {
  const blocked =
    crossSiteRequest(request) ?? (await limited("resend-ip", getClientIp(request), config.rateLimits.resendByIp));
  if (blocked) return blocked;

  const body = await parseBody(request, resendSchema);
  if (body.response) return body.response;

  const user = await db.user.findUnique({
    where: { email: body.data.email },
    select: { id: true, email: true, emailVerifiedAt: true },
  });

  if (user && !user.emailVerifiedAt) {
    const issued = await issueVerificationCode(user);
    if (!issued.ok) return tooManyRequests(issued.retryAfterSeconds);
  }

  // Unknown or already-verified emails get the same reply and no email.
  return NextResponse.json({ ok: true, cooldownSeconds: config.verification.resendCooldownMs / 1000 });
}
