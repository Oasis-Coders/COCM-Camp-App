'use client';

import { startTransition, useActionState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useFormStatus } from 'react-dom';

import { getInventoryStatusMessage } from '@/lib/inventory/inventory-utils';

import { deleteInventoryItem, type InventoryActionState } from './actions';

const initialInventoryActionState: InventoryActionState = {
  status: null,
  submittedAt: null,
};

function DeleteSubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      aria-label={pending ? 'Deleting item' : 'Delete item'}
      title={pending ? 'Deleting item' : 'Delete item'}
      className="inline-flex size-10 items-center justify-center rounded-full border border-camp-forest/10 bg-camp-sand/35 text-camp-moss shadow-sm transition hover:-translate-y-0.5 hover:border-camp-moss/25 hover:bg-camp-sand/55 hover:text-camp-forest disabled:cursor-wait disabled:opacity-70"
    >
      <svg
        aria-hidden="true"
        className="size-4"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
        viewBox="0 0 24 24"
      >
        <path d="M9 4h6" />
        <path d="M10 4l.5-1h3L14 4" />
        <path d="M5 7h14" />
        <path d="M8 7l.8 13h6.4L16 7" />
        <path d="M10.5 10.5v6" />
        <path d="M13.5 10.5v6" />
      </svg>
      <span className="sr-only">{pending ? 'Deleting item' : 'Delete item'}</span>
    </button>
  );
}

export function DeleteItemButton({
  itemId,
  itemName,
  sku,
}: {
  itemId: string;
  itemName: string;
  sku: string;
}) {
  const router = useRouter();
  const [state, formAction] = useActionState(deleteInventoryItem, initialInventoryActionState);
  const statusMessage = getInventoryStatusMessage(state.status ?? undefined);

  useEffect(() => {
    if (!state.submittedAt || state.status !== 'item-deleted') {
      return;
    }

    startTransition(() => {
      router.refresh();
    });
  }, [router, state.status, state.submittedAt]);

  return (
    <div className="grid justify-items-end gap-1.5">
      {statusMessage ? (
        <div
          className={`max-w-[200px] rounded-[14px] border px-2.5 py-1.5 text-right text-[11px] ${
            statusMessage.tone === 'success'
              ? 'border-emerald-200 bg-emerald-50/90 text-emerald-900'
              : 'border-rose-200 bg-rose-50/90 text-rose-900'
          }`}
        >
          {statusMessage.text}
        </div>
      ) : null}

      <form
        action={formAction}
        onSubmit={(event) => {
          if (
            !window.confirm(
              `Delete item "${itemName}" (${sku})? This will remove its stock and history.`
            )
          ) {
            event.preventDefault();
          }
        }}
      >
        <input type="hidden" name="itemId" value={itemId} />
        <DeleteSubmitButton />
      </form>
    </div>
  );
}
