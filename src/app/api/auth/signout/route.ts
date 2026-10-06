import { NextResponse } from "next/server";
import { crossSiteRequest } from "@/lib/http";
import { destroySession } from "@/lib/auth/session";

export async function POST(request: Request) {
  const blocked = crossSiteRequest(request);
  if (blocked) return blocked;
  await destroySession();
  return NextResponse.json({ ok: true, next: "signin" });
}
