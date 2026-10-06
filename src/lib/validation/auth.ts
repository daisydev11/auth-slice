import { z } from "zod";
import { config } from "@/lib/config";

// The single source of truth for input rules. The browser forms import these
// for instant feedback; the route handlers import the same objects and are
// the ones that actually decide. Nothing is declared twice.

// A string field whose "missing" and "wrong type" cases share one human message,
// so a hand-built request never gets a raw library error back.
const text = (message: string) => z.string({ required_error: message, invalid_type_error: message });

const email = text("Enter your email address.")
  .trim()
  .toLowerCase()
  .min(1, "Enter your email address.")
  .max(254, "That email address is too long.")
  .email("Enter a valid email address.");

const newPassword = text("Enter a password.")
  .min(1, "Enter a password.")
  .min(config.password.minLength, `Use at least ${config.password.minLength} characters.`)
  .max(config.password.maxLength, `Use at most ${config.password.maxLength} characters.`)
  .regex(/[a-zA-Z]/, "Include at least one letter.")
  .regex(/[0-9]/, "Include at least one number.");

const name = text("Enter your name.")
  .trim()
  .min(1, "Enter your name.")
  .max(80, "Use at most 80 characters.");

export const signupSchema = z.object({ name, email, password: newPassword });

export const signinSchema = z.object({
  email,
  // Only "present" is checked at sign-in. Re-applying the strength rules here
  // would tell an attacker which guesses are not worth sending.
  password: text("Enter your password.").min(1, "Enter your password.").max(1000),
});

export const verifySchema = z.object({
  email,
  code: text("Enter the code from your email.")
    .trim()
    .regex(new RegExp(`^\\d{${config.verification.codeLength}}$`), `Enter the ${config.verification.codeLength}-digit code.`),
});

export const resendSchema = z.object({ email });

export const forgotPasswordSchema = z.object({ email });

export const resetPasswordSchema = z.object({
  token: text("This reset link is not valid.").min(20, "This reset link is not valid.").max(200),
  password: newPassword,
});

export type FieldErrors = Record<string, string>;

/** Flattens a Zod error to one message per field, the shape the forms render. */
export function toFieldErrors(error: z.ZodError): FieldErrors {
  const out: FieldErrors = {};
  for (const issue of error.issues) {
    const field = String(issue.path[0] ?? "form");
    out[field] ??= issue.message;
  }
  return out;
}
