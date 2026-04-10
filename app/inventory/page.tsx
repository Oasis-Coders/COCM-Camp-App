import Link from 'next/link';
import { redirect } from 'next/navigation';

import { AppShell } from '@/components/layout/app-shell';
import { staffPrivilegedRoles } from '@/lib/app-config';
import { getSession } from '@/lib/auth/session';
import {
  buildInventoryStockItems,
  getInventoryStatusMessage,
  type InventoryItemRecord,
  type InventoryStockRecord,
} from '@/lib/inventory/inventory-utils';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { createSupabaseServerClient } from '@/lib/supabase/server';

import { CreateItemForm } from './create-item-form';
import { StockSearchList } from './stock-search-list';

type InventoryPageProps = {
  searchParams: Promise<{
    inventory?: string;
  }>;
};

type InventoryDataBundle = {
  enabled: boolean;
  errors: string[];
  items: InventoryItemRecord[];
  stock: InventoryStockRecord[];
};

async function loadInventoryData(): Promise<InventoryDataBundle> {
  const supabase = createSupabaseAdminClient() ?? (await createSupabaseServerClient());

  if (!supabase) {
    return {
      enabled: false,
      errors: [],
      items: [],
      stock: [],
    };
  }

  const [itemsResult, stockResult] = await Promise.all([
    supabase.from('inventory_items').select('id, name, sku').order('name'),
    supabase.from('inventory_stock').select('item_id, quantity'),
  ]);

  const errors = [
    itemsResult.error ? 'Inventory items could not be loaded.' : null,
    stockResult.error ? 'Inventory stock could not be loaded.' : null,
  ].filter(Boolean) as string[];

  return {
    enabled: true,
    errors,
    items: (itemsResult.data ?? []) as InventoryItemRecord[],
    stock: (stockResult.data ?? []) as InventoryStockRecord[],
  };
}

function toneClasses(tone: 'success' | 'error') {
  if (tone === 'success') {
    return 'border-emerald-200 bg-emerald-50/90 text-emerald-900';
  }

  return 'border-rose-200 bg-rose-50/90 text-rose-900';
}

function InventorySectionCard({
  title,
  eyebrow,
  description,
  children,
}: {
  title: string;
  eyebrow: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <article className="rounded-[28px] border border-camp-forest/10 bg-white/85 p-6 shadow-panel">
      <p className="text-xs uppercase tracking-[0.24em] text-camp-moss">{eyebrow}</p>
      <h3 className="mt-3 font-serif text-2xl text-camp-forest">{title}</h3>
      {description ? <p className="mt-2 max-w-3xl text-sm text-slate-600">{description}</p> : null}
      <div className="mt-5">{children}</div>
    </article>
  );
}

export default async function InventoryPage({ searchParams }: InventoryPageProps) {
  const session = await getSession();

  if (!session.isAuthenticated) {
    redirect('/sign-in?redirectTo=/inventory');
  }

  if (!staffPrivilegedRoles.includes(session.role)) {
    redirect('/dashboard');
  }

  const params = await searchParams;
  const inventoryStatus = getInventoryStatusMessage(params.inventory);
  const inventoryData = await loadInventoryData();
  const products = [...inventoryData.items].sort(
    (left, right) => left.name.localeCompare(right.name) || left.sku.localeCompare(right.sku)
  );
  const stockItems = buildInventoryStockItems({
    items: inventoryData.items,
    stock: inventoryData.stock,
  });

  return (
    <AppShell title="Inventory" eyebrow="Staff operations">
      <div className="grid gap-6">
        {inventoryStatus ? (
          <section
            className={`rounded-[24px] border px-5 py-4 text-sm shadow-panel ${toneClasses(inventoryStatus.tone)}`}
          >
            {inventoryStatus.text}
          </section>
        ) : null}

        {!inventoryData.enabled ? (
          <InventorySectionCard
            title="Connect Supabase to use inventory"
            eyebrow="Unavailable"
            description="The inventory MVP needs Supabase before items, stock, and movement history can be loaded."
          >
            <div className="rounded-[22px] border border-camp-forest/10 bg-camp-sand/35 p-5 text-sm text-slate-700">
              Add the Supabase URL and anon key to enable the minimal inventory workflow.
            </div>
          </InventorySectionCard>
        ) : (
          <>
            {inventoryData.errors.length > 0 ? (
              <InventorySectionCard
                title="Some inventory data could not be loaded"
                eyebrow="Partial data"
              >
                <ul className="grid gap-2 text-sm text-rose-900">
                  {inventoryData.errors.map((error) => (
                    <li key={error}>{error}</li>
                  ))}
                </ul>
              </InventorySectionCard>
            ) : null}

            <section className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
              <InventorySectionCard
                title="Add item"
                eyebrow="Create"
                description="This MVP only stores item name and SKU. New items start with stock at zero."
              >
                <CreateItemForm />
              </InventorySectionCard>

              <InventorySectionCard
                title="History"
                eyebrow="Track"
                description="Every stock movement records the operator automatically, and the full log lives on a separate page."
              >
                <div className="grid gap-4 md:grid-cols-[0.7fr_0.3fr]">
                  <div className="rounded-[22px] border border-camp-forest/10 bg-camp-sand/25 p-5 text-sm text-slate-700">
                    <p>
                      Items:{' '}
                      <span className="font-semibold text-camp-forest">{products.length}</span>
                    </p>
                    <p className="mt-2">
                      Stock lines:{' '}
                      <span className="font-semibold text-camp-forest">{stockItems.length}</span>
                    </p>
                  </div>
                  <Link
                    href="/inventory/history"
                    className="inline-flex items-center justify-center rounded-[22px] border border-camp-forest/10 bg-white px-4 py-5 text-sm font-semibold text-camp-forest transition hover:bg-camp-sand/25"
                  >
                    View history
                  </Link>
                </div>
              </InventorySectionCard>
            </section>

            <section className="grid gap-6">
              <InventorySectionCard
                title="Stock"
                eyebrow="Balance"
                description="Everything about each stock item lives here: product details, current balance, and quick in or out actions."
              >
                <div className="grid gap-5">
                  <div className="grid gap-3 md:grid-cols-3">
                    <div className="rounded-[22px] border border-camp-forest/10 bg-camp-sand/25 p-4 text-sm text-slate-700">
                      <p className="text-xs uppercase tracking-[0.2em] text-camp-moss">Items</p>
                      <p className="mt-2 text-2xl font-semibold text-camp-forest">
                        {products.length}
                      </p>
                    </div>
                    <div className="rounded-[22px] border border-camp-forest/10 bg-white p-4 text-sm text-slate-700">
                      <p className="text-xs uppercase tracking-[0.2em] text-camp-moss">
                        Stock lines
                      </p>
                      <p className="mt-2 text-2xl font-semibold text-camp-forest">
                        {stockItems.length}
                      </p>
                    </div>
                    <div className="rounded-[22px] border border-camp-forest/10 bg-white p-4 text-sm text-slate-700">
                      <p className="text-xs uppercase tracking-[0.2em] text-camp-moss">Workflow</p>
                      <p className="mt-2 leading-6">
                        Add or remove stock inline without leaving this panel.
                      </p>
                    </div>
                  </div>

                  {stockItems.length === 0 ? (
                    <div className="rounded-[22px] border border-dashed border-camp-forest/20 bg-white/75 p-5 text-sm text-slate-600">
                      No stock records yet.
                    </div>
                  ) : (
                    <StockSearchList items={stockItems} />
                  )}
                </div>
              </InventorySectionCard>
            </section>
          </>
        )}
      </div>
    </AppShell>
  );
}
