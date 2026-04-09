# Inventory System Design

## Intent

This design adds a staff-facing inventory system to the camp app so the team can track what exists, where it is, who currently has it, and how stock changes over time.

It is designed to support the existing inventory backlog:

- `C-01` Define inventory data model
- `C-02` Build inventory catalog screens
- `C-03` Build inventory transaction flows
- `C-04` Add low-stock alert thresholds
- `C-05` Add inventory audit report

## Goals

- Track both consumable stock and reusable equipment
- Keep stock visible by physical location
- Support check-out, return, transfer, and adjustment flows
- Preserve an immutable movement history for auditability
- Surface low-stock risks before they become blockers
- Fit the existing role model and Supabase RLS approach

## Non-goals for the first version

- Vendor and purchasing workflows
- Barcode or QR scanning
- Maintenance scheduling
- Kit composition or bundle management
- Offline syncing
- Financial accounting

## Users and permissions

| Role          | Catalog view | Stock view | Transactions                                        | Catalog setup | Thresholds and reports |
| ------------- | ------------ | ---------- | --------------------------------------------------- | ------------- | ---------------------- |
| `participant` | No access    | No access  | No access                                           | No access     | No access              |
| `staff`       | Yes          | Yes        | Check-out, return, transfer, adjustment with reason | No            | Read-only              |
| `admin`       | Yes          | Yes        | Yes                                                 | Yes           | Yes                    |
| `super_admin` | Yes          | Yes        | Yes                                                 | Yes           | Yes                    |

Operationally, inventory should behave like `tasks` and `check-in`: visible to staff and above, but with stricter write controls on catalog structure and control settings.

## Product shape

Recommended route structure:

- `/inventory`
  Staff-facing inventory catalog and stock overview
- `/inventory/[itemId]`
  Item detail, stock by location, active assignments, recent transactions
- `/inventory/transactions`
  Movement history with filters
- `/admin/inventory`
  Admin entrypoint for catalog and location management
- `/admin/inventory/items/[itemId]`
  Catalog editing
- `/admin/inventory/locations`
  Location management and threshold overrides

Recommended navigation:

- Add `Inventory` as a top-level nav item for `staff`, `admin`, and `super_admin`
- Keep catalog configuration inside `Admin`

## Core concepts

### Item

The catalog definition of something the camp manages.

Examples:

- bottled water
- paint markers
- walkie-talkie
- extension cord

### Location

A physical or operational place where stock lives.

Examples:

- main storage
- kitchen closet
- van 2
- registration desk
- spring retreat staging room

### Stock

The current quantity of a bulk-tracked item at a location.

### Instance

A single serialized asset for durable equipment that needs individual custody.

Examples:

- walkie-talkie `RAD-014`
- projector `AV-003`

### Assignment

The current custody record for something checked out to a person or event.

### Transaction

The immutable source of truth for stock movement and corrections.

## Data model

### `inventory_locations`

Purpose: define where inventory can exist.

Key fields:

- `id uuid primary key`
- `name text not null`
- `code text unique not null`
- `location_type text not null`
  Suggested values: `storage`, `event`, `vehicle`, `room`, `temporary`
- `parent_location_id uuid null`
- `event_id uuid null references public.events(id)`
- `is_active boolean not null default true`
- `created_at timestamptz`
- `updated_at timestamptz`

Notes:

- `event_id` lets the system model temporary event staging areas without inventing a second location concept
- `parent_location_id` supports nesting such as `Main Storage > Shelf A`

### `inventory_items`

Purpose: catalog record for anything the team stocks or manages.

Key fields:

- `id uuid primary key`
- `sku text unique not null`
- `name text not null`
- `description text null`
- `category text not null`
- `item_type text not null`
  Suggested values: `consumable`, `durable`
- `tracking_mode text not null`
  Suggested values: `bulk`, `serial`
- `unit text not null default 'each'`
- `is_checkoutable boolean not null default false`
- `default_location_id uuid null references public.inventory_locations(id)`
- `minimum_stock numeric(12,2) null`
- `reorder_target numeric(12,2) null`
- `is_active boolean not null default true`
- `created_by uuid null references public.profiles(id)`
- `created_at timestamptz`
- `updated_at timestamptz`

Notes:

