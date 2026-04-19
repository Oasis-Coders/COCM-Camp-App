'use client';

import { useDeferredValue, useState } from 'react';

import {
  filterInventoryStockItems,
  type InventoryStockItem,
  type InventoryStockSearchFilter,
} from '@/lib/inventory/inventory-utils';

import { DeleteItemButton } from './delete-item-button';
import { StockMovementForm } from './stock-movement-form';

type StockSearchListProps = {
  items: InventoryStockItem[];
};

const filterOptions: { value: InventoryStockSearchFilter; label: string }[] = [
  { value: 'name', label: 'Name' },
  { value: 'sku', label: 'SKU' },
];

export function StockSearchList({ items }: StockSearchListProps) {
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<InventoryStockSearchFilter>('name');
  const deferredQuery = useDeferredValue(query);
  const filteredItems = filterInventoryStockItems(items, deferredQuery, filter);

  return (
    <div className="grid gap-4">
      <section className="rounded-card border border-camp-forest/10 bg-white p-3 shadow-[inset_0_0_0_1px_rgba(12,58,42,0.02)]">
        <div className="grid gap-3 lg:grid-cols-[1fr_auto] lg:items-center">
          <label className="relative block">
            <span className="sr-only">Search stock by {filter}</span>
            <svg
              aria-hidden="true"
              className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-camp-moss"
              fill="none"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="1.8"
              viewBox="0 0 24 24"
            >
              <path d="m21 21-4.3-4.3" />
              <circle cx="11" cy="11" r="7" />
            </svg>
            <input
              type="search"
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
              }}
              placeholder={`Search by ${filter === 'sku' ? 'SKU' : 'name'}`}
              className="h-12 w-full rounded-full border border-camp-forest/10 bg-camp-sky/10 pl-11 pr-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-camp-moss/40 focus:bg-white focus:ring-2 focus:ring-camp-sky/60"
            />
          </label>

          <div
            aria-label="Choose stock search filter"
            className="inline-grid grid-cols-2 rounded-full border border-camp-forest/10 bg-camp-sand/25 p-1"
            role="group"
          >
            {filterOptions.map((option) => (
              <button
                key={option.value}
                type="button"
                aria-pressed={filter === option.value}
                onClick={() => {
                  setFilter(option.value);
                }}
                className={`rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] transition ${
                  filter === option.value
                    ? 'bg-camp-forest text-white shadow-sm'
                    : 'text-camp-moss hover:bg-white/70 hover:text-camp-forest'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        <p className="mt-3 px-2 text-xs text-camp-moss" aria-live="polite">
          Showing {filteredItems.length} of {items.length} stock items.
        </p>
      </section>

      {filteredItems.length === 0 ? (
        <div className="rounded-[22px] border border-dashed border-camp-forest/20 bg-white/75 p-5 text-sm text-camp-moss">
          No stock items match this {filter} search.
        </div>
      ) : (
        filteredItems.map((item) => (
          <article key={item.id} className="rounded-card border border-camp-forest/10 bg-white p-4">
            <div className="grid gap-3 xl:grid-cols-[minmax(120px,1fr)_112px_minmax(205px,1fr)_minmax(215px,1fr)_40px] xl:items-center">
              <div className="min-w-0">
                <p className="truncate text-lg font-semibold text-camp-forest">{item.name}</p>
                <span className="mt-1 inline-flex rounded-full bg-camp-sky/60 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-camp-forest">
                  {item.sku}
                </span>
              </div>

              <div className="rounded-[18px] bg-camp-sand/25 px-3 py-2 text-sm text-camp-moss shadow-[inset_0_0_0_1px_rgba(12,58,42,0.03)]">
                <p className="text-[11px] uppercase tracking-[0.16em] text-camp-moss">Stock</p>
                <p className="mt-1 text-xl font-semibold text-camp-forest">{item.quantity}</p>
              </div>

              <div className="rounded-[18px] border border-camp-forest/10 bg-camp-sky/15 p-2">
                <StockMovementForm itemId={item.id} type="in" tone="primary" label="In" />
              </div>

              <div className="rounded-[18px] border border-camp-forest/10 bg-camp-sand/25 p-2">
                <StockMovementForm itemId={item.id} type="out" tone="secondary" label="Out" />
              </div>

              <DeleteItemButton itemId={item.id} itemName={item.name} sku={item.sku} />
            </div>
          </article>
        ))
      )}
    </div>
  );
}
