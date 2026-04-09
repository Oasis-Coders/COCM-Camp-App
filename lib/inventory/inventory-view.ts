import {
  formatInventoryQuantity,
  type InventoryAssignmentRecord,
  type InventoryItemRecord,
  type InventoryItemSummary,
  type InventoryLocationRecord,
} from '@/lib/inventory/inventory-utils';

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

export type InventoryTransactionRecord = {
  id: string;
  transaction_type: string;
  actor_profile_id: string | null;
  source_location_id: string | null;
  destination_location_id: string | null;
  related_profile_id: string | null;
  related_event_id: string | null;
  assignment_id: string | null;
  reason_code: string;
  notes: string | null;
  created_at: string;
};

export type InventoryTransactionLineRecord = {
  transaction_id: string;
  item_id: string;
  quantity: number | string | null;
};

export type InventoryOverviewMetrics = {
  totalItems: number;
  lowStockItems: number;
  totalLocations: number;
  activeAssignments: number;
  checkedOutUnits: number;
  totalTransactions: number;
};

export type InventoryAssignmentView = {
  id: string;
  itemName: string;
  itemSku: string;
  assigneeLabel: string;
  assigneeType: 'profile' | 'event';
  quantityLabel: string;
  sourceLocationName: string;
  dueBackAt: string | null;
  notes: string | null;
  isOverdue: boolean;
};

export type InventoryTransactionView = {
  id: string;
  transactionType: string;
  itemLabel: string;
  quantityLabel: string;
  actorName: string;
  sourceLocationName: string | null;
  destinationLocationName: string | null;
  relatedLabel: string | null;
  reasonLabel: string;
  notes: string | null;
  createdAt: string;
};

export type InventoryStatusMessage = {
  tone: 'success' | 'error';
  text: string;
};

function toNumber(value: number | string | null | undefined) {
  if (typeof value === 'number') {
    return value;
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();

    if (!trimmed) {
      return 0;
    }

    return Number(trimmed);
  }

  return 0;
}

