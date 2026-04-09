import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

import { createServerClient } from '@supabase/ssr';
import { adminPrivilegedRoles, staffPrivilegedRoles } from '@/lib/app-config';

const protectedPrefixes = [
  '/dashboard',
  '/events',
  '/tasks',
  '/check-in',
  '/inventory',
  '/profile',
  '/dev-tools',
  '/admin',
];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isProtected = protectedPrefixes.some((prefix) => pathname.startsWith(prefix));
  const response = NextResponse.next({
    request,
  });

  let isAuthenticated = request.cookies.get('camp-demo-auth')?.value === 'true';
  let role = request.cookies.get('camp-demo-role')?.value ?? 'participant';

  if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    type CookieToSet = {
      name: string;
      value: string;
      options?: Parameters<typeof response.cookies.set>[2];
    };

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },
          setAll(cookiesToSet: CookieToSet[]) {
            cookiesToSet.forEach(({ name, value, options }) => {
              request.cookies.set(name, value);
              response.cookies.set(name, value, options);
            });
          },
        },
      }
    );

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      isAuthenticated = true;
      role =
        (user.app_metadata?.role as string | undefined) ??
        (user.user_metadata?.role as string | undefined) ??
        'participant';
    } else {
      isAuthenticated = false;
      role = 'participant';
    }
  }

  if (isProtected && !isAuthenticated) {
    const signInUrl = new URL('/sign-in', request.url);
    signInUrl.searchParams.set('redirectTo', pathname);
    return NextResponse.redirect(signInUrl);
  }

  const isStaffOrHigher = staffPrivilegedRoles.includes(
    role as (typeof staffPrivilegedRoles)[number]
  );
  const isAdminOrHigher = adminPrivilegedRoles.includes(
    role as (typeof adminPrivilegedRoles)[number]
  );

  if (
    (pathname.startsWith('/admin') ||
      pathname.startsWith('/check-in') ||
      pathname.startsWith('/inventory')) &&
    !isStaffOrHigher
  ) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  if (pathname.startsWith('/dev-tools') && !isAdminOrHigher) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  return response;
}

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/events/:path*',
    '/tasks/:path*',
    '/check-in/:path*',
    '/inventory/:path*',
    '/profile/:path*',
    '/dev-tools/:path*',
    '/admin/:path*',
  ],
};
