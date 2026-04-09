export const inventoryLocationTypes = ['storage', 'event', 'vehicle', 'room', 'temporary'] as const;
export type InventoryLocationType = (typeof inventoryLocationTypes)[number];

export const inventoryTransactionTypes = [
  'receive',
  'transfer',
  'checkout',
  'return',
  'adjustment',
] as const;
export type InventoryTransactionType = (typeof inventoryTransactionTypes)[number];

type QuantityLike = number | string | null | undefined;

export type InventoryItemRecord = {
  id: string;
  sku: string;
  name: string;
  description: string | null;
  category: string;
  unit: string;
  minimum_stock: QuantityLike;
  is_checkoutable: boolean;
  default_location_id: string | null;
  is_active: boolean;
};

export type InventoryLocationRecord = {
  id: string;
  name: string;
  code: string;
  location_type: string;
  is_active: boolean;
};

export type InventoryStockLevelRecord = {
  item_id: string;
  location_id: string;
  quantity_on_hand: QuantityLike;
  minimum_stock_override: QuantityLike;
};

export type InventoryAssignmentRecord = {
  id: string;
  item_id: string;
  source_location_id: string | null;
  quantity: QuantityLike;
  status: string;
};

export type InventoryItemSummary = {
  id: string;
  sku: string;
  name: string;
  description: string | null;
  category: string;
  unit: string;
  minimumStock: number;
  isCheckoutable: boolean;
  defaultLocationId: string | null;
  defaultLocationName: string | null;
  totalOnHand: number;
  checkedOutQuantity: number;
  lowStock: boolean;
  lowStockLocations: number;
  stockByLocation: Array<{
    locationId: string;
    locationName: string;
    quantityOnHand: number;
    threshold: number;
    lowStock: boolean;
  }>;
};

export type InventoryLocationSummary = {
  id: string;
  name: string;
  code: string;
  locationType: string;
  trackedItems: number;
  totalUnits: number;
  activeAssignments: number;
};

export type InventoryItemInput = {
  sku: string;
  name: string;
  description: string | null;
  category: string;
  unit: string;
  minimumStock: number;
  defaultLocationId: string | null;
  isCheckoutable: boolean;
};

export type InventoryLocationInput = {
  name: string;
  code: string;
  locationType: InventoryLocationType;
};

export type InventoryTransactionInput = {
  transactionType: InventoryTransactionType;
  itemId: string | null;
  assignmentId: string | null;
  sourceLocationId: string | null;
  destinationLocationId: string | null;
  quantity: number | null;
  reasonCode: string;
  notes: string | null;
  assignedToProfileId: string | null;
  assignedToEventId: string | null;
  dueBackAt: string | null;
};

function normalizeText(value: string | undefined) {
  const normalized = value?.trim() ?? '';
  return normalized.length > 0 ? normalized : null;
}

function requireText(value: string | undefined, label: string) {
  const normalized = normalizeText(value);

  if (!normalized) {
    throw new Error(`${label} is required`);
  }

  return normalized;
}

function requireId(value: string | undefined, label: string) {
  const normalized = normalizeText(value);

  if (!normalized) {
    throw new Error(`${label} is required`);
  }

  return normalized;
}

function toNumber(value: QuantityLike) {
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

function requirePositiveNumber(value: string | undefined, label: string) {
  const normalized = requireText(value, label);
  const parsed = Number(normalized);

  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error(`${label} must be greater than zero`);
  }

  return parsed;
}

function requireSignedNumber(value: string | undefined, label: string) {
  const normalized = requireText(value, label);
  const parsed = Number(normalized);

  if (!Number.isFinite(parsed) || parsed === 0) {
    throw new Error(`${label} must be a non-zero number`);
  }

  return parsed;
}

function requireNonNegativeNumber(value: string | undefined, label: string) {
  const normalized = requireText(value, label);
  const parsed = Number(normalized);

  if (!Number.isFinite(parsed) || parsed < 0) {
    throw new Error(`${label} must be zero or greater`);
  }

  return parsed;
}

export function formatInventoryQuantity(value: number) {
  if (Number.isInteger(value)) {
    return String(value);
  }

  return value.toFixed(2).replace(/\.?0+$/, '');
}

