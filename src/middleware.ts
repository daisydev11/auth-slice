import { NextResponse, type NextRequest } from "next/server";
import { config as appConfig } from "@/lib/config";

// First gate for protected routes. It runs before any page code and turns
// away requests with no session cookie at all. It cannot query the database
// here, so the page itself still validates the session (see dashboard/page.tsx).
export function middleware(request: NextRequest) {
  if (!request.cookies.has(appConfig.session.cookieName)) {
    return NextResponse.redirect(new URL("/signin", request.url));
  }
  return NextResponse.next();
}

export const config = { matcher: ["/dashboard/:path*"] };
