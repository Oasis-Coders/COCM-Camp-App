import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const redirectTo = url.searchParams.get('redirectTo') ?? '/dashboard';

  // TODO: Exchange the auth code with Supabase once project credentials are configured.
  return NextResponse.redirect(new URL(redirectTo, url.origin));
}
