import Link from 'next/link';
import { redirect } from 'next/navigation';

import { AppShell } from '@/components/layout/app-shell';
import { staffPrivilegedRoles } from '@/lib/app-config';
import { getSession } from '@/lib/auth/session';
import {
  buildInventoryAssignmentViews,
  buildInventoryOverviewMetrics,
  buildInventoryTransactionViews,
  getInventoryStatusMessage,
  type InventoryTransactionLineRecord,
  type InventoryTransactionRecord,
} from '@/lib/inventory/inventory-view';
import {
  buildInventoryItemSummaries,
  buildInventoryLocationSummaries,
  filterInventorySummaries,
  inventoryLocationTypes,
  type InventoryAssignmentRecord,
  type InventoryItemRecord,
  type InventoryLocationRecord,
  type InventoryStockLevelRecord,
} from '@/lib/inventory/inventory-utils';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { createSupabaseServerClient } from '@/lib/supabase/server';

import {
  createInventoryItem,
  createInventoryLocation,
  submitInventoryTransaction,
} from './actions';

type InventoryPageProps = {
  searchParams: Promise<{
    inventory?: string;
    query?: string;
    location?: string;
    lowStock?: string;
  }>;
};

type InventoryProfileRecord = {
  id: string;
  display_name: string | null;
  email: string | null;
};

type InventoryEventRecord = {
  id: string;
  title: string | null;
  starts_at: string | null;
  status: string | null;
};

type InventoryAssignmentDetailsRecord = InventoryAssignmentRecord & {
  assigned_to_profile_id?: string | null;
  assigned_to_event_id?: string | null;
  due_back_at?: string | null;
  returned_at?: string | null;
  notes?: string | null;
  created_at?: string | null;
};

type InventoryDataBundle = {
  enabled: boolean;
  errors: string[];
  items: InventoryItemRecord[];
  locations: InventoryLocationRecord[];
  stockLevels: InventoryStockLevelRecord[];
  assignments: InventoryAssignmentDetailsRecord[];
  transactions: InventoryTransactionRecord[];
  transactionLines: InventoryTransactionLineRecord[];
  profiles: InventoryProfileRecord[];
  events: InventoryEventRecord[];
};

const locationTypeLabels: Record<(typeof inventoryLocationTypes)[number], string> = {
  storage: 'Storage',
  event: 'Event staging',
  vehicle: 'Vehicle',
  room: 'Room or desk',
  temporary: 'Temporary',
};

const transactionReasonOptions = {
  receive: [
    { value: 'supplier-delivery', label: 'Supplier delivery' },
    { value: 'donation', label: 'Donation' },
    { value: 'restock', label: 'Restock' },
    { value: 'initial-stock', label: 'Initial stock' },
  ],
  transfer: [
    { value: 'event-prep', label: 'Event prep' },
    { value: 'desk-restock', label: 'Front desk restock' },
    { value: 'van-load', label: 'Vehicle loadout' },
    { value: 'room-setup', label: 'Room setup' },
  ],
  checkout: [
    { value: 'event-ops', label: 'Event operations' },
    { value: 'staff-loan', label: 'Staff loan' },
    { value: 'event-setup', label: 'Event setup' },
    { value: 'temporary-use', label: 'Temporary use' },
  ],
  return: [
    { value: 'post-event-return', label: 'Post-event return' },
    { value: 'staff-return', label: 'Staff return' },
    { value: 'stock-reconciliation', label: 'Stock reconciliation' },
  ],
  adjustment: [
    { value: 'count-correction', label: 'Count correction' },
    { value: 'damage-loss', label: 'Damage or loss' },
    { value: 'found-stock', label: 'Found stock' },
    { value: 'shrinkage', label: 'Shrinkage' },
  ],
} as const;

