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
      className={`inline-flex min-w-[92px] items-center justify-center rounded-full px-3 py-2 text-sm font-semibold transition disabled:cursor-wait disabled:opacity-70 ${
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
    <form
      ref={formRef}
      action={formAction}
      className="grid gap-2"
    >
      <input type="hidden" name="itemId" value={itemId} />
      <input type="hidden" name="type" value={type} />

      {statusMessage ? (
        <section
          className={`rounded-[14px] border px-2.5 py-1.5 text-[11px] ${toneClasses(statusMessage.tone)}`}
        >
          {statusMessage.text}
        </section>
      ) : null}

      <div className="grid gap-2 md:grid-cols-[auto_108px_92px] md:items-center">
        <p className="text-sm font-semibold text-camp-forest">{label}</p>

        <label className="grid gap-1 text-sm text-slate-700">
          <span className="text-[11px] font-medium uppercase tracking-[0.14em] text-camp-moss">
            Qty
          </span>
          <input
            type="number"
            name="quantity"
            min="1"
            step="1"
            required
            className="rounded-full border border-camp-forest/10 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-camp-moss focus:ring-2 focus:ring-camp-sky/60"
          />
        </label>

        <SubmitButton label={label} tone={tone} />
      </div>
    </form>
  );
}
