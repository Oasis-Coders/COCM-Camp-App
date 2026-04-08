import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

const protectedPrefixes = [
  "/dashboard",
  "/events",
  "/tasks",
  "/check-in",
  "/profile",
  "/admin"
];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isProtected = protectedPrefixes.some((prefix) => pathname.startsWith(prefix));
  const isAuthenticated = request.cookies.get("camp-demo-auth")?.value === "true";
  const role = request.cookies.get("camp-demo-role")?.value ?? "participant";

  if (isProtected && !isAuthenticated) {
    const signInUrl = new URL("/sign-in", request.url);
    signInUrl.searchParams.set("redirectTo", pathname);
    return NextResponse.redirect(signInUrl);
  }

  if (pathname.startsWith("/admin") && !["super_admin", "admin", "staff"].includes(role)) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/events/:path*", "/tasks/:path*", "/check-in/:path*", "/profile/:path*", "/admin/:path*"]
};
