import { afterAll, describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import { rateLimit } from "@/lib/auth/rate-limit";

// Runs against the database in DATABASE_URL.
const id = `test-${Date.now()}`;

describe("rateLimit", () => {
  afterAll(async () => {
    await db.rateLimit.deleteMany({ where: { key: { contains: id } } });
    await db.$disconnect();
  });

  it("allows up to max, then refuses with a retry time", async () => {
    const rule = { max: 3, windowMs: 60_000 };
    for (let i = 0; i < 3; i++) expect((await rateLimit("t1", id, rule)).ok).toBe(true);
    const fourth = await rateLimit("t1", id, rule);
    expect(fourth.ok).toBe(false);
    if (!fourth.ok) expect(fourth.retryAfterSeconds).toBeGreaterThan(0);
  });

  it("is atomic: 20 simultaneous calls let exactly max through", async () => {
    const rule = { max: 5, windowMs: 60_000 };
    const results = await Promise.all(Array.from({ length: 20 }, () => rateLimit("t2", id, rule)));
    expect(results.filter((r) => r.ok).length).toBe(5);
  });

  it("starts a fresh window once the old one has passed", async () => {
    const rule = { max: 1, windowMs: 50 };
    expect((await rateLimit("t3", id, rule)).ok).toBe(true);
    expect((await rateLimit("t3", id, rule)).ok).toBe(false);
    await new Promise((resolve) => setTimeout(resolve, 80));
    expect((await rateLimit("t3", id, rule)).ok).toBe(true);
  });
});
