'use client';

import { signOut } from '@/app/auth/sign-out-action';

export function SignOutButton() {
  return (
    <form action={signOut} className="w-full">
      <button
        type="submit"
        className="flex w-full items-center justify-between rounded-2xl border border-camp-forest/10 bg-camp-sand/35 px-4 py-3 text-left transition hover:border-camp-forest/20 hover:bg-camp-sand/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-camp-forest/20"
      >
        <span>
          <span className="block font-semibold text-camp-forest">Sign out</span>
          <span className="mt-0.5 block text-xs text-slate-600">End this session</span>
        </span>
        <span className="rounded-full bg-white/80 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-camp-moss">
          Exit
        </span>
      </button>
    </form>
  );
}
