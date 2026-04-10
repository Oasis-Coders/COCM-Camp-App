'use client';

import { startTransition, useActionState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useFormStatus } from 'react-dom';

import { getInventoryStatusMessage } from '@/lib/inventory/inventory-utils';

import { createInventoryItem, type InventoryActionState } from './actions';

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

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex items-center justify-center rounded-full bg-camp-forest px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-camp-forest/90 disabled:cursor-wait disabled:opacity-70"
    >
      {pending ? 'Adding...' : 'Add item'}
    </button>
  );
}

export function CreateItemForm() {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [state, formAction] = useActionState(createInventoryItem, initialInventoryActionState);
  const statusMessage = getInventoryStatusMessage(state.status ?? undefined);

  useEffect(() => {
    if (!state.submittedAt || state.status !== 'item-created') {
      return;
    }

    formRef.current?.reset();
    startTransition(() => {
      router.refresh();
    });
  }, [router, state.status, state.submittedAt]);

  return (
    <form ref={formRef} action={formAction} className="grid gap-4">
      {statusMessage ? (
        <section
          className={`rounded-[20px] border px-4 py-3 text-sm ${toneClasses(statusMessage.tone)}`}
        >
          {statusMessage.text}
        </section>
      ) : null}

      <label className="grid gap-2 text-sm text-slate-700">
        <span className="font-medium text-camp-forest">Item name</span>
        <input
          type="text"
          name="name"
          required
          className="rounded-2xl border border-camp-forest/10 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-camp-moss focus:ring-2 focus:ring-camp-sky/60"
        />
      </label>

      <label className="grid gap-2 text-sm text-slate-700">
        <span className="font-medium text-camp-forest">SKU</span>
        <input
          type="text"
          name="sku"
          required
          placeholder="ITEM-001"
          className="rounded-2xl border border-camp-forest/10 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-camp-moss focus:ring-2 focus:ring-camp-sky/60"
        />
      </label>

      <SubmitButton />
    </form>
  );
}
