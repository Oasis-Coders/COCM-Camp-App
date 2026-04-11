import { describe, expect, it } from 'vitest';

import {
  buildInventoryStockItems,
  filterInventoryStockItems,
  getInventoryStatusMessage,
  isInventoryDeleteHistoryCompatibilityError,
  isMissingInventoryMovementSnapshotColumnError,
  normalizeInventoryItemInput,
  normalizeInventoryMovementInput,
} from '@/lib/inventory/inventory-utils';

describe('inventory utils', () => {
  it('normalizes item input with trimmed values and uppercase sku', () => {
    expect(
      normalizeInventoryItemInput({
        name: ' Bottled Water ',
        sku: ' water-001 ',
      })
    ).toEqual({
      name: 'Bottled Water',
      sku: 'WATER-001',
    });
  });

  it('rejects invalid movement types', () => {
    expect(() =>
      normalizeInventoryMovementInput({
        itemId: 'item-1',
        type: 'transfer',
        quantity: '2',
      })
    ).toThrow('Movement type is invalid');
  });

  it('requires positive whole numbers for movement quantity', () => {
    expect(() =>
      normalizeInventoryMovementInput({
        itemId: 'item-1',
        type: 'out',
        quantity: '0',
      })
    ).toThrow('Quantity must be a positive whole number');

    expect(() =>
      normalizeInventoryMovementInput({
        itemId: 'item-1',
        type: 'in',
        quantity: '1.5',
      })
    ).toThrow('Quantity must be a positive whole number');
  });

  it('normalizes valid stock movement input', () => {
    expect(
      normalizeInventoryMovementInput({
        itemId: 'item-1',
        type: 'in',
        quantity: '3',
      })
    ).toEqual({
      itemId: 'item-1',
      type: 'in',
      quantity: 3,
    });
  });

  it('builds stock rows and fills missing balances with zero', () => {
    expect(
      buildInventoryStockItems({
        items: [
          { id: 'item-2', name: 'Walkie Talkie', sku: 'RADIO-001' },
          { id: 'item-1', name: 'Bottled Water', sku: 'WATER-001' },
        ],
        stock: [{ item_id: 'item-2', quantity: 4 }],
      })
    ).toEqual([
      {
        id: 'item-1',
        name: 'Bottled Water',
        sku: 'WATER-001',
        quantity: 0,
      },
      {
        id: 'item-2',
        name: 'Walkie Talkie',
        sku: 'RADIO-001',
        quantity: 4,
      },
    ]);
  });

  it('filters stock rows by name or sku', () => {
    const items = [
      { id: 'item-1', name: 'Bottled Water', sku: 'WATER-001', quantity: 12 },
      { id: 'item-2', name: 'Walkie Talkie', sku: 'RADIO-001', quantity: 4 },
    ];

    expect(filterInventoryStockItems(items, 'water', 'name')).toEqual([items[0]]);
    expect(filterInventoryStockItems(items, 'radio', 'sku')).toEqual([items[1]]);
    expect(filterInventoryStockItems(items, ' ', 'sku')).toEqual(items);
  });

  it('maps inventory status codes to user-facing messages', () => {
    expect(getInventoryStatusMessage('stock-in')).toEqual({
      tone: 'success',
      text: 'Stock added successfully.',
    });

    expect(getInventoryStatusMessage('insufficient-stock')).toEqual({
      tone: 'error',
      text: 'Not enough stock for this outbound movement.',
    });

    expect(getInventoryStatusMessage('history-cleared')).toEqual({
      tone: 'success',
      text: 'Inventory history cleared successfully.',
    });

    expect(getInventoryStatusMessage(undefined)).toBeNull();
  });

  it('detects missing inventory movement snapshot columns', () => {
    expect(
      isMissingInventoryMovementSnapshotColumnError({
        code: 'PGRST204',
        message:
          "Could not find the 'item_name' column of 'inventory_movements' in the schema cache",
      })
    ).toBe(true);

    expect(
      isMissingInventoryMovementSnapshotColumnError({
        code: '42703',
        message: 'column inventory_movements.item_sku does not exist',
      })
    ).toBe(true);

    expect(
      isMissingInventoryMovementSnapshotColumnError({
        code: 'PGRST204',
        message: "Could not find the 'name' column of 'inventory_items' in the schema cache",
      })
    ).toBe(false);
  });

  it('detects delete history compatibility errors', () => {
    expect(
      isInventoryDeleteHistoryCompatibilityError({
        code: '23514',
        message:
          'new row for relation "inventory_movements" violates check constraint "inventory_movements_type_check"',
      })
    ).toBe(true);

    expect(
      isInventoryDeleteHistoryCompatibilityError({
        code: '23502',
        message:
          'null value in column "item_id" of relation "inventory_movements" violates not-null constraint',
      })
    ).toBe(true);

    expect(
      isInventoryDeleteHistoryCompatibilityError({
        code: '23514',
        message: 'new row for relation "tasks" violates check constraint "tasks_status_check"',
      })
    ).toBe(false);
  });
});
