'use client';

import { signOut } from '@/app/auth/sign-out-action';

export function SignOutButton() {
  return (
    <form action={signOut} className="w-full">
      <button
        type="submit"
        className="flex w-full items-center justify-between rounded-xl border border-camp-forest/10 bg-camp-sand/30 px-4 py-3 text-left transition-all hover:border-camp-forest/20 hover:bg-camp-sand/50 hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-camp-moss/30"
      >
        <span>
          <span className="block text-sm font-semibold text-camp-forest">Sign out</span>
          <span className="mt-0.5 block text-xs text-camp-moss">End this session</span>
        </span>
        <span className="rounded-[10px] bg-white px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-camp-moss shadow-sm">
          Exit
        </span>
      </button>
    </form>
  );
}