async function loadInventoryData(): Promise<InventoryDataBundle> {
  const serverSupabase = await createSupabaseServerClient();
  const readSupabase = createSupabaseAdminClient() ?? serverSupabase;

  if (!readSupabase) {
    return {
      enabled: false,
      errors: [],
      items: [],
      locations: [],
      stockLevels: [],
      assignments: [],
      transactions: [],
      transactionLines: [],
      profiles: [],
      events: [],
    };
  }

  const [
    itemsResult,
    locationsResult,
    stockLevelsResult,
    assignmentsResult,
    transactionsResult,
    transactionLinesResult,
    profilesResult,
    eventsResult,
  ] = await Promise.all([
    readSupabase
      .from('inventory_items')
      .select(
        'id, sku, name, description, category, unit, minimum_stock, is_checkoutable, default_location_id, is_active'
      )
      .eq('is_active', true)
      .order('category')
      .order('name'),
    readSupabase
      .from('inventory_locations')
      .select('id, name, code, location_type, is_active')
      .eq('is_active', true)
      .order('name'),
    readSupabase
      .from('inventory_stock_levels')
      .select('item_id, location_id, quantity_on_hand, minimum_stock_override'),
    readSupabase
      .from('inventory_assignments')
      .select(
        'id, item_id, source_location_id, quantity, status, assigned_to_profile_id, assigned_to_event_id, due_back_at, returned_at, notes, created_at'
      )
      .order('created_at', { ascending: false }),
    readSupabase
      .from('inventory_transactions')
      .select(
        'id, transaction_type, actor_profile_id, source_location_id, destination_location_id, related_profile_id, related_event_id, assignment_id, reason_code, notes, created_at'
      )
      .order('created_at', { ascending: false }),
    readSupabase.from('inventory_transaction_lines').select('transaction_id, item_id, quantity'),
    readSupabase.from('profiles').select('id, display_name, email').order('display_name'),
    readSupabase.from('events').select('id, title, starts_at, status').order('starts_at'),
  ]);

  const errors = [
    itemsResult.error ? 'Inventory items could not be loaded.' : null,
    locationsResult.error ? 'Inventory locations could not be loaded.' : null,
    stockLevelsResult.error ? 'Inventory stock levels could not be loaded.' : null,
    assignmentsResult.error ? 'Inventory assignments could not be loaded.' : null,
    transactionsResult.error ? 'Inventory transactions could not be loaded.' : null,
    transactionLinesResult.error ? 'Inventory transaction lines could not be loaded.' : null,
    profilesResult.error ? 'Profile assignees could not be loaded.' : null,
    eventsResult.error ? 'Events could not be loaded for checkout targets.' : null,
  ].filter(Boolean) as string[];

  return {
    enabled: true,
    errors,
    items: (itemsResult.data ?? []) as InventoryItemRecord[],
    locations: (locationsResult.data ?? []) as InventoryLocationRecord[],
    stockLevels: (stockLevelsResult.data ?? []) as InventoryStockLevelRecord[],
    assignments: (assignmentsResult.data ?? []) as InventoryAssignmentDetailsRecord[],
    transactions: (transactionsResult.data ?? []) as InventoryTransactionRecord[],
    transactionLines: (transactionLinesResult.data ?? []) as InventoryTransactionLineRecord[],
    profiles: (profilesResult.data ?? []) as InventoryProfileRecord[],
    events: (eventsResult.data ?? []) as InventoryEventRecord[],
  };
}

function formatDateTime(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  return new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}

