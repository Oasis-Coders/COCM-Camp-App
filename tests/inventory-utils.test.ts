import { describe, expect, it } from 'vitest';

import {
  buildInventoryItemSummaries,
  buildInventoryLocationSummaries,
  filterInventorySummaries,
  normalizeInventoryItemInput,
  normalizeInventoryLocationInput,
  normalizeInventoryTransactionInput,
} from '@/lib/inventory/inventory-utils';

describe('inventory utils', () => {
  it('normalizes inventory item input with trimmed values and defaults', () => {
    expect(
      normalizeInventoryItemInput({
        sku: '  water-001 ',
        name: ' Bottled Water ',
        description: ' Event stock ',
        category: ' Hospitality ',
        unit: '',
        minimumStock: '12',
        defaultLocationId: '',
        isCheckoutable: 'on',
      })
    ).toEqual({
      sku: 'WATER-001',
      name: 'Bottled Water',
      description: 'Event stock',
      category: 'Hospitality',
      unit: 'each',
      minimumStock: 12,
      defaultLocationId: null,
      isCheckoutable: true,
    });
  });

  it('rejects invalid inventory location types', () => {
    expect(() =>
      normalizeInventoryLocationInput({
        name: 'Main storage',
        code: 'MAIN',
        locationType: 'warehouse',
      })
    ).toThrow('Location type is invalid');
  });

  it('validates checkout transactions require exactly one target', () => {
    expect(() =>
      normalizeInventoryTransactionInput({
        transactionType: 'checkout',
        itemId: 'item-1',
        sourceLocationId: 'loc-1',
        quantity: '2',
        reasonCode: 'event-kit',
      })
    ).toThrow('Choose exactly one checkout target');
  });

  it('normalizes transfer transactions with positive quantities', () => {
    expect(
      normalizeInventoryTransactionInput({
        transactionType: 'transfer',
        itemId: 'item-1',
        sourceLocationId: 'loc-a',
        destinationLocationId: 'loc-b',
        quantity: '4',
        reasonCode: 'restock-front-desk',
        notes: ' Before opening ',
      })
    ).toEqual({
      transactionType: 'transfer',
      itemId: 'item-1',
      assignmentId: null,
      sourceLocationId: 'loc-a',
      destinationLocationId: 'loc-b',
      quantity: 4,
      reasonCode: 'restock-front-desk',
      notes: 'Before opening',
      assignedToProfileId: null,
      assignedToEventId: null,
      dueBackAt: null,
    });
  });

  it('builds inventory item summaries with low-stock detection and checkout totals', () => {
    const summaries = buildInventoryItemSummaries({
      items: [
        {
          id: 'water',
          sku: 'WATER-001',
          name: 'Bottled Water',
          description: null,
          category: 'Hospitality',
          unit: 'case',
          minimum_stock: 15,
          is_checkoutable: false,
          default_location_id: 'storage',
          is_active: true,
        },
      ],
      locations: [
        {
          id: 'storage',
          name: 'Main Storage',
          code: 'MAIN',
          location_type: 'storage',
          is_active: true,
        },
        { id: 'desk', name: 'Welcome Desk', code: 'DESK', location_type: 'room', is_active: true },
      ],
      stockLevels: [
        {
          item_id: 'water',
          location_id: 'storage',
          quantity_on_hand: 30,
          minimum_stock_override: null,
        },
        { item_id: 'water', location_id: 'desk', quantity_on_hand: 10, minimum_stock_override: 12 },
      ],
      assignments: [
        {
          id: 'assign-1',
          item_id: 'water',
          source_location_id: 'storage',
          quantity: 5,
          status: 'active',
        },
      ],
    });

    expect(summaries[0]).toMatchObject({
      totalOnHand: 40,
      checkedOutQuantity: 5,
      lowStock: true,
      lowStockLocations: 1,
      defaultLocationName: 'Main Storage',
    });
    expect(summaries[0].stockByLocation[1]).toMatchObject({
      locationName: 'Welcome Desk',
      lowStock: true,
    });
  });

  it('builds location summaries and filters low-stock inventory', () => {
    const items = buildInventoryItemSummaries({
      items: [
        {
          id: 'radio',
          sku: 'RADIO-01',
          name: 'Walkie Talkie',
          description: null,
          category: 'Comms',
          unit: 'each',
          minimum_stock: 2,
          is_checkoutable: true,
          default_location_id: 'storage',
          is_active: true,
        },
      ],
      locations: [
        {
          id: 'storage',
          name: 'Main Storage',
          code: 'MAIN',
          location_type: 'storage',
          is_active: true,
        },
      ],
      stockLevels: [
        {
          item_id: 'radio',
          location_id: 'storage',
          quantity_on_hand: 1,
          minimum_stock_override: null,
        },
      ],
      assignments: [
        {
          id: 'assign-1',
          item_id: 'radio',
          source_location_id: 'storage',
          quantity: 2,
          status: 'active',
        },
      ],
    });

    const locations = buildInventoryLocationSummaries({
      locations: [
        {
          id: 'storage',
          name: 'Main Storage',
          code: 'MAIN',
          location_type: 'storage',
          is_active: true,
        },
      ],
      stockLevels: [
        {
          item_id: 'radio',
          location_id: 'storage',
          quantity_on_hand: 1,
          minimum_stock_override: null,
        },
      ],
      assignments: [
        {
          id: 'assign-1',
          item_id: 'radio',
          source_location_id: 'storage',
          quantity: 2,
          status: 'active',
        },
      ],
    });

    expect(filterInventorySummaries(items, { lowStockOnly: true })).toHaveLength(1);
    expect(locations[0]).toMatchObject({
      trackedItems: 1,
      totalUnits: 1,
      activeAssignments: 1,
    });
  });
});
