'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

import { staffPrivilegedRoles } from '@/lib/app-config';
import { getSession } from '@/lib/auth/session';
import {
  normalizeInventoryItemInput,
  normalizeInventoryMovementInput,
} from '@/lib/inventory/inventory-utils';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { createSupabaseServerClient } from '@/lib/supabase/server';

type InventoryStatus =
  | 'item-created'
  | 'stock-in'
  | 'stock-out'
  | 'validation-error'
  | 'insufficient-stock'
  | 'unauthorized'
  | 'supabase-unavailable'
  | 'operation-failed';

async function getInventoryActionContext() {
  const session = await getSession();

  if (!session.isAuthenticated || !staffPrivilegedRoles.includes(session.role)) {
    throw new Error('Inventory access denied');
  }

  const supabase = createSupabaseAdminClient() ?? (await createSupabaseServerClient());

  if (!supabase) {
    throw new Error('Supabase client unavailable');
  }

  return {
    supabase,
    operatorName: session.displayName || session.email || 'Camp user',
  };
}

function redirectToInventory(status: InventoryStatus) {
  revalidatePath('/inventory');
  revalidatePath('/inventory/history');
  redirect(`/inventory?inventory=${status}`);
}

function mapInventoryError(error: unknown): InventoryStatus {
  const message = error instanceof Error ? error.message.toLowerCase() : '';

  if (message.includes('not enough stock')) {
    return 'insufficient-stock';
  }

  if (
    message.includes('required') ||
    message.includes('invalid') ||
    message.includes('quantity') ||
    message.includes('unique') ||
    message.includes('duplicate')
  ) {
    return 'validation-error';
  }

  if (message.includes('access denied') || message.includes('unauthorized')) {
    return 'unauthorized';
  }

  if (message.includes('supabase')) {
    return 'supabase-unavailable';
  }

  return 'operation-failed';
}

export async function createInventoryItem(formData: FormData) {
  try {
    const input = normalizeInventoryItemInput({
      name: String(formData.get('name') ?? ''),
      sku: String(formData.get('sku') ?? ''),
    });

    const { supabase } = await getInventoryActionContext();

    const { error } = await supabase.rpc('inventory_add_item', {
      p_name: input.name,
      p_sku: input.sku,
    });

    if (error) {
      throw error;
    }

    redirectToInventory('item-created');
  } catch (error) {
    console.error('Error creating inventory item:', error);
    redirectToInventory(mapInventoryError(error));
  }
}

export async function applyInventoryMovement(formData: FormData) {
  try {
    const input = normalizeInventoryMovementInput({
      itemId: String(formData.get('itemId') ?? ''),
      type: String(formData.get('type') ?? ''),
      quantity: String(formData.get('quantity') ?? ''),
    });

    const { supabase, operatorName } = await getInventoryActionContext();

    const { error } = await supabase.rpc('inventory_apply_movement', {
      p_item_id: input.itemId,
      p_type: input.type,
      p_quantity: input.quantity,
      p_operator_name: operatorName,
    });

    if (error) {
      throw error;
    }

    redirectToInventory(input.type === 'in' ? 'stock-in' : 'stock-out');
  } catch (error) {
    console.error('Error applying inventory movement:', error);
    redirectToInventory(mapInventoryError(error));
  }
}