- `minimum_stock` is the default alert threshold for the item
- `tracking_mode = 'serial'` means the item uses per-unit instances instead of only aggregated stock

### `inventory_stock_levels`

Purpose: current bulk quantity for an item at a location.

Key fields:

- `id uuid primary key`
- `item_id uuid not null references public.inventory_items(id)`
- `location_id uuid not null references public.inventory_locations(id)`
- `quantity_on_hand numeric(12,2) not null default 0`
- `quantity_reserved numeric(12,2) not null default 0`
- `minimum_stock_override numeric(12,2) null`
- `last_counted_at timestamptz null`
- `updated_at timestamptz`
- `unique (item_id, location_id)`

Notes:

- This table is for bulk-tracked inventory
- `available_quantity` should be derived in queries as `quantity_on_hand - quantity_reserved`
- Location-specific thresholds can override the item default without needing a second config table

### `inventory_item_instances`

Purpose: represent individually tracked durable assets.

Key fields:

- `id uuid primary key`
- `item_id uuid not null references public.inventory_items(id)`
- `serial_number text null unique`
- `asset_tag text null unique`
- `current_location_id uuid null references public.inventory_locations(id)`
- `status text not null`
  Suggested values: `available`, `checked_out`, `repair`, `missing`, `retired`
- `condition_status text not null default 'good'`
  Suggested values: `good`, `damaged`, `repair`, `missing`
- `last_counted_at timestamptz null`
- `notes text null`
- `created_at timestamptz`
- `updated_at timestamptz`

Notes:

- Only items with `tracking_mode = 'serial'` should create rows here
- This lets the same system support both consumables and high-accountability assets

### `inventory_assignments`

Purpose: capture the current custody of checked-out inventory.

Key fields:

- `id uuid primary key`
- `item_id uuid not null references public.inventory_items(id)`
- `instance_id uuid null references public.inventory_item_instances(id)`
- `quantity numeric(12,2) not null default 1`
- `source_location_id uuid null references public.inventory_locations(id)`
- `assigned_to_profile_id uuid null references public.profiles(id)`
- `assigned_to_event_id uuid null references public.events(id)`
- `assigned_by uuid not null references public.profiles(id)`
- `due_back_at timestamptz null`
- `returned_at timestamptz null`
- `status text not null`
  Suggested values: `active`, `returned`, `overdue`, `cancelled`
- `notes text null`
- `created_at timestamptz`

Rules:

- Exactly one of `assigned_to_profile_id` or `assigned_to_event_id` should be present
- `instance_id` is required for serialized assets
- Bulk items can use `quantity` without an instance

### `inventory_transactions`

Purpose: immutable movement header for every inventory change.

Key fields:

- `id uuid primary key`
- `transaction_type text not null`
  Suggested values: `receive`, `checkout`, `return`, `transfer`, `adjustment`, `consume`, `writeoff`
- `actor_profile_id uuid not null references public.profiles(id)`
- `source_location_id uuid null references public.inventory_locations(id)`
- `destination_location_id uuid null references public.inventory_locations(id)`
- `related_profile_id uuid null references public.profiles(id)`
- `related_event_id uuid null references public.events(id)`
- `reason_code text not null`
- `notes text null`
- `created_at timestamptz not null default timezone('utc', now())`

Notes:

- This is the audit anchor for `C-05`
- `reason_code` should be required, especially for `adjustment`, `writeoff`, and `return`

### `inventory_transaction_lines`

Purpose: item-level detail for each transaction.

Key fields:

- `id uuid primary key`
- `transaction_id uuid not null references public.inventory_transactions(id) on delete cascade`
- `item_id uuid not null references public.inventory_items(id)`
- `instance_id uuid null references public.inventory_item_instances(id)`
- `quantity numeric(12,2) not null`
- `condition_after text null`
- `notes text null`

Rules:

- Bulk lines use `quantity`
- Serialized lines use `instance_id` and normally `quantity = 1`
- Delete should cascade from the header, but the header itself should never be deleted in normal operations

## Derived views

These should be implemented as SQL views once the base tables exist.

### `inventory_low_stock_view`

Purpose: highlight where available quantity is below threshold.

Fields:

- `item_id`
- `location_id`
- `available_quantity`
- `effective_threshold`
- `shortage_amount`

