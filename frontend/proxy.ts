import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Proxy always runs on Node.js runtime in Next.js 16 — no runtime export needed.
const PUBLIC_PATHS = ["/", "/login", "/join"];

export default auth((req: NextRequest & { auth: unknown }) => {
  const { pathname } = req.nextUrl;

  // Allow public paths and the NextAuth API routes through unconditionally
  if (
    PUBLIC_PATHS.includes(pathname) ||
    pathname.startsWith("/api/auth/")
  ) {
    return NextResponse.next();
  }

  // Protect /game/* routes — redirect to /login if unauthenticated
  if (pathname.startsWith("/game")) {
    if (!req.auth) {
      const loginUrl = new URL("/login", req.nextUrl.origin);
      loginUrl.searchParams.set("callbackUrl", pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    /*
     * Match all paths except Next.js internals and static assets.
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
