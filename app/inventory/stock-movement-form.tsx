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
      className={`inline-flex items-center justify-center rounded-full px-4 py-2.5 text-sm font-semibold transition disabled:cursor-wait disabled:opacity-70 ${
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
  quantityLabel,
  type,
  tone,
}: {
  itemId: string;
  label: string;
  quantityLabel: string;
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
      className={`grid gap-3 rounded-[20px] border border-camp-forest/10 p-4 ${
        tone === 'primary' ? 'bg-camp-sky/15' : 'bg-camp-sand/25'
      }`}
    >
      <input type="hidden" name="itemId" value={itemId} />
      <input type="hidden" name="type" value={type} />

      {statusMessage ? (
        <section
          className={`rounded-[18px] border px-3 py-2 text-xs ${toneClasses(statusMessage.tone)}`}
        >
          {statusMessage.text}
        </section>
      ) : null}

      <label className="grid gap-2 text-sm text-slate-700">
        <span className="font-medium text-camp-forest">{quantityLabel}</span>
        <input
          type="number"
          name="quantity"
          min="1"
          step="1"
          required
          className="rounded-2xl border border-camp-forest/10 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-camp-moss focus:ring-2 focus:ring-camp-sky/60"
        />
      </label>

      <SubmitButton label={label} tone={tone} />
    </form>
  );
}
