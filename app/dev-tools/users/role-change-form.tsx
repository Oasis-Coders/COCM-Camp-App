'use client';

import { useActionState, useEffect, useState } from 'react';
import { useFormStatus } from 'react-dom';

import { appRoles, type AppRole } from '@/lib/app-config';

import { changeUserRole, type ChangeUserRoleState } from './actions';

const initialState: ChangeUserRoleState = {
  status: 'idle',
  message: null,
  role: null,
  submittedAt: null,
};

function normalizeSelectRole(value: string): AppRole {
  return appRoles.includes(value as AppRole) ? (value as AppRole) : 'participant';
}

function SaveButton() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-xl bg-camp-forest px-3 py-2 text-sm font-semibold text-white transition hover:bg-camp-moss disabled:cursor-wait disabled:opacity-70"
    >
      {pending ? 'Saving...' : 'Save'}
    </button>
  );
}

export function RoleChangeForm({
  authUserId,
  currentAuthUserId,
  initialRole,
}: {
  authUserId: string;
  currentAuthUserId: string;
  initialRole: AppRole;
}) {
  const [selectedRole, setSelectedRole] = useState<AppRole>(initialRole);
  const [state, formAction] = useActionState(changeUserRole, initialState);
  const messageTone =
    state.status === 'success'
      ? 'border-emerald-200 bg-emerald-50/90 text-emerald-900'
      : 'border-rose-200 bg-rose-50/90 text-rose-900';

  useEffect(() => {
    if (state.status === 'success' && state.role) {
      setSelectedRole(normalizeSelectRole(state.role));
    }
  }, [state.role, state.status]);

  useEffect(() => {
    setSelectedRole(initialRole);
  }, [initialRole]);

  return (
    <form action={formAction} className="space-y-2">
      <input type="hidden" name="userId" value={authUserId} />
      <input type="hidden" name="currentUserId" value={currentAuthUserId} />
      <label
        htmlFor={`role-${authUserId}`}
        className="block text-xs font-semibold uppercase tracking-[0.2em] text-camp-moss"
      >
        Change role
      </label>
      <div className="flex gap-2">
        <select
          id={`role-${authUserId}`}
          name="role"
          value={selectedRole}
          onChange={(event) => {
            setSelectedRole(normalizeSelectRole(event.target.value));
          }}
          className="w-full rounded-xl border border-camp-forest/15 px-3 py-2 text-sm outline-none focus:border-camp-forest/40"
        >
          {appRoles.map((role) => (
            <option key={role} value={role}>
              {role.replace('_', ' ')}
            </option>
          ))}
        </select>
        <SaveButton />
      </div>
      {state.message ? (
        <p className={`rounded-xl border px-3 py-2 text-xs ${messageTone}`} aria-live="polite">
          {state.message}
        </p>
      ) : null}
    </form>
  );
}
