import bcrypt from "bcryptjs";
import { config } from "@/lib/config";

export function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, config.password.bcryptCost);
}

export function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

// A real hash of a random string, at the configured cost. Sign-in compares
// against this when the email is unknown, so "no such account" takes the same
// time as "wrong password" and response time does not reveal which emails exist.
let dummyHash: Promise<string> | undefined;
export function getDummyHash(): Promise<string> {
  dummyHash ??= hashPassword(crypto.randomUUID());
  return dummyHash;
}