Threshold logic:

- use `inventory_stock_levels.minimum_stock_override` when present
- otherwise use `inventory_items.minimum_stock`

### `inventory_audit_view`

Purpose: power the historical report in `C-05`.

Fields:

- transaction timestamp
- actor display name
- transaction type
- reason code
- item
- quantity
- source location
- destination location
- related event
- related profile
- notes

## Write strategy

Inventory writes should not be handled by ad hoc table updates from the UI.

Recommended pattern:

- client components trigger server actions
- server actions call a single Postgres function such as `apply_inventory_transaction(...)`
- that function inserts the transaction header and lines
- the same function updates stock levels or item instances atomically
- the same function opens or closes assignments when relevant

This is important because inventory state is derived from movement, and partial writes would create silent stock drift.

## Validation rules

- Normal flows must not produce negative stock
- Only `admin` and `super_admin` should be allowed to create manual adjustments that reduce stock below zero, and even that should be discouraged
- `tracking_mode = 'serial'` items must use instances for check-out and return flows
- `durable` items should normally be `is_checkoutable = true`
- `consumable` items can be checked out to an event, but they should usually reduce stock rather than stay in long-running personal assignments
- Transactions are append-only; corrections happen through a new adjustment, not mutation of old history
- Catalog rows should be archived, not deleted

## RLS strategy

Follow the same style already used by `tasks`, `events`, and `checkins`.

Recommended policies:

- `inventory_items`, `inventory_locations`, `inventory_stock_levels`, `inventory_item_instances`
  `staff`, `admin`, and `super_admin` can read
- `inventory_items` and `inventory_locations`
  only `admin` and `super_admin` can insert or update
- `inventory_transactions`, `inventory_transaction_lines`, `inventory_assignments`
  `staff`, `admin`, and `super_admin` can insert through server-side mutation paths
- updates or deletes on transactions should be blocked at the policy layer

Use `public.current_profile_id()` and `public.has_any_role(...)` for consistency with the current schema.

## UI design

### Inventory catalog

Primary screen for `C-02`.

Should show:

- item name and SKU
- category
- stock status
- primary location
- low-stock flag
- tracking mode

Useful filters:

- location
- category
- consumable vs durable
- low stock only
- available for checkout

### Item detail

Should show:

- item summary
- stock by location
- active assignments
- recent transaction history
- threshold settings

### Transaction flows

Primary flows for `C-03`:

- receive stock
- check out to person
- check out to event
- return stock
- transfer between locations
- adjust quantity with reason
- mark item missing or damaged

### Alerts and reporting

For `C-04` and `C-05`:

- low-stock badge in catalog
- dashboard card for low-stock item count
- audit report filters by item, location, actor, event, date range, and transaction type

## Event integration

Inventory should integrate with events in two ways:

- locations can optionally belong to an event staging area
- transactions and assignments can link to an event

That allows questions like:

- what supplies were staged for Spring Retreat
- which radios are currently assigned to this event
- what was consumed during this camp weekend

## Seed data recommendation

Once implemented, seed inventory should include a small but mixed dataset:

- consumables: bottled water, paper wristbands, name tags
- durable assets: walkie-talkies, clipboards, extension cords
- locations: main storage, welcome desk, van 1, retreat staging room
- sample transactions: receive, checkout, return, transfer, adjustment

## Delivery sequence

### `C-01`

- create tables
- create enums or text checks
- add triggers for `updated_at`
- add RLS policies
- seed a representative sample set

### `C-02`

- add `/inventory`
- add `/inventory/[itemId]`
- add catalog filters and stock summary cards

### `C-03`

- add transaction server actions
- add the transactional SQL function
- add check-out, return, transfer, and adjustment UI

### `C-04`

- add low-stock view
- surface low-stock badges and dashboard summary

### `C-05`

- add historical report screen backed by immutable transactions

## Recommended first implementation cut

To keep scope healthy, the first build should ship with:

- bulk stock tracking
- optional serialized asset support in the schema
- staff-facing catalog
- admin-managed catalog and locations
- receive, checkout, return, transfer, and adjustment
- low-stock view
- immutable audit history

That is enough to make inventory operational without drifting into procurement, maintenance, or bundle logic too early.
