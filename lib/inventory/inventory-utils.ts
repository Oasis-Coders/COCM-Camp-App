export const inventoryMovementTypes = ['in', 'out'] as const;

export type InventoryMovementType = (typeof inventoryMovementTypes)[number];

export type InventoryItemRecord = {
  id: string;
  name: string;
  sku: string;
};

export type InventoryStockRecord = {
  item_id: string;
  quantity: number | string | null;
};

export type InventoryMovementRecord = {
  id: string;
  item_id: string | null;
  item_name: string | null;
  item_sku: string | null;
  type: string;
  quantity: number | string | null;
  operator_name: string;
  time: string;
};

export type InventoryItemInput = {
  name: string;
  sku: string;
};

export type InventoryMovementInput = {
  itemId: string;
  type: InventoryMovementType;
  quantity: number;
};

export type InventoryStockItem = {
  id: string;
  name: string;
  sku: string;
  quantity: number;
};

export type InventoryStockSearchFilter = 'name' | 'sku';

export type InventoryStatusMessage = {
  tone: 'success' | 'error';
  text: string;
};

export function isMissingInventoryMovementSnapshotColumnError(error: unknown) {
  const code =
    typeof error === 'object' && error !== null && 'code' in error && typeof error.code === 'string'
      ? error.code
      : '';
  const message =
    error instanceof Error
      ? error.message
      : typeof error === 'object' &&
          error !== null &&
          'message' in error &&
          typeof error.message === 'string'
        ? error.message
        : '';

  const isInventoryMovementSnapshotColumn =
    message.includes('inventory_movements') &&
    (message.includes('item_name') || message.includes('item_sku'));

  return (code === 'PGRST204' || code === '42703') && isInventoryMovementSnapshotColumn;
}

export function isInventoryDeleteHistoryCompatibilityError(error: unknown) {
  const code =
    typeof error === 'object' && error !== null && 'code' in error && typeof error.code === 'string'
      ? error.code
      : '';
  const message =
    error instanceof Error
      ? error.message
      : typeof error === 'object' &&
          error !== null &&
          'message' in error &&
          typeof error.message === 'string'
        ? error.message
        : '';

  return (
    (code === '23502' || code === '23514') &&
    (message.includes('inventory_movements') ||
      message.includes('inventory_movements_type_check') ||
      message.includes('inventory_movements_item_id'))
  );
}

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

export function normalizeInventoryItemInput(input: {
  name?: string;
  sku?: string;
}): InventoryItemInput {
  return {
    name: requireText(input.name, 'Item name'),
    sku: requireText(input.sku, 'SKU').toUpperCase(),
  };
}

export function normalizeInventoryMovementInput(input: {
  itemId?: string;
  type?: string;
  quantity?: string;
}): InventoryMovementInput {
  const type = requireText(input.type, 'Movement type');

  if (!inventoryMovementTypes.includes(type as InventoryMovementType)) {
    throw new Error('Movement type is invalid');
  }

  const quantityText = requireText(input.quantity, 'Quantity');
  const quantity = Number(quantityText);

  if (!Number.isInteger(quantity) || quantity <= 0) {
    throw new Error('Quantity must be a positive whole number');
  }

  return {
    itemId: requireText(input.itemId, 'Item'),
    type: type as InventoryMovementType,
    quantity,
  };
}

export function buildInventoryStockItems(input: {
  items: InventoryItemRecord[];
  stock: InventoryStockRecord[];
}) {
  const stockByItemId = new Map(
    input.stock.map((entry) => [entry.item_id, toNumber(entry.quantity)])
  );

  return input.items
    .map<InventoryStockItem>((item) => ({
      id: item.id,
      name: item.name,
      sku: item.sku,
      quantity: stockByItemId.get(item.id) ?? 0,
    }))
    .sort(
      (left, right) => left.name.localeCompare(right.name) || left.sku.localeCompare(right.sku)
    );
}

export function filterInventoryStockItems(
  items: InventoryStockItem[],
  query: string,
  filter: InventoryStockSearchFilter
) {
  const normalizedQuery = query.trim().toLowerCase();

  if (!normalizedQuery) {
    return items;
  }

  return items.filter((item) => item[filter].toLowerCase().includes(normalizedQuery));
}

export function getInventoryStatusMessage(
  status: string | undefined
): InventoryStatusMessage | null {
  switch (status) {
    case 'item-created':
      return {
        tone: 'success',
        text: 'Item added successfully.',
      };
    case 'item-deleted':
      return {
        tone: 'success',
        text: 'Item deleted successfully.',
      };
    case 'history-cleared':
      return {
        tone: 'success',
        text: 'Inventory history cleared successfully.',
      };
    case 'stock-in':
      return {
        tone: 'success',
        text: 'Stock added successfully.',
      };
    case 'stock-out':
      return {
        tone: 'success',
        text: 'Stock removed successfully.',
      };
    case 'validation-error':
      return {
        tone: 'error',
        text: 'Please complete the required fields correctly.',
      };
    case 'insufficient-stock':
      return {
        tone: 'error',
        text: 'Not enough stock for this outbound movement.',
      };
    case 'unauthorized':
      return {
        tone: 'error',
        text: 'You do not have permission to use inventory.',
      };
    case 'supabase-unavailable':
      return {
        tone: 'error',
        text: 'Supabase is required before inventory can be used.',
      };
    case 'operation-failed':
      return {
        tone: 'error',
        text: 'Inventory action failed. Please try again.',
      };
    default:
      return null;
  }
}
