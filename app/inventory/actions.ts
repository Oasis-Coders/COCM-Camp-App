'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

import { staffPrivilegedRoles } from '@/lib/app-config';
import { getSession } from '@/lib/auth/session';
import {
  normalizeInventoryItemInput,
  normalizeInventoryLocationInput,
  normalizeInventoryTransactionInput,
} from '@/lib/inventory/inventory-utils';
import { createSupabaseServerClient } from '@/lib/supabase/server';

type InventoryStatus =
  | 'item-created'
  | 'location-created'
  | 'received'
  | 'transferred'
  | 'checked-out'
  | 'returned'
  | 'adjusted'
  | 'validation-error'
  | 'unauthorized'
  | 'supabase-unavailable'
  | 'operation-failed';

async function getInventoryActionContext() {
  const session = await getSession();

  if (!session.isAuthenticated || !staffPrivilegedRoles.includes(session.role)) {
    throw new Error('Inventory access denied');
  }

  const supabase = await createSupabaseServerClient();

  if (!supabase) {
    throw new Error('Supabase client unavailable');
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error('Inventory access denied');
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('id')
    .eq('auth_user_id', user.id)
    .single<{ id: string }>();

  if (profileError || !profile) {
    throw new Error('Inventory access denied');
  }

  return {
    supabase,
    profileId: profile.id,
  };
}

function redirectToInventory(status: InventoryStatus) {
  revalidatePath('/inventory');
  redirect(`/inventory?inventory=${status}`);
}

function mapInventoryError(error: unknown): InventoryStatus {
  const message = error instanceof Error ? error.message.toLowerCase() : '';

  if (message.includes('required') || message.includes('invalid') || message.includes('choose')) {
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
      sku: String(formData.get('sku') ?? ''),
      name: String(formData.get('name') ?? ''),
      description: String(formData.get('description') ?? ''),
      category: String(formData.get('category') ?? ''),
      unit: String(formData.get('unit') ?? ''),
      minimumStock: String(formData.get('minimumStock') ?? ''),
      defaultLocationId: String(formData.get('defaultLocationId') ?? ''),
      isCheckoutable: String(formData.get('isCheckoutable') ?? ''),
    });

    const { supabase, profileId } = await getInventoryActionContext();

    const { error } = await supabase.from('inventory_items').insert({
      sku: input.sku,
      name: input.name,
      description: input.description,
      category: input.category,
      unit: input.unit,
      minimum_stock: input.minimumStock,
      default_location_id: input.defaultLocationId,
      is_checkoutable: input.isCheckoutable,
      created_by: profileId,
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

export async function createInventoryLocation(formData: FormData) {
  try {
    const input = normalizeInventoryLocationInput({
      name: String(formData.get('name') ?? ''),
      code: String(formData.get('code') ?? ''),
      locationType: String(formData.get('locationType') ?? ''),
    });

    const { supabase, profileId } = await getInventoryActionContext();

    const { error } = await supabase.from('inventory_locations').insert({
      name: input.name,
      code: input.code,
      location_type: input.locationType,
      created_by: profileId,
    });

    if (error) {
      throw error;
    }

    redirectToInventory('location-created');
  } catch (error) {
    console.error('Error creating inventory location:', error);
    redirectToInventory(mapInventoryError(error));
  }
}

export async function submitInventoryTransaction(formData: FormData) {
  try {
    const input = normalizeInventoryTransactionInput({
      transactionType: String(formData.get('transactionType') ?? ''),
      itemId: String(formData.get('itemId') ?? ''),
      assignmentId: String(formData.get('assignmentId') ?? ''),
      sourceLocationId: String(formData.get('sourceLocationId') ?? ''),
      destinationLocationId: String(formData.get('destinationLocationId') ?? ''),
      quantity: String(formData.get('quantity') ?? ''),
      reasonCode: String(formData.get('reasonCode') ?? ''),
      notes: String(formData.get('notes') ?? ''),
      assignedToProfileId: String(formData.get('assignedToProfileId') ?? ''),
      assignedToEventId: String(formData.get('assignedToEventId') ?? ''),
      dueBackAt: String(formData.get('dueBackAt') ?? ''),
    });

    const { supabase } = await getInventoryActionContext();

    const { error } = await supabase.rpc('apply_inventory_transaction', {
      p_transaction_type: input.transactionType,
      p_item_id: input.itemId,
      p_quantity: input.quantity,
      p_source_location_id: input.sourceLocationId,
      p_destination_location_id: input.destinationLocationId,
      p_reason_code: input.reasonCode,
      p_notes: input.notes,
      p_assigned_to_profile_id: input.assignedToProfileId,
      p_assigned_to_event_id: input.assignedToEventId,
      p_assignment_id: input.assignmentId,
      p_due_back_at: input.dueBackAt,
    });

    if (error) {
      throw error;
    }

    const successStatus: Record<typeof input.transactionType, InventoryStatus> = {
      receive: 'received',
      transfer: 'transferred',
      checkout: 'checked-out',
      return: 'returned',
      adjustment: 'adjusted',
    };

    redirectToInventory(successStatus[input.transactionType]);
  } catch (error) {
    console.error('Error applying inventory transaction:', error);
    redirectToInventory(mapInventoryError(error));
  }
}
