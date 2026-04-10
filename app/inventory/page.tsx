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
import { createSupabaseServerClient } from '@/lib/supabase/server';

import { applyInventoryMovement, createInventoryItem } from './actions';

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
  const supabase = await createSupabaseServerClient();

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

function InventoryTextField({
  label,
  name,
  placeholder,
  type = 'text',
  required = false,
  min,
  step,
}: {
  label: string;
  name: string;
  placeholder?: string;
  type?: string;
  required?: boolean;
  min?: string;
  step?: string;
}) {
  return (
    <label className="grid gap-2 text-sm text-slate-700">
      <span className="font-medium text-camp-forest">{label}</span>
      <input
        type={type}
        name={name}
        required={required}
        min={min}
        step={step}
        placeholder={placeholder}
        className="rounded-2xl border border-camp-forest/10 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-camp-moss focus:ring-2 focus:ring-camp-sky/60"
      />
    </label>
  );
}

function InventorySubmitButton({
  children,
  tone = 'primary',
}: {
  children: React.ReactNode;
  tone?: 'primary' | 'secondary';
}) {
  return (
    <button
      type="submit"
      className={`inline-flex items-center justify-center rounded-full px-4 py-2.5 text-sm font-semibold transition ${
        tone === 'primary'
          ? 'bg-camp-forest text-white hover:bg-camp-forest/90'
          : 'bg-camp-sand/65 text-camp-forest hover:bg-camp-sand'
      }`}
    >
      {children}
    </button>
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
                <form action={createInventoryItem} className="grid gap-4">
                  <InventoryTextField label="Item name" name="name" required />
                  <InventoryTextField label="SKU" name="sku" required placeholder="ITEM-001" />
                  <InventorySubmitButton>Add item</InventorySubmitButton>
                </form>
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

            <section className="grid gap-6 xl:grid-cols-2">
              <InventorySectionCard
                title="Products"
                eyebrow="List"
                description="The basic product table only shows item name and SKU."
              >
                <div className="grid gap-3">
                  {products.length === 0 ? (
                    <div className="rounded-[22px] border border-dashed border-camp-forest/20 bg-white/75 p-5 text-sm text-slate-600">
                      No products yet.
                    </div>
                  ) : (
                    products.map((item) => (
                      <article
                        key={item.id}
                        className="rounded-[22px] border border-camp-forest/10 bg-white p-4"
                      >
                        <p className="font-semibold text-camp-forest">{item.name}</p>
                        <p className="mt-1 text-sm text-slate-600">{item.sku}</p>
                      </article>
                    ))
                  )}
                </div>
              </InventorySectionCard>

              <InventorySectionCard
                title="Stock"
                eyebrow="Balance"
                description="Use the in and out buttons here. Outbound stock checks the current balance first."
              >
                <div className="grid gap-4">
                  {stockItems.length === 0 ? (
                    <div className="rounded-[22px] border border-dashed border-camp-forest/20 bg-white/75 p-5 text-sm text-slate-600">
                      No stock records yet.
                    </div>
                  ) : (
                    stockItems.map((item) => (
                      <article
                        key={item.id}
                        className="rounded-[22px] border border-camp-forest/10 bg-white p-4"
                      >
                        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                          <div>
                            <p className="font-semibold text-camp-forest">{item.name}</p>
                            <p className="mt-1 text-sm text-slate-600">{item.sku}</p>
                          </div>
                          <div className="rounded-[20px] bg-camp-sand/25 px-4 py-3 text-sm text-slate-700">
                            Current stock:{' '}
                            <span className="font-semibold text-camp-forest">{item.quantity}</span>
                          </div>
                        </div>

                        <div className="mt-4 grid gap-3 md:grid-cols-2">
                          <form
                            action={applyInventoryMovement}
                            className="grid gap-3 rounded-[20px] border border-camp-forest/10 bg-camp-sky/15 p-4"
                          >
                            <input type="hidden" name="itemId" value={item.id} />
                            <input type="hidden" name="type" value="in" />
                            <InventoryTextField
                              label="Quantity to add"
                              name="quantity"
                              type="number"
                              min="1"
                              step="1"
                              required
                            />
                            <InventorySubmitButton>Stock in</InventorySubmitButton>
                          </form>

                          <form
                            action={applyInventoryMovement}
                            className="grid gap-3 rounded-[20px] border border-camp-forest/10 bg-camp-sand/25 p-4"
                          >
                            <input type="hidden" name="itemId" value={item.id} />
                            <input type="hidden" name="type" value="out" />
                            <InventoryTextField
                              label="Quantity to remove"
                              name="quantity"
                              type="number"
                              min="1"
                              step="1"
                              required
                            />
                            <InventorySubmitButton tone="secondary">
                              Stock out
                            </InventorySubmitButton>
                          </form>
                        </div>
                      </article>
                    ))
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
