import { describe, expect, it } from "vitest";
import { resetPasswordSchema, signinSchema, signupSchema, toFieldErrors, verifySchema } from "@/lib/validation/auth";

describe("signupSchema", () => {
  const valid = { name: "Ada", email: "ada@example.com", password: "correct-horse-1" };

  it("accepts a valid submission", () => {
    expect(signupSchema.safeParse(valid).success).toBe(true);
  });

  it("lowercases and trims the email so one address is one account", () => {
    const parsed = signupSchema.parse({ ...valid, email: "  Ada@Example.COM " });
    expect(parsed.email).toBe("ada@example.com");
  });

  it("reports one message per bad field", () => {
    const result = signupSchema.safeParse({ name: " ", email: "nope", password: "short" });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(toFieldErrors(result.error)).toEqual({
        name: "Enter your name.",
        email: "Enter a valid email address.",
        password: "Use at least 8 characters.",
      });
    }
  });

  it("rejects passwords longer than bcrypt's 72 bytes instead of truncating", () => {
    expect(signupSchema.safeParse({ ...valid, password: "a1".repeat(40) }).success).toBe(false);
  });

  it("requires a letter and a number", () => {
    expect(signupSchema.safeParse({ ...valid, password: "12345678" }).success).toBe(false);
    expect(signupSchema.safeParse({ ...valid, password: "abcdefgh" }).success).toBe(false);
  });

  it("rejects a missing field and a wrong type", () => {
    expect(signupSchema.safeParse({ email: valid.email, password: valid.password }).success).toBe(false);
    const wrongType = signupSchema.safeParse({ ...valid, password: 12345678 });
    expect(wrongType.success).toBe(false);
    if (!wrongType.success) expect(toFieldErrors(wrongType.error).password).toBe("Enter a password.");
  });
});

describe("other schemas", () => {
  it("sign-in does not apply strength rules", () => {
    expect(signinSchema.safeParse({ email: "a@b.co", password: "x" }).success).toBe(true);
  });

  it("verification code must be exactly six digits", () => {
    expect(verifySchema.safeParse({ email: "a@b.co", code: "123456" }).success).toBe(true);
    expect(verifySchema.safeParse({ email: "a@b.co", code: "12345" }).success).toBe(false);
    expect(verifySchema.safeParse({ email: "a@b.co", code: "12345a" }).success).toBe(false);
  });

  it("reset needs a plausible token and a strong password", () => {
    expect(resetPasswordSchema.safeParse({ token: "short", password: "correct-horse-1" }).success).toBe(false);
    expect(resetPasswordSchema.safeParse({ token: "t".repeat(43), password: "weak" }).success).toBe(false);
  });
});
