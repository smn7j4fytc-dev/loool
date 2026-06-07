export interface AuthUser {
  sub: string;
  email: string;
  role: 'SUPER_ADMIN' | 'BUSINESS_ADMIN' | 'STAFF';
  businessId?: string;
}

export function getUser(): AuthUser | null {
  if (typeof window === 'undefined') return null;
  const token = localStorage.getItem('loyalty_token');
  if (!token) return null;
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
    if (typeof payload.exp === 'number' && payload.exp * 1000 < Date.now()) {
      logout();
      return null;
    }
    return payload as AuthUser;
  } catch {
    return null;
  }
}

export function setToken(token: string): void {
  localStorage.setItem('loyalty_token', token);
}

export function logout(): void {
  localStorage.removeItem('loyalty_token');
}
