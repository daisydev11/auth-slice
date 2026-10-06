import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { config } from "@/lib/config";
import { db } from "@/lib/db";
import { crossSiteRequest, getClientIp, limited, parseBody } from "@/lib/http";
import { hashPassword } from "@/lib/auth/password";
import { issueVerificationCode } from "@/lib/auth/verification";
import { signupSchema } from "@/lib/validation/auth";

export async function POST(request: Request) {
  const blocked =
    crossSiteRequest(request) ?? (await limited("signup-ip", getClientIp(request), config.rateLimits.signupByIp));
  if (blocked) return blocked;

  const body = await parseBody(request, signupSchema);
  if (body.response) return body.response;
  const { name, email, password } = body.data;

  // Hash before touching the users table, so a new and an existing email
  // take the same time to answer.
  const passwordHash = await hashPassword(password);

  let user: { id: string; email: string; emailVerifiedAt: Date | null };
  try {
    user = await db.user.create({
      data: { name, email, passwordHash },
      select: { id: true, email: true, emailVerifiedAt: true },
    });
  } catch (error) {
    // P2002 = the unique index on email refused the insert. That index, not an
    // earlier "does it exist?" read, is what makes a double submit safe: two
    // identical requests in the same millisecond cannot both insert.
    if (!(error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002")) throw error;
    const existing = await db.user.findUnique({
      where: { email },
      select: { id: true, email: true, emailVerifiedAt: true },
    });
    if (!existing) throw error;
    user = existing;
    // Not yet verified: nobody has proven they own this address, so the
    // latest submission's details win. A verified account is never touched.
    if (!user.emailVerifiedAt) {
      await db.user.updateMany({ where: { id: user.id, emailVerifiedAt: null }, data: { name, passwordHash } });
    }
  }

  // Sends a code unless one went out within the cooldown (the repeat-submit case).
  if (!user.emailVerifiedAt) await issueVerificationCode(user);

  // Same answer whether the account is new, repeated, or already verified,
  // so this endpoint cannot be used to discover which emails are registered.
  return NextResponse.json({ ok: true, next: "verify", email });
}
