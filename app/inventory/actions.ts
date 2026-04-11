'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

import { staffPrivilegedRoles } from '@/lib/app-config';
import { getSession } from '@/lib/auth/session';
import {
  isInventoryDeleteHistoryCompatibilityError,
  isMissingInventoryMovementSnapshotColumnError,
  normalizeInventoryItemInput,
  normalizeInventoryMovementInput,
} from '@/lib/inventory/inventory-utils';
import { logServerError } from '@/lib/observability/logger';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';

export type InventoryStatus =
  | 'item-created'
  | 'item-deleted'
  | 'history-cleared'
  | 'stock-in'
  | 'stock-out'
  | 'validation-error'
  | 'insufficient-stock'
  | 'unauthorized'
  | 'supabase-unavailable'
  | 'operation-failed';

export type InventoryActionState = {
  status: InventoryStatus | null;
  submittedAt: number | null;
};

type InventoryMovementPayload = {
  item_id: string | null;
  item_name?: string;
  item_sku?: string;
  type: 'in' | 'out' | 'delete';
  quantity: number;
  operator_name: string;
};

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
    role: session.role,
    operatorName: session.displayName || session.email || 'Camp user',
  };
}

async function insertInventoryMovement(
  supabase: NonNullable<ReturnType<typeof createSupabaseAdminClient>>,
  payload: InventoryMovementPayload
) {
  const { error } = await supabase.from('inventory_movements').insert(payload);

  if (!error) {
    return;
  }

  if (!isMissingInventoryMovementSnapshotColumnError(error)) {
    throw error;
  }

  const { item_name: _itemName, item_sku: _itemSku, ...compatiblePayload } = payload;
  const { error: compatibleError } = await supabase
    .from('inventory_movements')
    .insert(compatiblePayload);

  if (compatibleError) {
    throw compatibleError;
  }
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

export async function createInventoryItem(
  _previousState: InventoryActionState,
  formData: FormData
): Promise<InventoryActionState> {
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

    await insertInventoryMovement(supabase, {
      item_id: createdItem.id,
      item_name: input.name,
      item_sku: input.sku,
      type: 'in',
      quantity: 1,
      operator_name: operatorName,
    });

    revalidatePath('/inventory');
    revalidatePath('/inventory/history');

    return {
      status: 'item-created',
      submittedAt: Date.now(),
    };
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

    return {
      status: mapInventoryError(error),
      submittedAt: Date.now(),
    };
  }
}

export async function deleteInventoryItem(
  _previousState: InventoryActionState,
  formData: FormData
): Promise<InventoryActionState> {
  try {
    const itemId = String(formData.get('itemId') ?? '').trim();

    if (!itemId) {
      throw new Error('Item is required');
    }

    const { supabase, operatorName } = await getInventoryActionContext();

    const { data: item, error: itemReadError } = await supabase
      .from('inventory_items')
      .select('name, sku')
      .eq('id', itemId)
      .single();

    if (itemReadError) {
      throw itemReadError;
    }

    const { data: stockRow, error: stockReadError } = await supabase
      .from('inventory_stock')
      .select('quantity')
      .eq('item_id', itemId)
      .maybeSingle();

    if (stockReadError) {
      throw stockReadError;
    }

    const { error } = await supabase.from('inventory_items').delete().eq('id', itemId);

    if (error) {
      throw error;
    }

    try {
      await insertInventoryMovement(supabase, {
        item_id: null,
        item_name: item.name,
        item_sku: item.sku,
        type: 'delete',
        quantity: stockRow?.quantity ?? 0,
        operator_name: operatorName,
      });
    } catch (movementError) {
      if (!isInventoryDeleteHistoryCompatibilityError(movementError)) {
        throw movementError;
      }

      logServerError({
        scope: 'inventory.delete_item_history',
        message: 'Inventory item was deleted, but delete history could not be recorded',
        error: movementError,
        context: {
          itemId,
          itemName: item.name,
          sku: item.sku,
        },
      });
    }

    revalidatePath('/inventory');
    revalidatePath('/inventory/history');

    return {
      status: 'item-deleted',
      submittedAt: Date.now(),
    };
  } catch (error) {
    logServerError({
      scope: 'inventory.delete_item',
      message: 'Error deleting inventory item',
      error,
      context: {
        itemId: String(formData.get('itemId') ?? ''),
      },
    });

    return {
      status: mapInventoryError(error),
      submittedAt: Date.now(),
    };
  }
}

export async function clearInventoryHistory(
  _previousState: InventoryActionState,
  _formData: FormData
): Promise<InventoryActionState> {
  try {
    const { supabase, role } = await getInventoryActionContext();

    if (role !== 'super_admin') {
      throw new Error('Unauthorized');
    }

    const { error } = await supabase.from('inventory_movements').delete().not('id', 'is', null);

    if (error) {
      throw error;
    }

    revalidatePath('/inventory/history');

    return {
      status: 'history-cleared',
      submittedAt: Date.now(),
    };
  } catch (error) {
    logServerError({
      scope: 'inventory.clear_history',
      message: 'Error clearing inventory history',
      error,
    });

    return {
      status: mapInventoryError(error),
      submittedAt: Date.now(),
    };
  }
}

export async function applyInventoryMovement(
  _previousState: InventoryActionState,
  formData: FormData
): Promise<InventoryActionState> {
  try {
    const input = normalizeInventoryMovementInput({
      itemId: String(formData.get('itemId') ?? ''),
      type: String(formData.get('type') ?? ''),
      quantity: String(formData.get('quantity') ?? ''),
    });

    const { supabase, operatorName } = await getInventoryActionContext();

    const { data: item, error: itemReadError } = await supabase
      .from('inventory_items')
      .select('name, sku')
      .eq('id', input.itemId)
      .single();

    if (itemReadError) {
      throw itemReadError;
    }

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

    await insertInventoryMovement(supabase, {
      item_id: input.itemId,
      item_name: item.name,
      item_sku: item.sku,
      type: input.type,
      quantity: input.quantity,
      operator_name: operatorName,
    });

    revalidatePath('/inventory');
    revalidatePath('/inventory/history');

    return {
      status: input.type === 'in' ? 'stock-in' : 'stock-out',
      submittedAt: Date.now(),
    };
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

    return {
      status: mapInventoryError(error),
      submittedAt: Date.now(),
    };
  }
}
