import { createHash, randomBytes, randomInt, timingSafeEqual } from "node:crypto";

/** 256 bits from the OS random source, URL safe. Used for sessions and reset links. */
export function generateToken(): string {
  return randomBytes(32).toString("base64url");
}

/** A numeric code of the given length, e.g. "048213". Leading zeros are kept. */
export function generateNumericCode(length: number): string {
  return randomInt(0, 10 ** length).toString().padStart(length, "0");
}

// Secrets are stored hashed, so a leaked database does not hand out live
// sessions or reset links. SHA-256 is right here (unlike for passwords)
// because the input is already 256 random bits and cannot be guessed.
export function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

export function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  return bufA.length === bufB.length && timingSafeEqual(bufA, bufB);
}
