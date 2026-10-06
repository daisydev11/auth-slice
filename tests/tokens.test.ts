import { describe, expect, it } from "vitest";
import { config } from "@/lib/config";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { generateNumericCode, generateToken, safeEqual, sha256 } from "@/lib/auth/tokens";

describe("tokens", () => {
  it("generates 256-bit URL-safe tokens that do not repeat", () => {
    const a = generateToken();
    expect(a).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(generateToken()).not.toBe(a);
  });

  it("generates fixed-length numeric codes, keeping leading zeros", () => {
    for (let i = 0; i < 200; i++) expect(generateNumericCode(6)).toMatch(/^\d{6}$/);
  });

  it("compares hashes safely", () => {
    expect(safeEqual(sha256("123456"), sha256("123456"))).toBe(true);
    expect(safeEqual(sha256("123456"), sha256("123457"))).toBe(false);
  });
});

describe("password hashing", () => {
  it("stores a bcrypt hash at the configured cost, never the password", async () => {
    const hash = await hashPassword("correct-horse-1");
    expect(hash).not.toContain("correct-horse-1");
    expect(hash.startsWith(`$2b$${config.password.bcryptCost}$`)).toBe(true);
    expect(await verifyPassword("correct-horse-1", hash)).toBe(true);
    expect(await verifyPassword("correct-horse-2", hash)).toBe(false);
  });

  it("salts: the same password hashes differently each time", async () => {
    expect(await hashPassword("same-pass-1")).not.toBe(await hashPassword("same-pass-1"));
  });
});
