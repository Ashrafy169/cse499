export type UserRole = "super_admin" | "billing_staff" | "support_staff" | "customer";

export interface AuthUser {
  user_id: string;
  email: string;
  full_name: string;
  role: UserRole;
  customer_id: string | null;
  access_token: string;
}

const AUTH_KEY = "amberit_auth";

export function saveAuth(data: AuthUser): void {
  localStorage.setItem(AUTH_KEY, JSON.stringify(data));
}

export function getAuth(): AuthUser | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(AUTH_KEY);
    return raw ? (JSON.parse(raw) as AuthUser) : null;
  } catch {
    return null;
  }
}

export function clearAuth(): void {
  localStorage.removeItem(AUTH_KEY);
}

export function getToken(): string | null {
  return getAuth()?.access_token ?? null;
}

export function canWrite(role: UserRole): boolean {
  return role === "super_admin" || role === "billing_staff";
}

export function isAdmin(role: UserRole): boolean {
  return role === "super_admin";
}

export function isStaff(role: UserRole): boolean {
  return role !== "customer";
}
