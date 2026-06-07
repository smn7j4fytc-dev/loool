'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { setToken, getUser } from '@/lib/auth';

export default function AdminLogin() {
  const router = useRouter();
  const [form, setForm] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const user = getUser();
    if (user) {
      if (user.role === 'SUPER_ADMIN') router.replace('/super');
      else if (user.role === 'STAFF') router.replace('/staff');
      else router.replace('/admin/dashboard');
    }
  }, [router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Credenciales incorrectas');
      setToken(json.token);
      const { role } = json.user;
      if (role === 'STAFF') router.push('/staff');
      else if (role === 'SUPER_ADMIN') router.push('/super');
      else router.push('/admin/dashboard');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="h-14 w-14 bg-brand-500 rounded-2xl mx-auto mb-4 flex items-center justify-center">
            <span className="text-white text-2xl font-bold">L</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Loyalty SaaS</h1>
          <p className="text-sm text-gray-500 mt-1">Panel de administración</p>
        </div>

        <div className="card p-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-6">Iniciar sesión</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Correo</label>
              <input
                type="email"
                autoComplete="email"
                placeholder="admin@tu-negocio.com"
                value={form.email}
                onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                className="input"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Contraseña</label>
              <input
                type="password"
                autoComplete="current-password"
                placeholder="••••••••"
                value={form.password}
                onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                className="input"
                required
              />
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">
                {error}
              </div>
            )}

            <button type="submit" disabled={loading} className="btn-primary w-full py-2.5">
              {loading ? 'Entrando...' : 'Entrar'}
            </button>
          </form>

          {/* Hint de usuarios de prueba */}
          <div className="mt-6 pt-6 border-t border-gray-100">
            <p className="text-xs text-gray-400 text-center font-medium mb-2">Usuarios de prueba (seed)</p>
            <div className="grid grid-cols-1 gap-1 text-xs text-gray-400">
              <p>Admin: admin@cafeteria-demo.com / demo123</p>
              <p>Staff: staff@cafeteria-demo.com / staff123</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
