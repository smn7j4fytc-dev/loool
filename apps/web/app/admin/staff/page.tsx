'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';

interface Staff {
  id: string;
  name: string;
  email: string;
  active: boolean;
  createdAt: string;
}

export default function StaffPage() {
  const [staff, setStaff] = useState<Staff[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  function load() {
    api.get<{ data: Staff[] }>('/api/staff')
      .then(res => setStaff(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }

  useEffect(load, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      await api.post('/api/staff', form);
      setForm({ name: '', email: '', password: '' });
      setShowForm(false);
      load();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error');
    } finally {
      setSaving(false);
    }
  }

  async function toggleStaff(id: string) {
    try {
      await api.patch(`/api/staff/${id}/toggle`, {});
      load();
    } catch (e) { console.error(e); }
  }

  async function deleteStaff(id: string, name: string) {
    if (!confirm(`¿Eliminar a ${name}?`)) return;
    try {
      await api.delete(`/api/staff/${id}`);
      load();
    } catch (e) { console.error(e); }
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Staff</h1>
          <p className="text-sm text-gray-500 mt-0.5">{staff.length} empleado{staff.length !== 1 ? 's' : ''}</p>
        </div>
        <button onClick={() => setShowForm(s => !s)} className="btn-primary text-sm py-2 px-4">
          {showForm ? 'Cancelar' : '+ Agregar staff'}
        </button>
      </div>

      {/* Form */}
      {showForm && (
        <div className="card p-5 mb-6">
          <h2 className="text-sm font-semibold text-gray-900 mb-4">Nuevo empleado</h2>
          <form onSubmit={handleCreate} className="grid sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nombre</label>
              <input type="text" className="input" required value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Correo</label>
              <input type="email" className="input" required value={form.email}
                onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Contraseña</label>
              <input type="password" className="input" required minLength={8} value={form.password}
                onChange={e => setForm(f => ({ ...f, password: e.target.value }))} />
            </div>
            {error && <div className="sm:col-span-3 text-red-600 text-sm">{error}</div>}
            <div className="sm:col-span-3">
              <button type="submit" disabled={saving} className="btn-primary text-sm py-2 px-6">
                {saving ? 'Creando...' : 'Crear empleado'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* List */}
      <div className="card overflow-hidden">
        {loading ? (
          <div className="p-6 space-y-3">
            {[...Array(3)].map((_, i) => <div key={i} className="h-12 bg-gray-100 rounded animate-pulse" />)}
          </div>
        ) : staff.length === 0 ? (
          <div className="p-8 text-center text-gray-400 text-sm">
            Sin empleados aún. Agrega a tu primer staff.
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {staff.map(s => (
              <div key={s.id} className="flex items-center gap-4 px-5 py-4">
                <div className="h-9 w-9 rounded-full bg-brand-100 flex items-center justify-center text-brand-600 font-semibold text-sm flex-shrink-0">
                  {s.name[0].toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900">{s.name}</p>
                  <p className="text-xs text-gray-500">{s.email}</p>
                </div>
                <span className={`badge ${s.active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                  {s.active ? 'Activo' : 'Inactivo'}
                </span>
                <button onClick={() => toggleStaff(s.id)} className="text-xs text-gray-500 hover:text-brand-600 transition-colors">
                  {s.active ? 'Desactivar' : 'Activar'}
                </button>
                <button onClick={() => deleteStaff(s.id, s.name)} className="text-xs text-red-400 hover:text-red-600 transition-colors">
                  Eliminar
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
