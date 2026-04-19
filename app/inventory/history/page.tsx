import Link from 'next/link';
import { redirect } from 'next/navigation';

import { AppShell } from '@/components/layout/app-shell';
import { staffPrivilegedRoles } from '@/lib/app-config';
import { getSession } from '@/lib/auth/session';
import {
  isMissingInventoryMovementSnapshotColumnError,
  type InventoryItemRecord,
  type InventoryMovementRecord,
} from '@/lib/inventory/inventory-utils';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { createSupabaseServerClient } from '@/lib/supabase/server';

import { ClearHistoryButton } from './clear-history-button';

type InventoryHistoryBundle = {
  enabled: boolean;
  errors: string[];
  items: InventoryItemRecord[];
  movements: InventoryMovementRecord[];
};

async function loadInventoryHistory(): Promise<InventoryHistoryBundle> {
  const supabase = createSupabaseAdminClient() ?? (await createSupabaseServerClient());

  if (!supabase) {
    return {
      enabled: false,
      errors: [],
      items: [],
      movements: [],
    };
  }

  const [itemsResult, initialMovementsResult] = await Promise.all([
    supabase.from('inventory_items').select('id, name, sku'),
    supabase
      .from('inventory_movements')
      .select('id, item_id, item_name, item_sku, type, quantity, operator_name, time')
      .order('time', { ascending: false }),
  ]);
  let movementsData = (initialMovementsResult.data ?? []) as InventoryMovementRecord[];
  let movementsError = initialMovementsResult.error;

  if (isMissingInventoryMovementSnapshotColumnError(movementsError)) {
    const compatibleMovementsResult = await supabase
      .from('inventory_movements')
      .select('id, item_id, type, quantity, operator_name, time')
      .order('time', { ascending: false });

    movementsData = (compatibleMovementsResult.data ?? []) as InventoryMovementRecord[];
    movementsError = compatibleMovementsResult.error;
  }

  const errors = [
    itemsResult.error ? 'Inventory items could not be loaded.' : null,
    movementsError ? 'Inventory history could not be loaded.' : null,
  ].filter(Boolean) as string[];

  return {
    enabled: true,
    errors,
    items: (itemsResult.data ?? []) as InventoryItemRecord[],
    movements: movementsData,
  };
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}

function movementClasses(type: string) {
  if (type === 'in') {
    return 'bg-emerald-100 text-emerald-900';
  }

  if (type === 'delete') {
    return 'bg-camp-sand/70 text-camp-forest';
  }

  return 'bg-amber-100 text-amber-900';
}

function movementLabel(type: string) {
  if (type === 'delete') {
    return 'deleted';
  }

  return type;
}

export default async function InventoryHistoryPage() {
  const session = await getSession();

  if (!session.isAuthenticated) {
    redirect('/sign-in?redirectTo=/inventory/history');
  }

  if (!staffPrivilegedRoles.includes(session.role)) {
    redirect('/dashboard');
  }

  const history = await loadInventoryHistory();
  const itemById = new Map(history.items.map((item) => [item.id, item]));

  return (
    <AppShell title="Inventory History" eyebrow="Staff operations">
      <div className="grid gap-6">
        {!history.enabled ? (
          <article className="rounded-panel border border-camp-forest/10 bg-white p-6 shadow-card">
            <h3 className="font-serif text-2xl text-camp-forest">Supabase required</h3>
            <p className="mt-3 text-sm text-camp-moss">
              Connect Supabase before the inventory history page can load.
            </p>
          </article>
        ) : (
          <>
            {history.errors.length > 0 ? (
              <article className="rounded-panel border border-rose-200 bg-rose-50/80 p-6 shadow-card">
                <h3 className="font-serif text-2xl text-rose-900">
                  Some history data could not be loaded
                </h3>
                <ul className="mt-3 grid gap-2 text-sm text-rose-900">
                  {history.errors.map((error) => (
                    <li key={error}>{error}</li>
                  ))}
                </ul>
              </article>
            ) : null}

            <article className="rounded-panel border border-camp-forest/10 bg-white p-6 shadow-card">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.24em] text-camp-moss">History</p>
                  <h3 className="mt-3 font-serif text-2xl text-camp-forest">Movement records</h3>
                  <p className="mt-2 text-sm text-camp-moss">
                    Every inbound and outbound movement records the operator and time automatically.
                  </p>
                </div>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                  {session.role === 'super_admin' ? <ClearHistoryButton /> : null}
                  <Link
                    href="/inventory"
                    className="inline-flex items-center justify-center rounded-full border border-camp-forest/15 px-4 py-2.5 text-sm font-semibold text-camp-forest transition hover:bg-camp-sand/35"
                  >
                    Back to inventory
                  </Link>
                </div>
              </div>

              <div className="mt-5 grid gap-3">
                {history.movements.length === 0 ? (
                  <div className="rounded-[22px] border border-dashed border-camp-forest/20 bg-white/75 p-5 text-sm text-camp-moss">
                    No history yet.
                  </div>
                ) : (
                  history.movements.map((movement) => {
                    const item = movement.item_id ? itemById.get(movement.item_id) : undefined;
                    const itemName = item?.name ?? movement.item_name ?? 'Deleted item';
                    const itemSku = item?.sku ?? movement.item_sku ?? 'DELETED';

                    return (
                      <article
                        key={movement.id}
                        className="rounded-[22px] border border-camp-forest/10 bg-white p-4"
                      >
                        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="font-semibold text-camp-forest">{itemName}</p>
                              <span className="rounded-full bg-camp-sky/60 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-camp-forest">
                                {itemSku}
                              </span>
                              <span
                                className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] ${movementClasses(movement.type)}`}
                              >
                                {movementLabel(movement.type)}
                              </span>
                            </div>
                            <p className="mt-2 text-sm text-camp-moss">
                              {movement.type === 'delete' ? 'Stock at delete' : 'Quantity'}:{' '}
                              {movement.quantity}
                            </p>
                            <p className="mt-1 text-sm text-camp-moss">
                              Operator: {movement.operator_name}
                            </p>
                          </div>
                          <div className="text-sm text-camp-moss">
                            {formatDateTime(movement.time)}
                          </div>
                        </div>
                      </article>
                    );
                  })
                )}
              </div>
            </article>
          </>
        )}
      </div>
    </AppShell>
  );
}
