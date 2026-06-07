function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('loyalty_token');
}

export async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options?.headers as Record<string, string> || {}),
  };

  // Usa proxy de Next.js (/api/*) → Fastify; no necesita la URL completa
  const res = await fetch(path, { ...options, headers });

  if (!res.ok) {
    let message = `HTTP ${res.status}`;
    try {
      const body = await res.json();
      message = body.error || message;
    } catch { /* ignore */ }
    const err = new Error(message);
    (err as Error & { status: number }).status = res.status;
    throw err;
  }

  return res.json();
}

export const api = {
  get:    <T>(path: string)              => apiFetch<T>(path),
  post:   <T>(path: string, body: unknown) => apiFetch<T>(path, { method: 'POST',  body: JSON.stringify(body) }),
  patch:  <T>(path: string, body: unknown) => apiFetch<T>(path, { method: 'PATCH', body: JSON.stringify(body) }),
  delete: <T>(path: string)              => apiFetch<T>(path, { method: 'DELETE' }),
};