function titleCase(label: string) {
  return label
    .replace(/[_-]+/g, ' ')
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function resolveProfileLabel(profile: InventoryProfileRecord | undefined) {
  if (!profile) {
    return 'Unknown person';
  }

  return profile.display_name ?? profile.email ?? 'Unknown person';
}

export function buildInventoryOverviewMetrics(input: {
  items: InventoryItemSummary[];
  locations: InventoryLocationRecord[];
  assignments: InventoryAssignmentRecord[];
  transactions: InventoryTransactionRecord[];
}): InventoryOverviewMetrics {
  const activeAssignments = input.assignments.filter(
    (assignment) => assignment.status === 'active'
  );

  return {
    totalItems: input.items.length,
    lowStockItems: input.items.filter((item) => item.lowStock).length,
    totalLocations: input.locations.length,
    activeAssignments: activeAssignments.length,
    checkedOutUnits: activeAssignments.reduce(
      (total, assignment) => total + toNumber(assignment.quantity),
      0
    ),
    totalTransactions: input.transactions.length,
  };
}

export function buildInventoryAssignmentViews(input: {
  assignments: InventoryAssignmentDetailsRecord[];
  items: Pick<InventoryItemRecord, 'id' | 'name' | 'sku' | 'unit'>[];
  locations: Pick<InventoryLocationRecord, 'id' | 'name'>[];
  profiles: InventoryProfileRecord[];
  events: InventoryEventRecord[];
  now?: Date;
}) {
  const itemById = new Map(input.items.map((item) => [item.id, item]));
  const locationById = new Map(input.locations.map((location) => [location.id, location]));
  const profileById = new Map(input.profiles.map((profile) => [profile.id, profile]));
  const eventById = new Map(input.events.map((event) => [event.id, event]));
  const now = input.now ?? new Date();

  return input.assignments
    .filter((assignment) => assignment.status === 'active')
    .map<InventoryAssignmentView>((assignment) => {
      const item = itemById.get(assignment.item_id);
      const profileTarget = assignment.assigned_to_profile_id
        ? profileById.get(assignment.assigned_to_profile_id)
        : undefined;
      const eventTarget = assignment.assigned_to_event_id
        ? eventById.get(assignment.assigned_to_event_id)
        : undefined;
      const dueBackAt = assignment.due_back_at ?? null;
      const isOverdue = Boolean(dueBackAt && new Date(dueBackAt).getTime() < now.getTime());

      return {
        id: assignment.id,
        itemName: item?.name ?? 'Unknown item',
        itemSku: item?.sku ?? 'Unknown SKU',
        assigneeLabel: profileTarget
          ? resolveProfileLabel(profileTarget)
          : (eventTarget?.title ?? 'Unknown event'),
        assigneeType: profileTarget ? 'profile' : 'event',
        quantityLabel: `${formatInventoryQuantity(toNumber(assignment.quantity))} ${item?.unit ?? 'units'}`,
        sourceLocationName:
          (assignment.source_location_id
            ? locationById.get(assignment.source_location_id)?.name
            : null) ?? 'No source location',
        dueBackAt,
        notes: assignment.notes ?? null,
        isOverdue,
      };
    })
    .sort((left, right) => {
      if (left.isOverdue !== right.isOverdue) {
        return left.isOverdue ? -1 : 1;
      }

      const leftDue = left.dueBackAt ? new Date(left.dueBackAt).getTime() : Number.MAX_SAFE_INTEGER;
      const rightDue = right.dueBackAt
        ? new Date(right.dueBackAt).getTime()
        : Number.MAX_SAFE_INTEGER;

      return leftDue - rightDue || left.itemName.localeCompare(right.itemName);
    });
}

export function buildInventoryTransactionViews(input: {
  transactions: InventoryTransactionRecord[];
  lines: InventoryTransactionLineRecord[];
  items: Pick<InventoryItemRecord, 'id' | 'name' | 'unit'>[];
  locations: Pick<InventoryLocationRecord, 'id' | 'name'>[];
  profiles: InventoryProfileRecord[];
  events: InventoryEventRecord[];
}) {
  const itemById = new Map(input.items.map((item) => [item.id, item]));
  const locationById = new Map(input.locations.map((location) => [location.id, location]));
  const profileById = new Map(input.profiles.map((profile) => [profile.id, profile]));
  const eventById = new Map(input.events.map((event) => [event.id, event]));
  const linesByTransactionId = new Map<string, InventoryTransactionLineRecord[]>();

  input.lines.forEach((line) => {
    const existing = linesByTransactionId.get(line.transaction_id);

    if (existing) {
      existing.push(line);
      return;
    }

    linesByTransactionId.set(line.transaction_id, [line]);
  });

  return [...input.transactions]
    .sort(
      (left, right) => new Date(right.created_at).getTime() - new Date(left.created_at).getTime()
    )
    .map<InventoryTransactionView>((transaction) => {
      const lines = linesByTransactionId.get(transaction.id) ?? [];
      const quantityLabel =
        lines.length === 0
          ? 'No movement lines'
          : lines
              .map((line) => {
                const item = itemById.get(line.item_id);
                return `${formatInventoryQuantity(toNumber(line.quantity))} ${item?.unit ?? 'units'}`;
              })
              .join(', ');
      const itemLabel =
        lines.length === 0
          ? 'Unknown item'
          : lines.map((line) => itemById.get(line.item_id)?.name ?? 'Unknown item').join(', ');
      const actorName =
        (transaction.actor_profile_id
          ? resolveProfileLabel(profileById.get(transaction.actor_profile_id))
          : null) ?? 'Unknown actor';
      const relatedLabel = transaction.related_profile_id
        ? resolveProfileLabel(profileById.get(transaction.related_profile_id))
        : transaction.related_event_id
          ? (eventById.get(transaction.related_event_id)?.title ?? 'Unknown event')
          : null;

      return {
        id: transaction.id,
        transactionType: titleCase(transaction.transaction_type),
        itemLabel,
        quantityLabel,
        actorName,
        sourceLocationName: transaction.source_location_id
          ? (locationById.get(transaction.source_location_id)?.name ?? 'Unknown location')
          : null,
        destinationLocationName: transaction.destination_location_id
          ? (locationById.get(transaction.destination_location_id)?.name ?? 'Unknown location')
          : null,
        relatedLabel,
        reasonLabel: titleCase(transaction.reason_code),
        notes: transaction.notes,
        createdAt: transaction.created_at,
      };
    });
}

export function getInventoryStatusMessage(
  status: string | undefined
): InventoryStatusMessage | null {
  switch (status) {
    case 'item-created':
      return {
        tone: 'success',
        text: 'The inventory item was added to the catalog.',
      };
    case 'location-created':
      return {
        tone: 'success',
        text: 'The storage location was created successfully.',
      };
    case 'received':
      return {
        tone: 'success',
        text: 'Stock was received and the destination quantity is updated.',
      };
    case 'transferred':
      return {
        tone: 'success',
        text: 'The transfer completed and both locations were updated.',
      };
    case 'checked-out':
      return {
        tone: 'success',
        text: 'The checkout is active and now appears in the custody list.',
      };
    case 'returned':
      return {
        tone: 'success',
        text: 'The assignment was returned and stock is back in inventory.',
      };
    case 'adjusted':
      return {
        tone: 'success',
        text: 'The manual stock adjustment was recorded.',
      };
    case 'validation-error':
      return {
        tone: 'error',
        text: 'One or more inventory fields were missing or invalid.',
      };
    case 'unauthorized':
      return {
        tone: 'error',
        text: 'This account does not have permission to perform that inventory action.',
      };
    case 'supabase-unavailable':
      return {
        tone: 'error',
        text: 'Inventory actions need a working Supabase connection before they can run.',
      };
    case 'operation-failed':
      return {
        tone: 'error',
        text: 'The inventory action could not be completed. Review the inputs and available stock.',
      };
    default:
      return null;
  }
}
