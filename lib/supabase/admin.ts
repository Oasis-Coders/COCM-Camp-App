import 'server-only';

import { createClient } from '@supabase/supabase-js';

import { hasSupabaseAdminEnv } from '@/lib/supabase/env';

export function createSupabaseAdminClient() {
  if (!hasSupabaseAdminEnv()) {
    return null;
  }

  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}
