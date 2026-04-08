'use client';

import { signOut } from '@/app/auth/sign-out-action';

export function SignOutButton() {
  return (
    <form action={signOut}>
      <button
        type="submit"
        className="w-full rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm font-semibold text-red-600 transition hover:bg-red-100"
      >
        Sign out
      </button>
    </form>
  );
}
