'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

import { staffPrivilegedRoles } from '@/lib/app-config';
import { getSession } from '@/lib/auth/session';
import {
  normalizeInventoryItemInput,
  normalizeInventoryMovementInput,
} from '@/lib/inventory/inventory-utils';
import { logServerError } from '@/lib/observability/logger';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';

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

  const supabase = createSupabaseAdminClient();

  if (!supabase) {
    throw new Error('Supabase admin client unavailable');
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
  const message =
    error instanceof Error
      ? error.message.toLowerCase()
      : typeof error === 'object' &&
          error !== null &&
          'message' in error &&
          typeof error.message === 'string'
        ? error.message.toLowerCase()
        : '';
  const code =
    typeof error === 'object' && error !== null && 'code' in error && typeof error.code === 'string'
      ? error.code
      : '';

  if (message.includes('not enough stock')) {
    return 'insufficient-stock';
  }

  if (
    code === '23505' ||
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
  let successStatus: InventoryStatus = 'item-created';

  try {
    const input = normalizeInventoryItemInput({
      name: String(formData.get('name') ?? ''),
      sku: String(formData.get('sku') ?? ''),
    });

    const { supabase, operatorName } = await getInventoryActionContext();

    const { data: createdItem, error: itemError } = await supabase
      .from('inventory_items')
      .insert({
        name: input.name,
        sku: input.sku,
      })
      .select('id')
      .single();

    if (itemError) {
      throw itemError;
    }

    const { error: stockError } = await supabase.from('inventory_stock').insert({
      item_id: createdItem.id,
      quantity: 0,
    });

    if (stockError) {
      throw stockError;
    }

    const { error: movementError } = await supabase.from('inventory_movements').insert({
      item_id: createdItem.id,
      type: 'in',
      quantity: 1,
      operator_name: operatorName,
    });

    if (movementError) {
      throw movementError;
    }
  } catch (error) {
    logServerError({
      scope: 'inventory.create_item',
      message: 'Error creating inventory item',
      error,
      context: {
        itemName: String(formData.get('name') ?? ''),
        sku: String(formData.get('sku') ?? ''),
      },
    });
    redirectToInventory(mapInventoryError(error));
  }

  redirectToInventory(successStatus);
}

export async function applyInventoryMovement(formData: FormData) {
  let successStatus: InventoryStatus = 'stock-in';

  try {
    const input = normalizeInventoryMovementInput({
      itemId: String(formData.get('itemId') ?? ''),
      type: String(formData.get('type') ?? ''),
      quantity: String(formData.get('quantity') ?? ''),
    });

    const { supabase, operatorName } = await getInventoryActionContext();

    const { data: stockRow, error: stockReadError } = await supabase
      .from('inventory_stock')
      .select('quantity')
      .eq('item_id', input.itemId)
      .single();

    if (stockReadError) {
      throw stockReadError;
    }

    if (input.type === 'out' && stockRow.quantity < input.quantity) {
      throw new Error('Not enough stock');
    }

    const nextQuantity =
      input.type === 'in' ? stockRow.quantity + input.quantity : stockRow.quantity - input.quantity;

    const { error: stockUpdateError } = await supabase
      .from('inventory_stock')
      .update({ quantity: nextQuantity })
      .eq('item_id', input.itemId);

    if (stockUpdateError) {
      throw stockUpdateError;
    }

    const { error: movementError } = await supabase.from('inventory_movements').insert({
      item_id: input.itemId,
      type: input.type,
      quantity: input.quantity,
      operator_name: operatorName,
    });

    if (movementError) {
      throw movementError;
    }
    successStatus = input.type === 'in' ? 'stock-in' : 'stock-out';
  } catch (error) {
    logServerError({
      scope: 'inventory.apply_movement',
      message: 'Error applying inventory movement',
      error,
      context: {
        itemId: String(formData.get('itemId') ?? ''),
        movementType: String(formData.get('type') ?? ''),
        quantity: String(formData.get('quantity') ?? ''),
      },
    });
    redirectToInventory(mapInventoryError(error));
  }

  redirectToInventory(successStatus);
}
