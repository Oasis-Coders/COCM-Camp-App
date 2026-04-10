'use client';

import { startTransition, useActionState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useFormStatus } from 'react-dom';

import { getInventoryStatusMessage } from '@/lib/inventory/inventory-utils';

import { applyInventoryMovement, type InventoryActionState } from './actions';

const initialInventoryActionState: InventoryActionState = {
  status: null,
  submittedAt: null,
};

function toneClasses(tone: 'success' | 'error') {
  if (tone === 'success') {
    return 'border-emerald-200 bg-emerald-50/90 text-emerald-900';
  }

  return 'border-rose-200 bg-rose-50/90 text-rose-900';
}

function SubmitButton({ label, tone }: { label: string; tone: 'primary' | 'secondary' }) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className={`inline-flex min-w-[70px] items-center justify-center rounded-full px-3 py-2 text-sm font-semibold transition disabled:cursor-wait disabled:opacity-70 ${
        tone === 'primary'
          ? 'bg-camp-forest text-white hover:bg-camp-forest/90'
          : 'bg-camp-sand/65 text-camp-forest hover:bg-camp-sand'
      }`}
    >
      {pending ? 'Saving...' : label}
    </button>
  );
}

export function StockMovementForm({
  itemId,
  label,
  type,
  tone,
}: {
  itemId: string;
  label: string;
  type: 'in' | 'out';
  tone: 'primary' | 'secondary';
}) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [state, formAction] = useActionState(applyInventoryMovement, initialInventoryActionState);
  const statusMessage = getInventoryStatusMessage(state.status ?? undefined);
  const isSuccess = state.status === 'stock-in' || state.status === 'stock-out';
  const submitLabel = type === 'in' ? 'Add' : 'Remove';

  useEffect(() => {
    if (!state.submittedAt || !isSuccess) {
      return;
    }

    formRef.current?.reset();
    startTransition(() => {
      router.refresh();
    });
  }, [isSuccess, router, state.submittedAt]);

  return (
    <form ref={formRef} action={formAction} className="grid gap-2">
      <input type="hidden" name="itemId" value={itemId} />
      <input type="hidden" name="type" value={type} />

      {statusMessage ? (
        <section
          className={`rounded-[14px] border px-2.5 py-1.5 text-[11px] ${toneClasses(statusMessage.tone)}`}
        >
          {statusMessage.text}
        </section>
      ) : null}

      <div className="grid grid-cols-[auto_minmax(58px,1fr)_auto] items-center gap-2">
        <p className="shrink-0 text-sm font-semibold text-camp-forest">{label}</p>

        <label className="min-w-0 flex-1 text-sm text-slate-700">
          <span className="sr-only">{label} quantity</span>
          <input
            type="number"
            name="quantity"
            aria-label={`${label} quantity`}
            min="1"
            step="1"
            required
            placeholder="Qty"
            className="h-10 w-full rounded-full border border-camp-forest/10 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-camp-moss focus:ring-2 focus:ring-camp-sky/60"
          />
        </label>

        <SubmitButton label={submitLabel} tone={tone} />
      </div>
    </form>
  );
}
