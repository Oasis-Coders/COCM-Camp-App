'use client';

import { startTransition, useActionState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useFormStatus } from 'react-dom';

import { getInventoryStatusMessage } from '@/lib/inventory/inventory-utils';

import { clearInventoryHistory, type InventoryActionState } from '../actions';

const initialInventoryActionState: InventoryActionState = {
  status: null,
  submittedAt: null,
};

function ClearSubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex items-center justify-center rounded-full border border-camp-forest/10 bg-camp-sand/35 px-4 py-2.5 text-sm font-semibold text-camp-forest transition hover:bg-camp-sand/55 disabled:cursor-wait disabled:opacity-70"
    >
      {pending ? 'Clearing...' : 'Clear history'}
    </button>
  );
}

export function ClearHistoryButton() {
  const router = useRouter();
  const [state, formAction] = useActionState(clearInventoryHistory, initialInventoryActionState);
  const statusMessage = getInventoryStatusMessage(state.status ?? undefined);

  useEffect(() => {
    if (!state.submittedAt || state.status !== 'history-cleared') {
      return;
    }

    startTransition(() => {
      router.refresh();
    });
  }, [router, state.status, state.submittedAt]);

  return (
    <div className="grid gap-2 sm:justify-items-end">
      {statusMessage ? (
        <div
          className={`rounded-[14px] border px-3 py-2 text-xs ${
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
          if (!window.confirm('Clear all inventory history? This cannot be undone.')) {
            event.preventDefault();
          }
        }}
      >
        <ClearSubmitButton />
      </form>
    </div>
  );
}
