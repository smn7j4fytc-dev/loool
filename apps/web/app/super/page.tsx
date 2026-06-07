'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getUser, logout } from '@/lib/auth';
import { api } from '@/lib/api';

interface Business {
  id: string;
  slug: string;
  name: string;
  adminEmail: string;
  plan: string;
  active: boolean;
  cardType: string;
  primaryColor: string;
  createdAt: string;
  _count: { customers: number; visits: number };
}

const PLAN_COLORS: Record<string, string> = {
  FREE: 'bg-gray-100 text-gray-600',
  STARTER: 'bg-blue-100 text-blue-700',
  PRO: 'bg-brand-100 text-brand-700',
  ENTERPRISE: 'bg-yellow-100 text-yellow-700',
};

export default function SuperAdmin() {
  const router = useRouter();
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ slug: '', name: '', adminEmail: '', adminPassword: '', cardType: 'PUNCH', plan: 'FREE' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const user = getUser();
    if (!user || user.role !== 'SUPER_ADMIN') {
      router.replace('/admin/login');
      return;
    }
    loadBusinesses();
  }, [router]);

  function loadBusinesses() {
    api.get<{ data: Business[] }>('/api/businesses')
      .then(res => setBusinesses(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      await api.post('/api/businesses', form);
      setShowCreate(false);
      setForm({ slug: '', name: '', adminEmail: '', adminPassword: '', cardType: 'PUNCH', plan: 'FREE' });
      loadBusinesses();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al crear');
    } finally {
      setSaving(false);
    }
  }

  const total = { customers: businesses.reduce((s, b) => s + b._count.customers, 0), visits: businesses.reduce((s, b) => s + b._count.visits, 0) };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 bg-brand-500 rounded-xl flex items-center justify-center">
            <span className="text-white text-sm font-bold">L</span>
          </div>
          <div>
            <p className="text-sm font-bold text-gray-900">Loyalty SaaS</p>
            <p className="text-xs text-gray-400">Super Admin</p>
          </div>
        </div>
        <button onClick={() => { logout(); router.push('/admin/login'); }}
          className="text-sm text-gray-500 hover:text-red-600 transition-colors">
          Cerrar sesión
        </button>
      </header>

      <div className="max-w-6xl mx-auto p-6">
        {/* KPIs */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="stat-card">
            <p className="text-xs text-gray-500">Negocios</p>
            <p className="text-2xl font-bold text-brand-600">{businesses.length}</p>
          </div>
          <div className="stat-card">
            <p className="text-xs text-gray-500">Clientes totales</p>
            <p className="text-2xl font-bold text-gray-900">{total.customers}</p>
          </div>
          <div className="stat-card">
            <p className="text-xs text-gray-500">Visitas totales</p>
            <p className="text-2xl font-bold text-gray-900">{total.visits}</p>
          </div>
        </div>

        {/* Create business */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-gray-900">Negocios</h2>
          <button onClick={() => setShowCreate(s => !s)} className="btn-primary text-sm py-2 px-4">
            {showCreate ? 'Cancelar' : '+ Nuevo negocio'}
          </button>
        </div>

        {showCreate && (
          <div className="card p-6 mb-6">
            <h3 className="text-sm font-semibold text-gray-900 mb-4">Crear negocio</h3>
            <form onSubmit={handleCreate} className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Slug (URL)</label>
                <input type="text" className="input" required placeholder="mi-negocio"
                  pattern="[a-z0-9-]+" title="Solo letras minúsculas, números y guiones"
                  value={form.slug} onChange={e => setForm(f => ({ ...f, slug: e.target.value.toLowerCase() }))} />
                <p className="text-xs text-gray-400 mt-1">/r/{form.slug || 'mi-negocio'}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nombre</label>
                <input type="text" className="input" required placeholder="Mi Cafetería"
                  value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email del admin</label>
                <input type="email" className="input" required
                  value={form.adminEmail} onChange={e => setForm(f => ({ ...f, adminEmail: e.target.value }))} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Contraseña del admin</label>
                <input type="password" className="input" required minLength={8}
                  value={form.adminPassword} onChange={e => setForm(f => ({ ...f, adminPassword: e.target.value }))} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de tarjeta</label>
                <select className="input" value={form.cardType} onChange={e => setForm(f => ({ ...f, cardType: e.target.value }))}>
                  <option value="PUNCH">Sellos (Punch)</option>
                  <option value="POINTS">Puntos</option>
                  <option value="CASHBACK">Cashback</option>
                  <option value="DISCOUNT">Descuento</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Plan</label>
                <select className="input" value={form.plan} onChange={e => setForm(f => ({ ...f, plan: e.target.value }))}>
                  <option value="FREE">Free</option>
                  <option value="STARTER">Starter</option>
                  <option value="PRO">Pro</option>
                  <option value="ENTERPRISE">Enterprise</option>
                </select>
              </div>
              {error && <div className="sm:col-span-2 text-red-600 text-sm bg-red-50 rounded-lg p-3">{error}</div>}
              <div className="sm:col-span-2">
                <button type="submit" disabled={saving} className="btn-primary py-2 px-6 text-sm">
                  {saving ? 'Creando...' : 'Crear negocio'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Business list */}
        <div className="card overflow-hidden">
          {loading ? (
            <div className="p-4 space-y-3">{[...Array(4)].map((_, i) => <div key={i} className="h-16 bg-gray-100 rounded animate-pulse" />)}</div>
          ) : businesses.length === 0 ? (
            <div className="p-8 text-center text-gray-400">No hay negocios aún</div>
          ) : (
            <div className="divide-y divide-gray-100">
              {businesses.map(b => (
                <div key={b.id} className="flex items-center gap-4 px-5 py-4 hover:bg-gray-50 transition-colors">
                  <div className="h-10 w-10 rounded-xl flex-shrink-0 flex items-center justify-center font-bold text-white"
                    style={{ backgroundColor: b.primaryColor }}>
                    {b.name[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-gray-900">{b.name}</p>
                      <span className={`badge ${PLAN_COLORS[b.plan] ?? ''}`}>{b.plan}</span>
                      {!b.active && <span className="badge bg-red-100 text-red-700">Inactivo</span>}
                    </div>
                    <p className="text-xs text-gray-500">{b.adminEmail} · /{b.slug}</p>
                  </div>
                  <div className="text-right text-xs text-gray-500 flex-shrink-0">
                    <p className="font-semibold text-gray-700">{b._count.customers} clientes</p>
                    <p>{b._count.visits} visitas</p>
                  </div>
                  <a href={`/r/${b.slug}`} target="_blank" rel="noopener noreferrer"
                    className="text-xs text-brand-600 hover:underline flex-shrink-0">
                    Landing →
                  </a>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
