import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { SESSION_COOKIE } from "@/lib/server/auth-keys";

const PUBLIC_PAGES = new Set(["/login", "/register"]);

const PUBLIC_API_PREFIXES = [
  "/api/auth/",
  "/api/health/",
] as const;

const LEGACY_API_PREFIXES = [
  "/api/sync",
  "/api/email/",
  "/api/cron/",
] as const;

function isPublicApi(pathname: string): boolean {
  return PUBLIC_API_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

function isLegacyApi(pathname: string): boolean {
  return LEGACY_API_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (PUBLIC_PAGES.has(pathname)) {
    const session = request.cookies.get(SESSION_COOKIE)?.value;
    if (session) {
      return NextResponse.redirect(new URL("/", request.url));
    }
    return NextResponse.next();
  }

  if (pathname.startsWith("/api/")) {
    if (isPublicApi(pathname) || isLegacyApi(pathname)) {
      return NextResponse.next();
    }
    if (!request.cookies.get(SESSION_COOKIE)?.value) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }
    return NextResponse.next();
  }

  if (!request.cookies.get(SESSION_COOKIE)?.value) {
    const login = new URL("/login", request.url);
    if (pathname !== "/") {
      login.searchParams.set("from", pathname);
    }
    return NextResponse.redirect(login);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
