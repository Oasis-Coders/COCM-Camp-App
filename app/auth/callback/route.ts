import { NextResponse } from 'next/server';

import { sanitizeRedirectTo } from '@/lib/auth/auth-utils';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { hasSupabaseEnv } from '@/lib/supabase/env';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const redirectTo = sanitizeRedirectTo(url.searchParams.get('redirectTo') ?? '/dashboard');
  const code = url.searchParams.get('code');

  if (hasSupabaseEnv() && code) {
    const supabase = await createSupabaseServerClient();

    if (supabase) {
      const { error } = await supabase.auth.exchangeCodeForSession(code);

      if (error) {
        const signInUrl = new URL('/sign-in', url.origin);
        signInUrl.searchParams.set('error', 'callback');
        signInUrl.searchParams.set('redirectTo', redirectTo);
        return NextResponse.redirect(signInUrl);
      }
    }
  }

  return NextResponse.redirect(new URL(redirectTo, url.origin));
}