function humanizeLabel(value: string) {
  return value
    .replace(/[_-]+/g, ' ')
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function toneClasses(tone: 'success' | 'error') {
  if (tone === 'success') {
    return 'border-emerald-200 bg-emerald-50/90 text-emerald-900';
  }

  return 'border-rose-200 bg-rose-50/90 text-rose-900';
}

function InventoryMetricCard({
  label,
  value,
  helper,
}: {
  label: string;
  value: string;
  helper: string;
}) {
  return (
    <article className="rounded-[24px] border border-camp-forest/10 bg-white/90 p-5 shadow-panel">
      <p className="text-xs uppercase tracking-[0.22em] text-camp-moss">{label}</p>
      <p className="mt-3 font-serif text-4xl text-camp-forest">{value}</p>
      <p className="mt-2 text-sm text-slate-600">{helper}</p>
    </article>
  );
}

function InventorySectionCard({
  title,
  eyebrow,
  description,
  children,
  className = '',
}: {
  title: string;
  eyebrow: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <article
      className={`rounded-[28px] border border-camp-forest/10 bg-white/85 p-6 shadow-panel ${className}`}
    >
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
  defaultValue,
  step,
  min,
}: {
  label: string;
  name: string;
  placeholder?: string;
  type?: string;
  required?: boolean;
  defaultValue?: string | number;
  step?: string;
  min?: string;
}) {
  return (
    <label className="grid gap-2 text-sm text-slate-700">
      <span className="font-medium text-camp-forest">{label}</span>
      <input
        type={type}
        name={name}
        required={required}
        defaultValue={defaultValue}
        placeholder={placeholder}
        step={step}
        min={min}
        className="rounded-2xl border border-camp-forest/10 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-camp-moss focus:ring-2 focus:ring-camp-sky/60"
      />
    </label>
  );
}

function InventoryTextArea({
  label,
  name,
  placeholder,
}: {
  label: string;
  name: string;
  placeholder?: string;
}) {
  return (
    <label className="grid gap-2 text-sm text-slate-700">
      <span className="font-medium text-camp-forest">{label}</span>
      <textarea
        name={name}
        rows={3}
        placeholder={placeholder}
        className="rounded-2xl border border-camp-forest/10 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-camp-moss focus:ring-2 focus:ring-camp-sky/60"
      />
    </label>
  );
}

function InventorySelectField({
  label,
  name,
  required = false,
  defaultValue,
  children,
}: {
  label: string;
  name: string;
  required?: boolean;
  defaultValue?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="grid gap-2 text-sm text-slate-700">
      <span className="font-medium text-camp-forest">{label}</span>
      <select
        name={name}
        required={required}
        defaultValue={defaultValue}
        className="rounded-2xl border border-camp-forest/10 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-camp-moss focus:ring-2 focus:ring-camp-sky/60"
      >
        {children}
      </select>
    </label>
  );
}

function InventorySubmitButton({
  children,
  disabled = false,
}: {
  children: React.ReactNode;
  disabled?: boolean;
}) {
  return (
    <button
      type="submit"
      disabled={disabled}
      className="inline-flex items-center justify-center rounded-full bg-camp-forest px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-camp-forest/90 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-600"
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
  const itemSummaries = buildInventoryItemSummaries({
    items: inventoryData.items,
    locations: inventoryData.locations,
    stockLevels: inventoryData.stockLevels,
    assignments: inventoryData.assignments,
  });
  const locationSummaries = buildInventoryLocationSummaries({
    locations: inventoryData.locations,
    stockLevels: inventoryData.stockLevels,
    assignments: inventoryData.assignments,
  }).sort(
    (left, right) => right.totalUnits - left.totalUnits || left.name.localeCompare(right.name)
  );
  const filteredItems = filterInventorySummaries(itemSummaries, {
    query: params.query,
    locationId: params.location,
    lowStockOnly: params.lowStock === '1',
  }).sort((left, right) => {
    if (left.lowStock !== right.lowStock) {
      return left.lowStock ? -1 : 1;
    }

    return left.category.localeCompare(right.category) || left.name.localeCompare(right.name);
  });
  const metrics = buildInventoryOverviewMetrics({
    items: itemSummaries,
    locations: inventoryData.locations,
    assignments: inventoryData.assignments,
    transactions: inventoryData.transactions,
  });
  const assignmentViews = buildInventoryAssignmentViews({
    assignments: inventoryData.assignments,
    items: inventoryData.items,
    locations: inventoryData.locations,
    profiles: inventoryData.profiles,
    events: inventoryData.events,
  });
  const transactionViews = buildInventoryTransactionViews({
    transactions: inventoryData.transactions,
    lines: inventoryData.transactionLines,
    items: inventoryData.items,
    locations: inventoryData.locations,
    profiles: inventoryData.profiles,
    events: inventoryData.events,
  }).slice(0, 10);
  const lowStockItems = itemSummaries
    .filter((item) => item.lowStock)
    .sort(
      (left, right) =>
        left.lowStockLocations - right.lowStockLocations || left.name.localeCompare(right.name)
    )
    .slice(0, 5);
  const inventoryEnabled = inventoryData.enabled;
  const canCreateItems = inventoryEnabled && inventoryData.locations.length > 0;
  const canRunTransactions =
    inventoryEnabled && inventoryData.items.length > 0 && inventoryData.locations.length > 0;
  const activeAssignments = inventoryData.assignments.filter(
    (assignment) => assignment.status === 'active'
  );

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

        {!inventoryEnabled ? (
          <InventorySectionCard
            title="Connect Supabase to run inventory"
            eyebrow="Unavailable"
            description="The inventory workspace is built, but it needs Supabase environment variables before it can load catalog data or accept stock movements."
          >
            <div className="rounded-[22px] border border-camp-forest/10 bg-camp-sand/35 p-5 text-sm text-slate-700">
              Add the project Supabase URL and anon key to enable the inventory dashboard, then use
              the service role key as well if you want full assignee and audit visibility from the
              server.
            </div>
          </InventorySectionCard>
        ) : (
          <>
            {inventoryData.errors.length > 0 ? (
              <InventorySectionCard
                title="Some inventory data could not be loaded"
                eyebrow="Partial data"
                className="border-rose-200 bg-rose-50/80"
              >
                <ul className="grid gap-2 text-sm text-rose-900">
                  {inventoryData.errors.map((error) => (
                    <li key={error}>{error}</li>
                  ))}
                </ul>
              </InventorySectionCard>
            ) : null}

            <section className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
              <InventorySectionCard
                title="Operational stock control"
                eyebrow="Overview"
                description="Track the live catalog, keep custody visible, and move equipment or consumables without losing the audit trail."
              >
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  <InventoryMetricCard
                    label="Catalog items"
                    value={String(metrics.totalItems)}
                    helper="Active inventory records available to move or count."
                  />
                  <InventoryMetricCard
                    label="Low stock"
                    value={String(metrics.lowStockItems)}
                    helper="Items at or below their thresholds across any location."
                  />
                  <InventoryMetricCard
                    label="Active checkouts"
                    value={String(metrics.activeAssignments)}
                    helper={`${metrics.checkedOutUnits} units are currently assigned out.`}
                  />
                  <InventoryMetricCard
                    label="Locations"
                    value={String(metrics.totalLocations)}
                    helper="Storage rooms, desks, vehicles, and staging zones."
                  />
                  <InventoryMetricCard
                    label="Movements"
                    value={String(metrics.totalTransactions)}
                    helper="Receive, transfer, checkout, return, and adjustment history."
                  />
                  <InventoryMetricCard
                    label="Filtered items"
                    value={String(filteredItems.length)}
                    helper="Current result count after search and low-stock filters."
                  />
                </div>
              </InventorySectionCard>

              <InventorySectionCard
                title="Stock watchlist"
                eyebrow="Alerts"
                description="Low-stock items are surfaced first so restocking and event prep can stay ahead of shortages."
                className="bg-[linear-gradient(180deg,rgba(244,235,204,0.78),rgba(255,255,255,0.88))]"
              >
                {lowStockItems.length === 0 ? (
                  <div className="rounded-[22px] border border-camp-forest/10 bg-white/75 p-5 text-sm text-slate-600">
                    No active low-stock alerts right now. Threshold coverage is healthy.
                  </div>
                ) : (
                  <div className="grid gap-3">
                    {lowStockItems.map((item) => (
                      <article
                        key={item.id}
                        className="rounded-[22px] border border-amber-300/70 bg-white/85 p-4"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <p className="font-semibold text-camp-forest">{item.name}</p>
                            <p className="mt-1 text-sm text-slate-600">
                              {item.sku} · {item.category}
                            </p>
                          </div>
                          <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-amber-900">
                            Low stock
                          </span>
                        </div>
                        <p className="mt-3 text-sm text-slate-700">
                          {item.lowStockLocations > 0
                            ? `${item.lowStockLocations} location${item.lowStockLocations === 1 ? '' : 's'} at or below threshold.`
                            : 'Total on-hand is below the default minimum threshold.'}
                        </p>
                        <p className="mt-1 text-sm text-slate-700">
                          On hand: {item.totalOnHand} {item.unit} · Minimum: {item.minimumStock}{' '}
                          {item.unit}
                        </p>
                      </article>
                    ))}
                  </div>
                )}
              </InventorySectionCard>
            </section>

            <section className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
              <InventorySectionCard
                title="Catalog and location coverage"
                eyebrow="Browse"
                description="Search the catalog, narrow by location, and inspect each item's stock split across rooms, desks, vehicles, and event staging."
              >
                <form className="grid gap-4 rounded-[24px] border border-camp-forest/10 bg-camp-sand/35 p-4 md:grid-cols-[1.2fr_0.8fr_auto_auto]">
                  <InventoryTextField
                    label="Search"
                    name="query"
                    defaultValue={params.query ?? ''}
                    placeholder="Item name, SKU, or category"
                  />
                  <InventorySelectField
                    label="Location"
                    name="location"
                    defaultValue={params.location ?? ''}
                  >
                    <option value="">All locations</option>
                    {inventoryData.locations.map((location) => (
                      <option key={location.id} value={location.id}>
                        {location.name}
                      </option>
                    ))}
                  </InventorySelectField>
                  <label className="flex items-end gap-3 rounded-2xl border border-camp-forest/10 bg-white px-4 py-3 text-sm text-slate-700">
                    <input
                      type="checkbox"
                      name="lowStock"
                      value="1"
                      defaultChecked={params.lowStock === '1'}
                      className="mt-1 h-4 w-4 rounded border-camp-forest/20 text-camp-forest focus:ring-camp-sky"
                    />
                    <span className="font-medium text-camp-forest">Low stock only</span>
                  </label>
                  <div className="flex items-end gap-3">
                    <InventorySubmitButton>Apply filters</InventorySubmitButton>
                    <Link
                      href="/inventory"
                      className="inline-flex items-center justify-center rounded-full border border-camp-forest/15 px-4 py-2.5 text-sm font-semibold text-camp-forest transition hover:bg-camp-sand/35"
                    >
                      Clear
                    </Link>
                  </div>
                </form>

                <div className="mt-5 grid gap-4">
                  {filteredItems.length === 0 ? (
                    <div className="rounded-[24px] border border-dashed border-camp-forest/20 bg-white/70 p-6 text-sm text-slate-600">
                      No inventory items match the current filters.
                    </div>
                  ) : (
                    filteredItems.map((item) => (
                      <article
                        key={item.id}
                        className="rounded-[24px] border border-camp-forest/10 bg-white p-5"
                      >
                        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <h4 className="font-semibold text-camp-forest">{item.name}</h4>
                              <span className="rounded-full bg-camp-sky/70 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-camp-forest">
                                {item.sku}
                              </span>
                              {item.lowStock ? (
                                <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-amber-900">
                                  Needs attention
                                </span>
                              ) : null}
                              {item.isCheckoutable ? (
                                <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-emerald-900">
                                  Checkoutable
                                </span>
                              ) : null}
                            </div>
                            <p className="mt-2 text-sm text-slate-600">
                              {item.category} · On hand {item.totalOnHand} {item.unit}
                              {item.checkedOutQuantity > 0
                                ? ` · Checked out ${item.checkedOutQuantity} ${item.unit}`
                                : ''}
                            </p>
                            {item.description ? (
                              <p className="mt-2 text-sm text-slate-700">{item.description}</p>
                            ) : null}
                          </div>
                          <div className="rounded-[22px] bg-camp-sand/35 px-4 py-3 text-sm text-slate-700">
                            <p>
                              Minimum: <span className="font-semibold">{item.minimumStock}</span>{' '}
                              {item.unit}
                            </p>
                            <p className="mt-1">
                              Default location:{' '}
                              <span className="font-semibold">
                                {item.defaultLocationName ?? 'Not set'}
                              </span>
                            </p>
                          </div>
                        </div>

                        <div className="mt-4 grid gap-3 md:grid-cols-2">
                          {item.stockByLocation.length === 0 ? (
                            <div className="rounded-[20px] border border-dashed border-camp-forest/20 bg-white/80 p-4 text-sm text-slate-600 md:col-span-2">
                              No stock has been received for this item yet.
                            </div>
                          ) : (
                            item.stockByLocation.map((location) => (
                              <div
                                key={`${item.id}-${location.locationId}`}
                                className={`rounded-[20px] border p-4 text-sm ${
                                  location.lowStock
                                    ? 'border-amber-300 bg-amber-50/80'
                                    : 'border-camp-forest/10 bg-camp-sand/20'
                                }`}
                              >
                                <div className="flex items-center justify-between gap-3">
                                  <p className="font-semibold text-camp-forest">
                                    {location.locationName}
                                  </p>
                                  <p className="text-slate-700">
                                    {location.quantityOnHand} {item.unit}
                                  </p>
                                </div>
                                <p className="mt-2 text-slate-600">
                                  Threshold {location.threshold} {item.unit}
                                </p>
                              </div>
                            ))
                          )}
                        </div>
                      </article>
                    ))
                  )}
                </div>
              </InventorySectionCard>

              <InventorySectionCard
                title="Location summaries"
                eyebrow="Footprint"
                description="See which spaces are carrying the most stock and where checked-out gear originated."
              >
                <div className="grid gap-3">
                  {locationSummaries.length === 0 ? (
                    <div className="rounded-[22px] border border-dashed border-camp-forest/20 bg-white/75 p-5 text-sm text-slate-600">
                      No locations have been set up yet.
                    </div>
                  ) : (
                    locationSummaries.map((location) => (
                      <article
                        key={location.id}
                        className="rounded-[22px] border border-camp-forest/10 bg-white px-4 py-4"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="font-semibold text-camp-forest">{location.name}</p>
                            <p className="mt-1 text-sm text-slate-600">
                              {location.code} · {humanizeLabel(location.locationType)}
                            </p>
                          </div>
                          <span className="rounded-full bg-camp-sky/65 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-camp-forest">
                            {location.totalUnits} units
                          </span>
                        </div>
                        <dl className="mt-4 grid gap-2 text-sm text-slate-700 sm:grid-cols-3">
                          <div>
                            <dt className="text-xs uppercase tracking-[0.16em] text-camp-moss">
                              Tracked items
                            </dt>
                            <dd className="mt-1 font-semibold">{location.trackedItems}</dd>
                          </div>
                          <div>
                            <dt className="text-xs uppercase tracking-[0.16em] text-camp-moss">
                              Active checkouts
                            </dt>
                            <dd className="mt-1 font-semibold">{location.activeAssignments}</dd>
                          </div>
                          <div>
                            <dt className="text-xs uppercase tracking-[0.16em] text-camp-moss">
                              Type
                            </dt>
                            <dd className="mt-1 font-semibold">
                              {humanizeLabel(location.locationType)}
                            </dd>
                          </div>
                        </dl>
                      </article>
                    ))
                  )}
                </div>
              </InventorySectionCard>
            </section>

            <section className="grid gap-6 xl:grid-cols-2">
              <InventorySectionCard
                title="Active custody"
                eyebrow="Checkouts"
                description="Keep a live list of gear and supplies that are out with a person or event before they are returned."
              >
                <div className="grid gap-3">
                  {assignmentViews.length === 0 ? (
                    <div className="rounded-[22px] border border-dashed border-camp-forest/20 bg-white/75 p-5 text-sm text-slate-600">
                      Nothing is checked out right now.
                    </div>
                  ) : (
                    assignmentViews.map((assignment) => (
                      <article
                        key={assignment.id}
                        className={`rounded-[22px] border p-4 ${
                          assignment.isOverdue
                            ? 'border-rose-200 bg-rose-50/85'
                            : 'border-camp-forest/10 bg-white'
                        }`}
                      >
                        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="font-semibold text-camp-forest">
                                {assignment.itemName}
                              </p>
                              <span className="rounded-full bg-camp-sky/65 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-camp-forest">
                                {assignment.itemSku}
                              </span>
                              <span className="rounded-full bg-camp-sand/70 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-camp-forest">
                                {assignment.assigneeType === 'profile' ? 'Person' : 'Event'}
                              </span>
                            </div>
                            <p className="mt-2 text-sm text-slate-700">
                              {assignment.quantityLabel} from {assignment.sourceLocationName}
                            </p>
                            <p className="mt-1 text-sm text-slate-600">
                              Assigned to {assignment.assigneeLabel}
                            </p>
                            {assignment.notes ? (
                              <p className="mt-2 text-sm text-slate-600">{assignment.notes}</p>
                            ) : null}
                          </div>
                          <div className="rounded-[20px] bg-white/80 px-4 py-3 text-sm text-slate-700">
                            <p className="font-semibold text-camp-forest">
                              {assignment.dueBackAt
                                ? `Due ${formatDateTime(assignment.dueBackAt)}`
                                : 'No due-back set'}
                            </p>
                            <p className="mt-1">
                              {assignment.isOverdue
                                ? 'This assignment is overdue.'
                                : 'Custody is active.'}
                            </p>
                          </div>
                        </div>
                      </article>
                    ))
                  )}
                </div>
              </InventorySectionCard>

              <InventorySectionCard
                title="Recent movement"
                eyebrow="Audit"
                description="Every receive, transfer, checkout, return, and adjustment stays visible so stock changes remain reviewable."
              >
                <div className="grid gap-3">
                  {transactionViews.length === 0 ? (
                    <div className="rounded-[22px] border border-dashed border-camp-forest/20 bg-white/75 p-5 text-sm text-slate-600">
                      No movement history has been recorded yet.
                    </div>
                  ) : (
                    transactionViews.map((transaction) => (
                      <article
                        key={transaction.id}
                        className="rounded-[22px] border border-camp-forest/10 bg-white px-4 py-4"
                      >
                        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="font-semibold text-camp-forest">
                                {transaction.transactionType}
                              </p>
                              <span className="rounded-full bg-camp-sand/70 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-camp-forest">
                                {transaction.reasonLabel}
                              </span>
                            </div>
                            <p className="mt-2 text-sm text-slate-700">
                              {transaction.itemLabel} · {transaction.quantityLabel}
                            </p>
                            <p className="mt-1 text-sm text-slate-600">
                              Actor {transaction.actorName}
                              {transaction.relatedLabel
                                ? ` · Related ${transaction.relatedLabel}`
                                : ''}
                            </p>
                            <p className="mt-1 text-sm text-slate-600">
                              {transaction.sourceLocationName ?? 'No source'}
                              {' -> '}
                              {transaction.destinationLocationName ?? 'No destination'}
                            </p>
                            {transaction.notes ? (
                              <p className="mt-2 text-sm text-slate-600">{transaction.notes}</p>
                            ) : null}
                          </div>
                          <div className="text-sm text-slate-600">
                            {formatDateTime(transaction.createdAt) ?? 'Unknown time'}
                          </div>
                        </div>
                      </article>
                    ))
                  )}
                </div>
              </InventorySectionCard>
            </section>

            <InventorySectionCard
              title="Action center"
              eyebrow="Create and move stock"
              description="This is the daily operations desk for setting up new inventory records, receiving deliveries, moving stock, checking equipment out, and returning it cleanly."
            >
              <div className="grid gap-5 xl:grid-cols-3">
                <form
                  action={createInventoryItem}
                  className="bg-camp-sand/28 grid gap-4 rounded-[24px] border border-camp-forest/10 p-5"
                >
                  <div>
                    <h4 className="font-semibold text-camp-forest">Add item</h4>
                    <p className="mt-1 text-sm text-slate-600">
                      Create a new catalog record and set its default stock threshold.
                    </p>
                  </div>
                  <InventoryTextField label="Item name" name="name" required />
                  <InventoryTextField label="SKU" name="sku" required />
                  <InventoryTextField label="Category" name="category" required />
                  <div className="grid gap-4 md:grid-cols-2">
                    <InventoryTextField label="Unit" name="unit" placeholder="each" />
                    <InventoryTextField
                      label="Minimum stock"
                      name="minimumStock"
                      type="number"
                      min="0"
                      step="0.01"
                    />
                  </div>
                  <InventorySelectField label="Default location" name="defaultLocationId">
                    <option value="">No default</option>
                    {inventoryData.locations.map((location) => (
                      <option key={location.id} value={location.id}>
                        {location.name}
                      </option>
                    ))}
                  </InventorySelectField>
                  <label className="flex items-center gap-3 rounded-2xl border border-camp-forest/10 bg-white px-4 py-3 text-sm text-slate-700">
                    <input
                      type="checkbox"
                      name="isCheckoutable"
                      defaultChecked
                      className="h-4 w-4 rounded border-camp-forest/20 text-camp-forest focus:ring-camp-sky"
                    />
                    <span className="font-medium text-camp-forest">Allow check-out</span>
                  </label>
                  <InventoryTextArea
                    label="Description"
                    name="description"
                    placeholder="Useful handling, storage, or usage notes"
                  />
                  <InventorySubmitButton disabled={!canCreateItems}>
                    Save item
                  </InventorySubmitButton>
                </form>

                <form
                  action={createInventoryLocation}
                  className="bg-camp-sky/22 grid gap-4 rounded-[24px] border border-camp-forest/10 p-5"
                >
                  <div>
                    <h4 className="font-semibold text-camp-forest">Add location</h4>
                    <p className="mt-1 text-sm text-slate-600">
                      Set up storage, desks, vehicles, rooms, or temporary staging points.
                    </p>
                  </div>
                  <InventoryTextField label="Location name" name="name" required />
                  <InventoryTextField label="Code" name="code" required placeholder="MAIN" />
                  <InventorySelectField
                    label="Location type"
                    name="locationType"
                    required
                    defaultValue="storage"
                  >
                    {inventoryLocationTypes.map((locationType) => (
                      <option key={locationType} value={locationType}>
                        {locationTypeLabels[locationType]}
                      </option>
                    ))}
                  </InventorySelectField>
                  <div className="rounded-[20px] bg-white/75 p-4 text-sm text-slate-700">
                    Event-linked staging areas can be created as normal locations now and named
                    after the event for operational clarity.
                  </div>
                  <InventorySubmitButton disabled={!inventoryEnabled}>
                    Save location
                  </InventorySubmitButton>
                </form>

                <form
                  action={submitInventoryTransaction}
                  className="grid gap-4 rounded-[24px] border border-camp-forest/10 bg-white p-5"
                >
                  <input type="hidden" name="transactionType" value="receive" />
                  <div>
                    <h4 className="font-semibold text-camp-forest">Receive stock</h4>
                    <p className="mt-1 text-sm text-slate-600">
                      Add new stock into a destination location after delivery or restock.
                    </p>
                  </div>
                  <InventorySelectField label="Item" name="itemId" required>
                    <option value="">Choose item</option>
                    {inventoryData.items.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name} ({item.sku})
                      </option>
                    ))}
                  </InventorySelectField>
                  <InventorySelectField label="Destination" name="destinationLocationId" required>
                    <option value="">Choose location</option>
                    {inventoryData.locations.map((location) => (
                      <option key={location.id} value={location.id}>
                        {location.name}
                      </option>
                    ))}
                  </InventorySelectField>
                  <InventoryTextField
                    label="Quantity"
                    name="quantity"
                    type="number"
                    required
                    min="0.01"
                    step="0.01"
                  />
                  <InventorySelectField
                    label="Reason"
                    name="reasonCode"
                    required
                    defaultValue="restock"
                  >
                    {transactionReasonOptions.receive.map((reason) => (
                      <option key={reason.value} value={reason.value}>
                        {reason.label}
                      </option>
                    ))}
                  </InventorySelectField>
                  <InventoryTextArea
                    label="Notes"
                    name="notes"
                    placeholder="Supplier, batch, or delivery context"
                  />
                  <InventorySubmitButton disabled={!canRunTransactions}>
                    Receive stock
                  </InventorySubmitButton>
                </form>

                <form
                  action={submitInventoryTransaction}
                  className="grid gap-4 rounded-[24px] border border-camp-forest/10 bg-white p-5"
                >
                  <input type="hidden" name="transactionType" value="transfer" />
                  <div>
                    <h4 className="font-semibold text-camp-forest">Transfer stock</h4>
                    <p className="mt-1 text-sm text-slate-600">
                      Rebalance inventory between storage, staging, vehicles, or rooms.
                    </p>
                  </div>
                  <InventorySelectField label="Item" name="itemId" required>
                    <option value="">Choose item</option>
                    {inventoryData.items.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name} ({item.sku})
                      </option>
                    ))}
                  </InventorySelectField>
                  <div className="grid gap-4 md:grid-cols-2">
                    <InventorySelectField label="Source" name="sourceLocationId" required>
                      <option value="">Choose source</option>
                      {inventoryData.locations.map((location) => (
                        <option key={location.id} value={location.id}>
                          {location.name}
                        </option>
                      ))}
                    </InventorySelectField>
                    <InventorySelectField label="Destination" name="destinationLocationId" required>
                      <option value="">Choose destination</option>
                      {inventoryData.locations.map((location) => (
                        <option key={location.id} value={location.id}>
                          {location.name}
                        </option>
                      ))}
                    </InventorySelectField>
                  </div>
                  <InventoryTextField
                    label="Quantity"
                    name="quantity"
                    type="number"
                    required
                    min="0.01"
                    step="0.01"
                  />
                  <InventorySelectField
                    label="Reason"
                    name="reasonCode"
                    required
                    defaultValue="event-prep"
                  >
                    {transactionReasonOptions.transfer.map((reason) => (
                      <option key={reason.value} value={reason.value}>
                        {reason.label}
                      </option>
                    ))}
                  </InventorySelectField>
                  <InventoryTextArea
                    label="Notes"
                    name="notes"
                    placeholder="Why this stock is moving now"
                  />
                  <InventorySubmitButton disabled={!canRunTransactions}>
                    Transfer stock
                  </InventorySubmitButton>
                </form>

                <form
                  action={submitInventoryTransaction}
                  className="grid gap-4 rounded-[24px] border border-camp-forest/10 bg-white p-5"
                >
                  <input type="hidden" name="transactionType" value="checkout" />
                  <div>
                    <h4 className="font-semibold text-camp-forest">Check out inventory</h4>
                    <p className="mt-1 text-sm text-slate-600">
                      Assign gear or supplies to one person or one event at a time.
                    </p>
                  </div>
                  <InventorySelectField label="Item" name="itemId" required>
                    <option value="">Choose item</option>
                    {inventoryData.items
                      .filter((item) => item.is_checkoutable)
                      .map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.name} ({item.sku})
                        </option>
                      ))}
                  </InventorySelectField>
                  <InventorySelectField label="Source location" name="sourceLocationId" required>
                    <option value="">Choose source</option>
                    {inventoryData.locations.map((location) => (
                      <option key={location.id} value={location.id}>
                        {location.name}
                      </option>
                    ))}
                  </InventorySelectField>
                  <InventoryTextField
                    label="Quantity"
                    name="quantity"
                    type="number"
                    required
                    min="0.01"
                    step="0.01"
                  />
                  <div className="grid gap-4 md:grid-cols-2">
                    <InventorySelectField label="Assign to person" name="assignedToProfileId">
                      <option value="">No person selected</option>
                      {inventoryData.profiles.map((profile) => (
                        <option key={profile.id} value={profile.id}>
                          {profile.display_name ?? profile.email ?? 'Unknown person'}
                        </option>
                      ))}
                    </InventorySelectField>
                    <InventorySelectField label="Assign to event" name="assignedToEventId">
                      <option value="">No event selected</option>
                      {inventoryData.events.map((event) => (
                        <option key={event.id} value={event.id}>
                          {event.title ?? 'Untitled event'}
                        </option>
                      ))}
                    </InventorySelectField>
                  </div>
                  <InventoryTextField label="Due back" name="dueBackAt" type="datetime-local" />
                  <InventorySelectField
                    label="Reason"
                    name="reasonCode"
                    required
                    defaultValue="event-ops"
                  >
                    {transactionReasonOptions.checkout.map((reason) => (
                      <option key={reason.value} value={reason.value}>
                        {reason.label}
                      </option>
                    ))}
                  </InventorySelectField>
                  <div className="bg-camp-sand/28 rounded-[20px] p-4 text-sm text-slate-700">
                    Choose either a person or an event, not both.
                  </div>
                  <InventoryTextArea
                    label="Notes"
                    name="notes"
                    placeholder="Handoff context or expected usage"
                  />
                  <InventorySubmitButton
                    disabled={
                      !canRunTransactions ||
                      inventoryData.items.every((item) => !item.is_checkoutable)
                    }
                  >
                    Check out
                  </InventorySubmitButton>
                </form>

                <form
                  action={submitInventoryTransaction}
                  className="grid gap-4 rounded-[24px] border border-camp-forest/10 bg-white p-5"
                >
                  <input type="hidden" name="transactionType" value="return" />
                  <div>
                    <h4 className="font-semibold text-camp-forest">Return stock</h4>
                    <p className="mt-1 text-sm text-slate-600">
                      Close an active assignment and send the stock back into a location.
                    </p>
                  </div>
                  <InventorySelectField label="Active assignment" name="assignmentId" required>
                    <option value="">Choose assignment</option>
                    {assignmentViews.map((assignment) => (
                      <option key={assignment.id} value={assignment.id}>
                        {`${assignment.itemName} -> ${assignment.assigneeLabel}`}
                      </option>
                    ))}
                  </InventorySelectField>
                  <InventorySelectField
                    label="Return location"
                    name="destinationLocationId"
                    required
                  >
                    <option value="">Choose location</option>
                    {inventoryData.locations.map((location) => (
                      <option key={location.id} value={location.id}>
                        {location.name}
                      </option>
                    ))}
                  </InventorySelectField>
                  <InventorySelectField
                    label="Reason"
                    name="reasonCode"
                    required
                    defaultValue="staff-return"
                  >
                    {transactionReasonOptions.return.map((reason) => (
                      <option key={reason.value} value={reason.value}>
                        {reason.label}
                      </option>
                    ))}
                  </InventorySelectField>
                  <InventoryTextArea
                    label="Notes"
                    name="notes"
                    placeholder="Condition notes or return context"
                  />
                  <InventorySubmitButton
                    disabled={!inventoryEnabled || activeAssignments.length === 0}
                  >
                    Return stock
                  </InventorySubmitButton>
                </form>

                <form
                  action={submitInventoryTransaction}
                  className="grid gap-4 rounded-[24px] border border-camp-forest/10 bg-white p-5 xl:col-span-3"
                >
                  <input type="hidden" name="transactionType" value="adjustment" />
                  <div className="max-w-3xl">
                    <h4 className="font-semibold text-camp-forest">Adjust stock count</h4>
                    <p className="mt-1 text-sm text-slate-600">
                      Use a positive number to add discovered stock and a negative number to remove
                      loss, damage, or count corrections.
                    </p>
                  </div>
                  <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                    <InventorySelectField label="Item" name="itemId" required>
                      <option value="">Choose item</option>
                      {inventoryData.items.map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.name} ({item.sku})
                        </option>
                      ))}
                    </InventorySelectField>
                    <InventorySelectField label="Location" name="sourceLocationId" required>
                      <option value="">Choose location</option>
                      {inventoryData.locations.map((location) => (
                        <option key={location.id} value={location.id}>
                          {location.name}
                        </option>
                      ))}
                    </InventorySelectField>
                    <InventoryTextField
                      label="Adjustment quantity"
                      name="quantity"
                      type="number"
                      required
                      step="0.01"
                    />
                    <InventorySelectField
                      label="Reason"
                      name="reasonCode"
                      required
                      defaultValue="count-correction"
                    >
                      {transactionReasonOptions.adjustment.map((reason) => (
                        <option key={reason.value} value={reason.value}>
                          {reason.label}
                        </option>
                      ))}
                    </InventorySelectField>
                  </div>
                  <InventoryTextArea
                    label="Notes"
                    name="notes"
                    placeholder="Explain what changed in the physical count"
                  />
                  <InventorySubmitButton disabled={!canRunTransactions}>
                    Apply adjustment
                  </InventorySubmitButton>
                </form>
              </div>
            </InventorySectionCard>
          </>
        )}
      </div>
    </AppShell>
  );
}