export function isLowStock(quantity: number, threshold: number) {
  return threshold > 0 && quantity <= threshold;
}

export function normalizeInventoryItemInput(input: {
  sku?: string;
  name?: string;
  description?: string;
  category?: string;
  unit?: string;
  minimumStock?: string;
  defaultLocationId?: string;
  isCheckoutable?: string;
}): InventoryItemInput {
  return {
    sku: requireText(input.sku, 'SKU').toUpperCase(),
    name: requireText(input.name, 'Item name'),
    description: normalizeText(input.description),
    category: requireText(input.category, 'Category'),
    unit: normalizeText(input.unit) ?? 'each',
    minimumStock:
      input.minimumStock && input.minimumStock.trim().length > 0
        ? requireNonNegativeNumber(input.minimumStock, 'Minimum stock')
        : 0,
    defaultLocationId: normalizeText(input.defaultLocationId),
    isCheckoutable: input.isCheckoutable === 'on',
  };
}

export function normalizeInventoryLocationInput(input: {
  name?: string;
  code?: string;
  locationType?: string;
}): InventoryLocationInput {
  const locationType = requireText(input.locationType, 'Location type');

  if (!inventoryLocationTypes.includes(locationType as InventoryLocationType)) {
    throw new Error('Location type is invalid');
  }

  return {
    name: requireText(input.name, 'Location name'),
    code: requireText(input.code, 'Location code').toUpperCase(),
    locationType: locationType as InventoryLocationType,
  };
}

export function normalizeInventoryTransactionInput(input: {
  transactionType?: string;
  itemId?: string;
  assignmentId?: string;
  sourceLocationId?: string;
  destinationLocationId?: string;
  quantity?: string;
  reasonCode?: string;
  notes?: string;
  assignedToProfileId?: string;
  assignedToEventId?: string;
  dueBackAt?: string;
}): InventoryTransactionInput {
  const transactionType = requireText(input.transactionType, 'Transaction type');

  if (!inventoryTransactionTypes.includes(transactionType as InventoryTransactionType)) {
    throw new Error('Transaction type is invalid');
  }

  const normalized: InventoryTransactionInput = {
    transactionType: transactionType as InventoryTransactionType,
    itemId: normalizeText(input.itemId),
    assignmentId: normalizeText(input.assignmentId),
    sourceLocationId: normalizeText(input.sourceLocationId),
    destinationLocationId: normalizeText(input.destinationLocationId),
    quantity: null,
    reasonCode: requireText(input.reasonCode, 'Reason code'),
    notes: normalizeText(input.notes),
    assignedToProfileId: normalizeText(input.assignedToProfileId),
    assignedToEventId: normalizeText(input.assignedToEventId),
    dueBackAt: normalizeText(input.dueBackAt),
  };

  switch (normalized.transactionType) {
    case 'receive':
      normalized.itemId = requireId(input.itemId, 'Item');
      normalized.destinationLocationId = requireId(input.destinationLocationId, 'Destination');
      normalized.quantity = requirePositiveNumber(input.quantity, 'Quantity');
      break;
    case 'transfer':
      normalized.itemId = requireId(input.itemId, 'Item');
      normalized.sourceLocationId = requireId(input.sourceLocationId, 'Source location');
      normalized.destinationLocationId = requireId(input.destinationLocationId, 'Destination');
      normalized.quantity = requirePositiveNumber(input.quantity, 'Quantity');

      if (normalized.sourceLocationId === normalized.destinationLocationId) {
        throw new Error('Source and destination must be different');
      }
      break;
    case 'checkout':
      normalized.itemId = requireId(input.itemId, 'Item');
      normalized.sourceLocationId = requireId(input.sourceLocationId, 'Source location');
      normalized.quantity = requirePositiveNumber(input.quantity, 'Quantity');

      if (
        Number(Boolean(normalized.assignedToProfileId)) +
          Number(Boolean(normalized.assignedToEventId)) !==
        1
      ) {
        throw new Error('Choose exactly one checkout target');
      }
      break;
    case 'return':
      normalized.assignmentId = requireId(input.assignmentId, 'Assignment');
      normalized.destinationLocationId = requireId(input.destinationLocationId, 'Return location');
      break;
    case 'adjustment':
      normalized.itemId = requireId(input.itemId, 'Item');
      normalized.sourceLocationId = requireId(input.sourceLocationId, 'Location');
      normalized.quantity = requireSignedNumber(input.quantity, 'Adjustment quantity');
      break;
  }

  return normalized;
}

