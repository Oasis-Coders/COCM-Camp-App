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

function InventoryDisclosure({
  title,
  helper,
  badge,
  defaultOpen = false,
  children,
}: {
  title: string;
  helper: string;
  badge?: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  return (
    <details
      open={defaultOpen}
      className="group rounded-[24px] border border-camp-forest/10 bg-white/90 shadow-sm"
    >
      <summary className="flex cursor-pointer list-none items-start justify-between gap-4 px-5 py-4">
        <div>
          <p className="font-semibold text-camp-forest">{title}</p>
          <p className="mt-1 text-sm text-slate-600">{helper}</p>
        </div>
        <div className="flex items-center gap-2">
          {badge ? (
            <span className="rounded-full bg-camp-sand/70 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-camp-forest">
              {badge}
            </span>
          ) : null}
          <span className="rounded-full border border-camp-forest/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-camp-moss">
            Open
          </span>
        </div>
      </summary>
      <div className="border-t border-camp-forest/10 px-5 py-5">{children}</div>
    </details>
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
  const canCreateItems = inventoryEnabled;
  const canRunTransactions =
    inventoryEnabled && inventoryData.items.length > 0 && inventoryData.locations.length > 0;
  const activeAssignments = inventoryData.assignments.filter(
    (assignment) => assignment.status === 'active'
  );
  const overdueAssignments = assignmentViews
    .filter((assignment) => assignment.isOverdue)
    .slice(0, 3);
  const visibleAssignments = assignmentViews.slice(0, 5);
  const catalogPreview = filteredItems.slice(0, 8);
  const locationPreview = locationSummaries.slice(0, 6);
  const recentTransactionsPreview = transactionViews.slice(0, 6);

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

            <section className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
              <InventorySectionCard
                title="Simple workflow"
                eyebrow="Start here"
                description="Most days the inventory team only needs three things: add stock, move or loan it out, and keep an eye on shortages."
              >
                <div className="grid gap-4 md:grid-cols-3">
                  <article className="rounded-[22px] border border-camp-forest/10 bg-camp-sand/25 p-4">
                    <p className="text-xs uppercase tracking-[0.18em] text-camp-moss">Step 1</p>
                    <h4 className="mt-2 font-semibold text-camp-forest">Receive or move stock</h4>
                    <p className="mt-2 text-sm text-slate-600">
                      Add deliveries into a location, or transfer stock where the event team needs
                      it.
                    </p>
                  </article>
                  <article className="rounded-[22px] border border-camp-forest/10 bg-camp-sky/20 p-4">
                    <p className="text-xs uppercase tracking-[0.18em] text-camp-moss">Step 2</p>
                    <h4 className="mt-2 font-semibold text-camp-forest">
                      Check out and return gear
                    </h4>
                    <p className="mt-2 text-sm text-slate-600">
                      Keep custody clear whenever radios, cords, or supplies leave a storage point.
                    </p>
                  </article>
                  <article className="rounded-[22px] border border-camp-forest/10 bg-white p-4">
                    <p className="text-xs uppercase tracking-[0.18em] text-camp-moss">Step 3</p>
                    <h4 className="mt-2 font-semibold text-camp-forest">Review the live queue</h4>
                    <p className="mt-2 text-sm text-slate-600">
                      Shortages and current check-outs are surfaced below so nothing gets missed.
                    </p>
                  </article>
                </div>

                <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                  <InventoryMetricCard
                    label="Items"
                    value={String(metrics.totalItems)}
                    helper="Active catalog records."
                  />
                  <InventoryMetricCard
                    label="Low stock"
                    value={String(metrics.lowStockItems)}
                    helper="Items needing attention."
                  />
                  <InventoryMetricCard
                    label="Checked out"
                    value={String(metrics.activeAssignments)}
                    helper={`${metrics.checkedOutUnits} units currently out.`}
                  />
                  <InventoryMetricCard
                    label="Locations"
                    value={String(metrics.totalLocations)}
                    helper="Places where stock lives."
                  />
                </div>
              </InventorySectionCard>

              <InventorySectionCard
                title="Live queue"
                eyebrow="What needs attention"
                description="This is the quickest way to see shortages and gear currently out in the field."
                className="bg-[linear-gradient(180deg,rgba(244,235,204,0.7),rgba(255,255,255,0.88))]"
              >
                <div className="grid gap-5">
                  {overdueAssignments.length > 0 ? (
                    <div className="rounded-[22px] border border-rose-200 bg-rose-50/90 p-4">
                      <p className="font-semibold text-rose-900">Overdue returns</p>
                      <div className="mt-3 grid gap-2">
                        {overdueAssignments.map((assignment) => (
                          <div
                            key={assignment.id}
                            className="rounded-[18px] bg-white/80 px-4 py-3 text-sm text-slate-700"
                          >
                            <p className="font-semibold text-camp-forest">{assignment.itemName}</p>
                            <p className="mt-1">
                              {assignment.assigneeLabel} · due{' '}
                              {formatDateTime(assignment.dueBackAt)}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null}

                  <div>
                    <div className="flex items-center justify-between gap-3">
                      <h4 className="font-semibold text-camp-forest">Low-stock items</h4>
                      <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-camp-forest">
                        {metrics.lowStockItems}
                      </span>
                    </div>
                    {lowStockItems.length === 0 ? (
                      <div className="mt-3 rounded-[20px] border border-camp-forest/10 bg-white/80 p-4 text-sm text-slate-600">
                        No shortages right now.
                      </div>
                    ) : (
                      <div className="mt-3 grid gap-3">
                        {lowStockItems.map((item) => (
                          <article
                            key={item.id}
                            className="rounded-[20px] border border-amber-300/70 bg-white/85 p-4"
                          >
                            <div className="flex items-center justify-between gap-3">
                              <p className="font-semibold text-camp-forest">{item.name}</p>
                              <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-amber-900">
                                Low
                              </span>
                            </div>
                            <p className="mt-2 text-sm text-slate-700">
                              {item.totalOnHand} {item.unit} on hand · minimum {item.minimumStock}{' '}
                              {item.unit}
                            </p>
                          </article>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="border-t border-camp-forest/10 pt-5">
                    <div className="flex items-center justify-between gap-3">
                      <h4 className="font-semibold text-camp-forest">Checked out now</h4>
                      <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-camp-forest">
                        {metrics.activeAssignments}
                      </span>
                    </div>
                    {visibleAssignments.length === 0 ? (
                      <div className="mt-3 rounded-[20px] border border-camp-forest/10 bg-white/80 p-4 text-sm text-slate-600">
                        Nothing is currently checked out.
                      </div>
                    ) : (
                      <div className="mt-3 grid gap-3">
                        {visibleAssignments.map((assignment) => (
                          <article
                            key={assignment.id}
                            className={`rounded-[20px] border p-4 ${
                              assignment.isOverdue
                                ? 'border-rose-200 bg-rose-50/85'
                                : 'border-camp-forest/10 bg-white/85'
                            }`}
                          >
                            <div className="flex items-start justify-between gap-4">
                              <div>
                                <p className="font-semibold text-camp-forest">
                                  {assignment.itemName}
                                </p>
                                <p className="mt-1 text-sm text-slate-700">
                                  {assignment.quantityLabel} · {assignment.assigneeLabel}
                                </p>
                                <p className="mt-1 text-sm text-slate-600">
                                  From {assignment.sourceLocationName}
                                </p>
                              </div>
                              <div className="text-right text-sm text-slate-600">
                                <p>
                                  {assignment.dueBackAt
                                    ? `Due ${formatDateTime(assignment.dueBackAt)}`
                                    : 'No due date'}
                                </p>
                                {assignment.isOverdue ? (
                                  <p className="mt-1 font-semibold text-rose-900">Overdue</p>
                                ) : null}
                              </div>
                            </div>
                          </article>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </InventorySectionCard>
            </section>

            <InventorySectionCard
              title="Quick actions"
              eyebrow="Do the work"
              description="Open only the job you need. The most common action stays open by default and the setup tools are tucked away at the end."
            >
              <div className="grid gap-4">
                <InventoryDisclosure
                  title="Receive stock"
                  helper="Add delivered items into a location."
                  badge="Most common"
                  defaultOpen
                >
                  <form action={submitInventoryTransaction} className="grid gap-4">
                    <input type="hidden" name="transactionType" value="receive" />
                    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                      <InventorySelectField label="Item" name="itemId" required>
                        <option value="">Choose item</option>
                        {inventoryData.items.map((item) => (
                          <option key={item.id} value={item.id}>
                            {item.name} ({item.sku})
                          </option>
                        ))}
                      </InventorySelectField>
                      <InventorySelectField
                        label="Destination"
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
                    </div>
                    <InventoryTextArea
                      label="Notes"
                      name="notes"
                      placeholder="Supplier, batch, or delivery context"
                    />
                    <InventorySubmitButton disabled={!canRunTransactions}>
                      Receive stock
                    </InventorySubmitButton>
                  </form>
                </InventoryDisclosure>

                <InventoryDisclosure
                  title="Move stock"
                  helper="Transfer items between storage, desks, rooms, vehicles, or event staging."
                >
                  <form action={submitInventoryTransaction} className="grid gap-4">
                    <input type="hidden" name="transactionType" value="transfer" />
                    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                      <InventorySelectField label="Item" name="itemId" required>
                        <option value="">Choose item</option>
                        {inventoryData.items.map((item) => (
                          <option key={item.id} value={item.id}>
                            {item.name} ({item.sku})
                          </option>
                        ))}
                      </InventorySelectField>
                      <InventorySelectField label="Source" name="sourceLocationId" required>
                        <option value="">Choose source</option>
                        {inventoryData.locations.map((location) => (
                          <option key={location.id} value={location.id}>
                            {location.name}
                          </option>
                        ))}
                      </InventorySelectField>
                      <InventorySelectField
                        label="Destination"
                        name="destinationLocationId"
                        required
                      >
                        <option value="">Choose destination</option>
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
                    </div>
                    <div className="grid gap-4 md:grid-cols-[0.8fr_1.2fr]">
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
                    </div>
                    <InventorySubmitButton disabled={!canRunTransactions}>
                      Move stock
                    </InventorySubmitButton>
                  </form>
                </InventoryDisclosure>

                <InventoryDisclosure
                  title="Check out gear"
                  helper="Assign an item to one person or one event."
                >
                  <form action={submitInventoryTransaction} className="grid gap-4">
                    <input type="hidden" name="transactionType" value="checkout" />
                    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
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
                      <InventorySelectField
                        label="Source location"
                        name="sourceLocationId"
                        required
                      >
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
                      <InventoryTextField label="Due back" name="dueBackAt" type="datetime-local" />
                    </div>
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
                    <div className="bg-camp-sand/28 rounded-[20px] p-4 text-sm text-slate-700">
                      Choose either a person or an event, not both.
                    </div>
                    <div className="grid gap-4 md:grid-cols-[0.8fr_1.2fr]">
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
                      <InventoryTextArea
                        label="Notes"
                        name="notes"
                        placeholder="Handoff context or expected usage"
                      />
                    </div>
                    <InventorySubmitButton
                      disabled={
                        !canRunTransactions ||
                        inventoryData.items.every((item) => !item.is_checkoutable)
                      }
                    >
                      Check out gear
                    </InventorySubmitButton>
                  </form>
                </InventoryDisclosure>

                <InventoryDisclosure
                  title="Return gear"
                  helper="Close an active assignment and put the stock back into a location."
                >
                  <form action={submitInventoryTransaction} className="grid gap-4">
                    <input type="hidden" name="transactionType" value="return" />
                    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
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
                    </div>
                    <InventoryTextArea
                      label="Notes"
                      name="notes"
                      placeholder="Condition notes or return context"
                    />
                    <InventorySubmitButton
                      disabled={!inventoryEnabled || activeAssignments.length === 0}
                    >
                      Return gear
                    </InventorySubmitButton>
                  </form>
                </InventoryDisclosure>

                <InventoryDisclosure
                  title="Setup and corrections"
                  helper="Use this only when creating new inventory records or correcting a physical count."
                  badge="Advanced"
                >
                  <div className="grid gap-4 xl:grid-cols-3">
                    <form
                      action={createInventoryItem}
                      className="bg-camp-sand/28 grid gap-4 rounded-[22px] border border-camp-forest/10 p-4"
                    >
                      <div>
                        <h4 className="font-semibold text-camp-forest">Add item</h4>
                        <p className="mt-1 text-sm text-slate-600">
                          Create a catalog record and optional default location.
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
                        placeholder="Useful handling or usage notes"
                      />
                      <InventorySubmitButton disabled={!canCreateItems}>
                        Save item
                      </InventorySubmitButton>
                    </form>

                    <form
                      action={createInventoryLocation}
                      className="grid gap-4 rounded-[22px] border border-camp-forest/10 bg-camp-sky/20 p-4"
                    >
                      <div>
                        <h4 className="font-semibold text-camp-forest">Add location</h4>
                        <p className="mt-1 text-sm text-slate-600">
                          Set up storage, desks, vehicles, rooms, or temporary staging.
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
                        Name event staging areas clearly so the team can spot them in transfers and
                        returns.
                      </div>
                      <InventorySubmitButton disabled={!inventoryEnabled}>
                        Save location
                      </InventorySubmitButton>
                    </form>

                    <form
                      action={submitInventoryTransaction}
                      className="grid gap-4 rounded-[22px] border border-camp-forest/10 bg-white p-4"
                    >
                      <input type="hidden" name="transactionType" value="adjustment" />
                      <div>
                        <h4 className="font-semibold text-camp-forest">Adjust stock count</h4>
                        <p className="mt-1 text-sm text-slate-600">
                          Use a positive number to add stock or a negative number to remove it.
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
                </InventoryDisclosure>
              </div>
            </InventorySectionCard>

            <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
              <InventoryDisclosure
                title="Browse catalog"
                helper={`Filter ${filteredItems.length} item${filteredItems.length === 1 ? '' : 's'} by name, location, or low-stock status.`}
                badge={filteredItems.length === itemSummaries.length ? 'All items' : 'Filtered'}
              >
                <form className="grid gap-4 rounded-[22px] border border-camp-forest/10 bg-camp-sand/30 p-4 md:grid-cols-[1.1fr_0.9fr_auto_auto]">
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
                    <InventorySubmitButton>Apply</InventorySubmitButton>
                    <Link
                      href="/inventory"
                      className="inline-flex items-center justify-center rounded-full border border-camp-forest/15 px-4 py-2.5 text-sm font-semibold text-camp-forest transition hover:bg-camp-sand/35"
                    >
                      Clear
                    </Link>
                  </div>
                </form>

                {filteredItems.length === 0 ? (
                  <div className="mt-4 rounded-[22px] border border-dashed border-camp-forest/20 bg-white/70 p-5 text-sm text-slate-600">
                    No inventory items match the current filters.
                  </div>
                ) : (
                  <div className="mt-4 grid gap-3">
                    {filteredItems.length > catalogPreview.length ? (
                      <p className="text-sm text-slate-600">
                        Showing the first {catalogPreview.length} matches. Narrow the filters if you
                        need a specific item.
                      </p>
                    ) : null}
                    {catalogPreview.map((item) => (
                      <article
                        key={item.id}
                        className="rounded-[22px] border border-camp-forest/10 bg-white p-4"
                      >
                        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <h4 className="font-semibold text-camp-forest">{item.name}</h4>
                              <span className="rounded-full bg-camp-sky/65 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-camp-forest">
                                {item.sku}
                              </span>
                              {item.lowStock ? (
                                <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-amber-900">
                                  Low stock
                                </span>
                              ) : null}
                            </div>
                            <p className="mt-2 text-sm text-slate-600">
                              {item.category} · {item.totalOnHand} {item.unit} on hand
                              {item.checkedOutQuantity > 0
                                ? ` · ${item.checkedOutQuantity} ${item.unit} checked out`
                                : ''}
                            </p>
                            {item.description ? (
                              <p className="mt-2 text-sm text-slate-700">{item.description}</p>
                            ) : null}
                          </div>
                          <div className="text-sm text-slate-700">
                            <p>
                              Minimum <span className="font-semibold">{item.minimumStock}</span>{' '}
                              {item.unit}
                            </p>
                            <p className="mt-1">
                              Default{' '}
                              <span className="font-semibold">
                                {item.defaultLocationName ?? 'Not set'}
                              </span>
                            </p>
                          </div>
                        </div>

                        <div className="mt-3 flex flex-wrap gap-2">
                          {item.stockByLocation.length === 0 ? (
                            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                              No stock received yet
                            </span>
                          ) : (
                            item.stockByLocation.map((location) => (
                              <span
                                key={`${item.id}-${location.locationId}`}
                                className={`rounded-full px-3 py-1 text-xs font-semibold ${
                                  location.lowStock
                                    ? 'bg-amber-100 text-amber-900'
                                    : 'bg-camp-sand/55 text-camp-forest'
                                }`}
                              >
                                {location.locationName}: {location.quantityOnHand}
                              </span>
                            ))
                          )}
                        </div>
                      </article>
                    ))}
                  </div>
                )}
              </InventoryDisclosure>

              <div className="grid gap-6">
                <InventoryDisclosure
                  title="Locations"
                  helper={`See where stock is currently stored across ${locationSummaries.length} location${locationSummaries.length === 1 ? '' : 's'}.`}
                >
                  <div className="grid gap-3">
                    {locationPreview.length === 0 ? (
                      <div className="rounded-[22px] border border-dashed border-camp-forest/20 bg-white/75 p-5 text-sm text-slate-600">
                        No locations have been set up yet.
                      </div>
                    ) : (
                      locationPreview.map((location) => (
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
                          <p className="mt-3 text-sm text-slate-700">
                            {location.trackedItems} tracked item
                            {location.trackedItems === 1 ? '' : 's'} · {location.activeAssignments}{' '}
                            active check-out{location.activeAssignments === 1 ? '' : 's'}
                          </p>
                        </article>
                      ))
                    )}
                  </div>
                </InventoryDisclosure>

                <InventoryDisclosure
                  title="Recent activity"
                  helper={`Review the latest ${recentTransactionsPreview.length} inventory movement${recentTransactionsPreview.length === 1 ? '' : 's'}.`}
                >
                  <div className="grid gap-3">
                    {recentTransactionsPreview.length === 0 ? (
                      <div className="rounded-[22px] border border-dashed border-camp-forest/20 bg-white/75 p-5 text-sm text-slate-600">
                        No movement history has been recorded yet.
                      </div>
                    ) : (
                      recentTransactionsPreview.map((transaction) => (
                        <article
                          key={transaction.id}
                          className="rounded-[22px] border border-camp-forest/10 bg-white px-4 py-4"
                        >
                          <div className="flex flex-col gap-2 lg:flex-row lg:items-start lg:justify-between">
                            <div>
                              <p className="font-semibold text-camp-forest">
                                {transaction.transactionType}
                              </p>
                              <p className="mt-1 text-sm text-slate-700">
                                {transaction.itemLabel} · {transaction.quantityLabel}
                              </p>
                              <p className="mt-1 text-sm text-slate-600">
                                {transaction.sourceLocationName ?? 'No source'}
                                {' -> '}
                                {transaction.destinationLocationName ?? 'No destination'}
                              </p>
                            </div>
                            <div className="text-right text-sm text-slate-600">
                              <p>{formatDateTime(transaction.createdAt) ?? 'Unknown time'}</p>
                              <p className="mt-1">{transaction.reasonLabel}</p>
                            </div>
                          </div>
                        </article>
                      ))
                    )}
                  </div>
                </InventoryDisclosure>
              </div>
            </section>
          </>
        )}
      </div>
    </AppShell>
  );
}
