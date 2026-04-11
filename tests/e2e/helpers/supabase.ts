import { randomUUID } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

import { createClient, type SupabaseClient } from '@supabase/supabase-js';

type E2EUser = {
  id: string;
  email: string;
  password: string;
  displayName: string;
};

type E2ERole = 'super_admin' | 'admin' | 'staff' | 'participant';

const envFiles = ['.env.e2e.local', '.env.local', '.env'];
let envLoaded = false;

function loadEnvFile(filePath: string) {
  if (!existsSync(filePath)) {
    return;
  }

  for (const line of readFileSync(filePath, 'utf8').split('\n')) {
    const trimmed = line.trim();

    if (!trimmed || trimmed.startsWith('#')) {
      continue;
    }

    const separatorIndex = trimmed.indexOf('=');

    if (separatorIndex === -1) {
      continue;
    }

    const key = trimmed.slice(0, separatorIndex).trim();
    const rawValue = trimmed.slice(separatorIndex + 1).trim();
    const value = rawValue.replace(/^['"]|['"]$/g, '');

    process.env[key] ??= value;
  }
}

export function loadE2EEnv() {
  if (envLoaded) {
    return;
  }

  for (const fileName of envFiles) {
    loadEnvFile(path.resolve(process.cwd(), fileName));
  }

  envLoaded = true;
}

export function hasSupabaseE2EEnv() {
  loadE2EEnv();

  return Boolean(
    process.env.E2E_SUPABASE_URL &&
    process.env.E2E_SUPABASE_ANON_KEY &&
    process.env.E2E_SUPABASE_SERVICE_ROLE_KEY
  );
}

export function createE2ESupabaseAdminClient() {
  loadE2EEnv();

  if (!hasSupabaseE2EEnv()) {
    throw new Error('Supabase e2e environment variables are missing');
  }

  return createClient(process.env.E2E_SUPABASE_URL!, process.env.E2E_SUPABASE_SERVICE_ROLE_KEY!, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

export async function createE2EUser(
  supabase: SupabaseClient,
  input: {
    role: E2ERole;
    emailPrefix?: string;
    displayNamePrefix?: string;
  }
): Promise<E2EUser> {
  const runId = randomUUID().slice(0, 8);
  const email = `${input.emailPrefix ?? 'codex-e2e'}-${runId}@example.com`;
  const password = `CodexE2E!${runId}Aa1`;
  const displayName = `${input.displayNamePrefix ?? 'Codex E2E'} ${runId}`;

  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    app_metadata: { role: input.role },
    user_metadata: { display_name: displayName },
  });

  if (error || !data.user) {
    throw error ?? new Error('Could not create e2e user');
  }

  return {
    id: data.user.id,
    email,
    password,
    displayName,
  };
}

export async function createE2EStaffUser(supabase: SupabaseClient): Promise<E2EUser> {
  return createE2EUser(supabase, { role: 'staff' });
}

export async function deleteE2EUser(supabase: SupabaseClient, userId: string | undefined) {
  if (!userId) {
    return;
  }

  const { error } = await supabase.auth.admin.deleteUser(userId);

  if (error) {
    throw error;
  }
}

export async function deleteE2EUsersByEmailPrefix(supabase: SupabaseClient, emailPrefix: string) {
  const { data, error } = await supabase.auth.admin.listUsers();

  if (error) {
    throw error;
  }

  const users = data.users.filter((user) => user.email?.startsWith(emailPrefix));

  for (const user of users) {
    await deleteE2EUser(supabase, user.id);
  }
}

export async function cleanupInventoryArtifacts(
  supabase: SupabaseClient,
  input: {
    skuPrefix: string;
    operatorName?: string;
  }
) {
  const { data: items, error: itemReadError } = await supabase
    .from('inventory_items')
    .select('id')
    .like('sku', `${input.skuPrefix}%`);

  if (itemReadError) {
    throw itemReadError;
  }

  const itemIds = (items ?? []).map((item) => item.id as string);

  if (itemIds.length > 0) {
    const { error: movementDeleteError } = await supabase
      .from('inventory_movements')
      .delete()
      .in('item_id', itemIds);

    if (movementDeleteError) {
      throw movementDeleteError;
    }

    const { error: itemDeleteError } = await supabase
      .from('inventory_items')
      .delete()
      .in('id', itemIds);

    if (itemDeleteError) {
      throw itemDeleteError;
    }
  }

  if (input.operatorName) {
    const { error: movementDeleteError } = await supabase
      .from('inventory_movements')
      .delete()
      .eq('operator_name', input.operatorName);

    if (movementDeleteError) {
      throw movementDeleteError;
    }
  }
}
