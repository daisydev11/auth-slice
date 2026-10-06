// Every tunable value for the slice lives here, so nothing is hardcoded in a handler.

const MINUTE = 60 * 1000;

export const config = {
  password: {
    // bcrypt work factor. 12 is ~250ms per hash on a laptop: unnoticeable for
    // one sign-in, expensive for someone testing millions of guesses.
    bcryptCost: 12,
    minLength: 8,
    // bcrypt only reads the first 72 bytes, so longer input is rejected
    // rather than silently truncated.
    maxLength: 72,
  },
  session: {
    cookieName: "session",
    ttlMs: 7 * 24 * 60 * MINUTE,
  },
  verification: {
    codeLength: 6,
    ttlMs: 10 * MINUTE,
    resendCooldownMs: 1 * MINUTE,
    maxAttempts: 5,
  },
  passwordReset: {
    ttlMs: 30 * MINUTE,
  },
  // max requests per window, per key.
  rateLimits: {
    signupByIp: { max: 5, windowMs: 15 * MINUTE },
    signinByIp: { max: 10, windowMs: 15 * MINUTE },
    signinByEmail: { max: 5, windowMs: 15 * MINUTE },
    forgotByIp: { max: 5, windowMs: 15 * MINUTE },
    forgotByEmail: { max: 3, windowMs: 60 * MINUTE },
    resetByIp: { max: 10, windowMs: 15 * MINUTE },
    verifyByIp: { max: 20, windowMs: 15 * MINUTE },
    resendByIp: { max: 5, windowMs: 15 * MINUTE },
  },
} as const;

export type RateLimitRule = { max: number; windowMs: number };
