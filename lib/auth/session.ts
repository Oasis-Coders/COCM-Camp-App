import { cookies } from "next/headers";

import type { AppRole } from "@/lib/app-config";

export type DemoSession = {
  isAuthenticated: boolean;
  role: AppRole;
  email: string;
  displayName: string;
  mode: "demo" | "supabase";
};

const defaultRole: AppRole = "participant";

function normalizeRole(value: string | undefined): AppRole {
  if (value === "super_admin" || value === "admin" || value === "staff" || value === "participant") {
    return value;
  }

  return defaultRole;
}

export async function getSession(): Promise<DemoSession> {
  const store = await cookies();
  const authCookie = store.get("camp-demo-auth")?.value;
  const role = normalizeRole(store.get("camp-demo-role")?.value);
  const email = store.get("camp-demo-email")?.value ?? "participant@demo.local";
  const displayName = store.get("camp-demo-name")?.value ?? "Demo User";

  return {
    isAuthenticated: authCookie === "true",
    role,
    email,
    displayName,
    mode: process.env.NEXT_PUBLIC_SUPABASE_URL ? "supabase" : "demo"
  };
}

export async function hasElevatedAccess() {
  const session = await getSession();
  return session.role === "super_admin" || session.role === "admin" || session.role === "staff";
}
