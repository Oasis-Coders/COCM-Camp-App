import { describe, expect, it } from 'vitest';

import {
  buildInventoryAssignmentViews,
  buildInventoryOverviewMetrics,
  buildInventoryTransactionViews,
  getInventoryStatusMessage,
} from '@/lib/inventory/inventory-view';
import type {
  InventoryAssignmentRecord,
  InventoryItemSummary,
  InventoryLocationRecord,
} from '@/lib/inventory/inventory-utils';

describe('inventory view helpers', () => {
  it('builds overview metrics from inventory summaries and active assignments', () => {
    const items = [
      {
        id: 'water',
        sku: 'WATER-001',
        name: 'Water',
        description: null,
        category: 'Hospitality',
        unit: 'case',
        minimumStock: 10,
        isCheckoutable: false,
        defaultLocationId: 'storage',
        defaultLocationName: 'Main Storage',
        totalOnHand: 32,
        checkedOutQuantity: 0,
        lowStock: false,
        lowStockLocations: 0,
        stockByLocation: [],
      },
      {
        id: 'radio',
        sku: 'RADIO-001',
        name: 'Radio',
        description: null,
        category: 'Comms',
        unit: 'each',
        minimumStock: 2,
        isCheckoutable: true,
        defaultLocationId: 'storage',
        defaultLocationName: 'Main Storage',
        totalOnHand: 1,
        checkedOutQuantity: 2,
        lowStock: true,
        lowStockLocations: 1,
        stockByLocation: [],
      },
    ] satisfies InventoryItemSummary[];

    const locations = [
      {
        id: 'storage',
        name: 'Main Storage',
        code: 'MAIN',
        location_type: 'storage',
        is_active: true,
      },
      { id: 'desk', name: 'Welcome Desk', code: 'DESK', location_type: 'room', is_active: true },
    ] satisfies InventoryLocationRecord[];

    const assignments = [
      {
        id: 'assign-1',
        item_id: 'radio',
        source_location_id: 'storage',
        quantity: 2,
        status: 'active',
      },
      {
        id: 'assign-2',
        item_id: 'water',
        source_location_id: 'desk',
        quantity: 1,
        status: 'returned',
      },
    ] satisfies InventoryAssignmentRecord[];

    const metrics = buildInventoryOverviewMetrics({
      items,
      locations,
      assignments,
      transactions: [
        {
          id: 'txn-1',
          transaction_type: 'checkout',
          actor_profile_id: 'actor-1',
          source_location_id: 'storage',
          destination_location_id: null,
          related_profile_id: 'profile-1',
          related_event_id: null,
          assignment_id: 'assign-1',
          reason_code: 'event-ops',
          notes: null,
          created_at: '2026-04-09T10:00:00Z',
        },
      ],
    });

    expect(metrics).toEqual({
      totalItems: 2,
      lowStockItems: 1,
      totalLocations: 2,
      activeAssignments: 1,
      checkedOutUnits: 2,
      totalTransactions: 1,
    });
  });

  it('builds active assignment views and prioritizes overdue custody', () => {
    const views = buildInventoryAssignmentViews({
      assignments: [
        {
          id: 'assign-overdue',
          item_id: 'radio',
          source_location_id: 'storage',
          assigned_to_profile_id: 'profile-1',
          assigned_to_event_id: null,
          quantity: 1,
          status: 'active',
          due_back_at: '2026-04-09T09:00:00Z',
          notes: 'Front desk lead',
        },
        {
          id: 'assign-event',
          item_id: 'cord',
          source_location_id: 'storage',
          assigned_to_profile_id: null,
          assigned_to_event_id: 'event-1',
          quantity: 2,
          status: 'active',
          due_back_at: '2026-04-10T18:00:00Z',
          notes: null,
        },
      ],
      items: [
        { id: 'radio', name: 'Walkie Talkie', sku: 'RADIO-001', unit: 'each' },
        { id: 'cord', name: 'Extension Cord', sku: 'CORD-001', unit: 'each' },
      ],
      locations: [{ id: 'storage', name: 'Main Storage' }],
      profiles: [{ id: 'profile-1', display_name: 'Camp Staff', email: 'staff@example.com' }],
      events: [{ id: 'event-1', title: 'Spring Weekend', starts_at: null, status: 'published' }],
      now: new Date('2026-04-09T12:00:00Z'),
    });

    expect(views[0]).toMatchObject({
      id: 'assign-overdue',
      itemName: 'Walkie Talkie',
      assigneeLabel: 'Camp Staff',
      assigneeType: 'profile',
      quantityLabel: '1 each',
      sourceLocationName: 'Main Storage',
      isOverdue: true,
    });

    expect(views[1]).toMatchObject({
      id: 'assign-event',
      assigneeLabel: 'Spring Weekend',
      assigneeType: 'event',
      isOverdue: false,
    });
  });

  it('builds movement history views in reverse chronological order', () => {
    const views = buildInventoryTransactionViews({
      transactions: [
        {
          id: 'txn-older',
          transaction_type: 'receive',
          actor_profile_id: 'actor-1',
          source_location_id: null,
          destination_location_id: 'storage',
          related_profile_id: null,
          related_event_id: null,
          assignment_id: null,
          reason_code: 'supplier-delivery',
          notes: 'Morning delivery',
          created_at: '2026-04-08T08:00:00Z',
        },
        {
          id: 'txn-newer',
          transaction_type: 'checkout',
          actor_profile_id: 'actor-1',
          source_location_id: 'storage',
          destination_location_id: null,
          related_profile_id: 'profile-1',
          related_event_id: null,
          assignment_id: 'assign-1',
          reason_code: 'event-ops',
          notes: null,
          created_at: '2026-04-09T14:00:00Z',
        },
      ],
      lines: [
        { transaction_id: 'txn-older', item_id: 'water', quantity: 12 },
        { transaction_id: 'txn-newer', item_id: 'radio', quantity: 2 },
      ],
      items: [
        { id: 'water', name: 'Bottled Water', unit: 'case' },
        { id: 'radio', name: 'Walkie Talkie', unit: 'each' },
      ],
      locations: [{ id: 'storage', name: 'Main Storage' }],
      profiles: [
        { id: 'actor-1', display_name: 'Camp Admin', email: 'admin@example.com' },
        { id: 'profile-1', display_name: 'Front Desk Lead', email: 'lead@example.com' },
      ],
      events: [],
    });

    expect(views.map((view) => view.id)).toEqual(['txn-newer', 'txn-older']);
    expect(views[0]).toMatchObject({
      transactionType: 'Checkout',
      itemLabel: 'Walkie Talkie',
      quantityLabel: '2 each',
      actorName: 'Camp Admin',
      relatedLabel: 'Front Desk Lead',
      reasonLabel: 'Event Ops',
      sourceLocationName: 'Main Storage',
      destinationLocationName: null,
    });
    expect(views[1]).toMatchObject({
      transactionType: 'Receive',
      itemLabel: 'Bottled Water',
      quantityLabel: '12 case',
      reasonLabel: 'Supplier Delivery',
      notes: 'Morning delivery',
    });
  });

  it('maps inventory action statuses to user-facing copy', () => {
    expect(getInventoryStatusMessage('checked-out')).toEqual({
      tone: 'success',
      text: 'The checkout is active and now appears in the custody list.',
    });

    expect(getInventoryStatusMessage('operation-failed')).toEqual({
      tone: 'error',
      text: 'The inventory action could not be completed. Review the inputs and available stock.',
    });

    expect(getInventoryStatusMessage(undefined)).toBeNull();
  });
});
