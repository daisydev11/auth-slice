import { cookies } from "next/headers";
import { config } from "@/lib/config";
import { db } from "@/lib/db";
import { generateToken, sha256 } from "@/lib/auth/tokens";

export type SessionUser = { id: string; name: string; email: string };

/**
 * Creates the session row and sets the cookie.
 * The cookie holds only a random token: no user id, no email, nothing readable.
 * The database stores the token's SHA-256, so the row alone cannot be replayed.
 */
export async function createSession(userId: string): Promise<void> {
  const token = generateToken();
  const expiresAt = new Date(Date.now() + config.session.ttlMs);
  await db.session.create({ data: { tokenHash: sha256(token), userId, expiresAt } });

  (await cookies()).set(config.session.cookieName, token, {
    httpOnly: true, // not readable from JavaScript, so XSS cannot steal it
    secure: process.env.NODE_ENV === "production", // HTTPS only once deployed
    sameSite: "lax", // not sent on cross-site POSTs, which blocks CSRF
    path: "/",
    expires: expiresAt,
  });
}

/** Returns the signed-in user, or null. Expiry is checked by the database query itself. */
export async function getSessionUser(): Promise<SessionUser | null> {
  const token = (await cookies()).get(config.session.cookieName)?.value;
  if (!token) return null;
  const session = await db.session.findFirst({
    where: { tokenHash: sha256(token), expiresAt: { gt: new Date() } },
    select: { user: { select: { id: true, name: true, email: true } } },
  });
  return session?.user ?? null;
}

/** Deletes the session row, then the cookie. After this the token is worthless even if copied. */
export async function destroySession(): Promise<void> {
  const store = await cookies();
  const token = store.get(config.session.cookieName)?.value;
  if (token) await db.session.deleteMany({ where: { tokenHash: sha256(token) } });
  store.delete(config.session.cookieName);
}
