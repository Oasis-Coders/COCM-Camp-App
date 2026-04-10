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
      className="inline-flex items-center justify-center rounded-full border border-rose-200 bg-[#fff7f3] px-4 py-2 text-sm font-semibold text-[#8b4b3b] transition hover:border-rose-300 hover:bg-[#ffefe7] disabled:cursor-wait disabled:opacity-70"
    >
      {pending ? 'Deleting...' : 'Delete'}
    </button>
  );
}

export function DeleteItemButton({ itemId, itemName }: { itemId: string; itemName: string }) {
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
    <div className="grid justify-items-end gap-2">
      {statusMessage ? (
        <div
          className={`max-w-[220px] rounded-[18px] border px-3 py-2 text-right text-xs ${
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
          if (!window.confirm(`Delete ${itemName}? This will remove its stock and history.`)) {
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
