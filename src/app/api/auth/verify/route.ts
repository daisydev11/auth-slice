import { NextResponse } from "next/server";
import { config } from "@/lib/config";
import { db } from "@/lib/db";
import { crossSiteRequest, errorResponse, getClientIp, limited, parseBody } from "@/lib/http";
import { createSession } from "@/lib/auth/session";
import { consumeVerificationCode } from "@/lib/auth/verification";
import { verifySchema } from "@/lib/validation/auth";

export async function POST(request: Request) {
  const blocked =
    crossSiteRequest(request) ?? (await limited("verify-ip", getClientIp(request), config.rateLimits.verifyByIp));
  if (blocked) return blocked;

  const body = await parseBody(request, verifySchema);
  if (body.response) return body.response;
  const { email, code } = body.data;

  const user = await db.user.findUnique({ where: { email }, select: { id: true, emailVerifiedAt: true } });
  const verified = user && !user.emailVerifiedAt ? await consumeVerificationCode(user.id, code) : false;

  if (!user || !verified) {
    // One message for wrong, expired, used, and unknown email.
    return errorResponse(400, "INVALID_CODE", "That code is incorrect or has expired. Request a new one.");
  }

  await createSession(user.id);
  return NextResponse.json({ ok: true, next: "dashboard" });
}