export function buildInventoryItemSummaries(input: {
  items: InventoryItemRecord[];
  locations: InventoryLocationRecord[];
  stockLevels: InventoryStockLevelRecord[];
  assignments: InventoryAssignmentRecord[];
}) {
  const locationById = new Map(input.locations.map((location) => [location.id, location]));
  const activeAssignments = input.assignments.filter(
    (assignment) => assignment.status === 'active'
  );

  return input.items.map<InventoryItemSummary>((item) => {
    const itemStockLevels = input.stockLevels
      .filter((level) => level.item_id === item.id)
      .map((level) => {
        const threshold =
          level.minimum_stock_override === null || level.minimum_stock_override === undefined
            ? toNumber(item.minimum_stock)
            : toNumber(level.minimum_stock_override);
        const quantityOnHand = toNumber(level.quantity_on_hand);

        return {
          locationId: level.location_id,
          locationName: locationById.get(level.location_id)?.name ?? 'Unknown location',
          quantityOnHand,
          threshold,
          lowStock: isLowStock(quantityOnHand, threshold),
        };
      })
      .sort(
        (left, right) =>
          right.quantityOnHand - left.quantityOnHand ||
          left.locationName.localeCompare(right.locationName)
      );

    const checkedOutQuantity = activeAssignments
      .filter((assignment) => assignment.item_id === item.id)
      .reduce((total, assignment) => total + toNumber(assignment.quantity), 0);

    const totalOnHand = itemStockLevels.reduce((total, level) => total + level.quantityOnHand, 0);
    const lowStockLocations = itemStockLevels.filter((level) => level.lowStock).length;

    return {
      id: item.id,
      sku: item.sku,
      name: item.name,
      description: item.description,
      category: item.category,
      unit: item.unit,
      minimumStock: toNumber(item.minimum_stock),
      isCheckoutable: item.is_checkoutable,
      defaultLocationId: item.default_location_id,
      defaultLocationName: item.default_location_id
        ? (locationById.get(item.default_location_id)?.name ?? null)
        : null,
      totalOnHand,
      checkedOutQuantity,
      lowStock:
        lowStockLocations > 0 ||
        (itemStockLevels.length === 0 && isLowStock(0, toNumber(item.minimum_stock))),
      lowStockLocations,
      stockByLocation: itemStockLevels,
    };
  });
}

export function buildInventoryLocationSummaries(input: {
  locations: InventoryLocationRecord[];
  stockLevels: InventoryStockLevelRecord[];
  assignments: InventoryAssignmentRecord[];
}) {
  return input.locations.map<InventoryLocationSummary>((location) => {
    const locationStockLevels = input.stockLevels.filter(
      (level) => level.location_id === location.id
    );
    const activeAssignments = input.assignments.filter(
      (assignment) =>
        assignment.status === 'active' && assignment.source_location_id === location.id
    );

    return {
      id: location.id,
      name: location.name,
      code: location.code,
      locationType: location.location_type,
      trackedItems: locationStockLevels.length,
      totalUnits: locationStockLevels.reduce(
        (total, level) => total + toNumber(level.quantity_on_hand),
        0
      ),
      activeAssignments: activeAssignments.length,
    };
  });
}

export function filterInventorySummaries(
  items: InventoryItemSummary[],
  filters: {
    query?: string;
    locationId?: string;
    lowStockOnly?: boolean;
  }
) {
  const normalizedQuery = filters.query?.trim().toLowerCase() ?? '';

  return items.filter((item) => {
    const matchesQuery =
      !normalizedQuery ||
      [item.name, item.sku, item.category]
        .filter(Boolean)
        .some((value) => value.toLowerCase().includes(normalizedQuery));
    const matchesLocation =
      !filters.locationId ||
      item.stockByLocation.some((location) => location.locationId === filters.locationId);
    const matchesLowStock = !filters.lowStockOnly || item.lowStock;

    return matchesQuery && matchesLocation && matchesLowStock;
  });
}
