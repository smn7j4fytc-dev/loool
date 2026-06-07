'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { getUser } from '@/lib/auth';

interface Business {
  id: string;
  name: string;
  logoUrl: string | null;
  primaryColor: string;
  secondaryColor: string;
  textColor: string;
  cardType: string;
  threshold: number;
  reward: string;
  pointsLabel: string;
  locations: Array<{ lat: number; lng: number; name?: string }> | null;
  googleClassId: string | null;
}

const CARD_TYPES = [
  { value: 'PUNCH',    label: 'Sellos (Punch Card)', desc: 'X visitas → recompensa' },
  { value: 'POINTS',   label: 'Puntos', desc: 'Acumula puntos por monto gastado' },
  { value: 'CASHBACK', label: 'Cashback', desc: '5% de cada compra como saldo' },
  { value: 'DISCOUNT', label: 'Descuento', desc: 'Descuento fijo con la tarjeta' },
  { value: 'COUPON',   label: 'Cupón', desc: 'Descuento único por visita' },
  { value: 'PREPAID',  label: 'Prepago', desc: 'Tarjeta de saldo recargable' },
];

export default function CardConfig() {
  const [business, setBusiness] = useState<Business | null>(null);
  const [form, setForm] = useState<Partial<Business>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const user = getUser();
    if (!user?.businessId) return;
    api.get<{ data: Business }>(`/api/businesses/${user.businessId}`)
      .then(res => {
        setBusiness(res.data);
        setForm(res.data);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const user = getUser();
      await api.patch(`/api/businesses/${user!.businessId}`, form);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al guardar');
    } finally {
      setSaving(false);
    }
  }

  async function syncGoogleWallet() {
    const user = getUser();
    if (!user?.businessId) return;
    setSyncing(true);
    try {
      await api.post(`/api/businesses/${user.businessId}/wallet/setup`, {});
      alert('✅ Google Wallet sincronizado correctamente');
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Error');
    } finally {
      setSyncing(false);
    }
  }

  if (loading) return <div className="p-6 animate-pulse"><div className="h-64 bg-gray-100 rounded-xl" /></div>;
  if (!form) return null;

  const preview = { ...business, ...form } as Business;

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Configurar tarjeta</h1>
        <p className="text-sm text-gray-500 mt-0.5">Personaliza el diseño y las reglas de tu tarjeta de lealtad</p>
      </div>

      <div className="grid lg:grid-cols-5 gap-6">
        {/* Form */}
        <form onSubmit={handleSave} className="lg:col-span-3 space-y-6">
          {/* Identidad visual */}
          <div className="card p-5">
            <h2 className="text-sm font-semibold text-gray-900 mb-4">Identidad visual</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nombre del negocio</label>
                <input
                  type="text"
                  className="input"
                  value={form.name ?? ''}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">URL del logo</label>
                <input
                  type="url"
                  className="input"
                  placeholder="https://..."
                  value={form.logoUrl ?? ''}
                  onChange={e => setForm(f => ({ ...f, logoUrl: e.target.value || null }))}
                />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Color fondo</label>
                  <div className="flex gap-2 items-center">
                    <input type="color" className="w-9 h-9 rounded cursor-pointer border border-gray-300"
                      value={form.primaryColor ?? '#7C3AED'}
                      onChange={e => setForm(f => ({ ...f, primaryColor: e.target.value }))} />
                    <input type="text" className="input text-xs"
                      value={form.primaryColor ?? ''}
                      onChange={e => setForm(f => ({ ...f, primaryColor: e.target.value }))} />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Color texto</label>
                  <div className="flex gap-2 items-center">
                    <input type="color" className="w-9 h-9 rounded cursor-pointer border border-gray-300"
                      value={form.textColor ?? '#FFFFFF'}
                      onChange={e => setForm(f => ({ ...f, textColor: e.target.value }))} />
                    <input type="text" className="input text-xs"
                      value={form.textColor ?? ''}
                      onChange={e => setForm(f => ({ ...f, textColor: e.target.value }))} />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Tipo de tarjeta */}
          <div className="card p-5">
            <h2 className="text-sm font-semibold text-gray-900 mb-4">Tipo de tarjeta</h2>
            <div className="grid grid-cols-2 gap-2 mb-4">
              {CARD_TYPES.map(ct => (
                <button
                  key={ct.value}
                  type="button"
                  onClick={() => setForm(f => ({ ...f, cardType: ct.value }))}
                  className={`p-3 rounded-lg border text-left transition-colors ${
                    form.cardType === ct.value
                      ? 'border-brand-500 bg-brand-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <p className={`text-xs font-semibold ${form.cardType === ct.value ? 'text-brand-700' : 'text-gray-800'}`}>{ct.label}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{ct.desc}</p>
                </button>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Umbral</label>
                <input type="number" min={2} max={100} className="input"
                  value={form.threshold ?? 10}
                  onChange={e => setForm(f => ({ ...f, threshold: Number(e.target.value) }))} />
                <p className="text-xs text-gray-400 mt-1">Visitas/puntos para ganar el premio</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Premio</label>
                <input type="text" className="input"
                  placeholder="1 café gratis"
                  value={form.reward ?? ''}
                  onChange={e => setForm(f => ({ ...f, reward: e.target.value }))} />
              </div>
            </div>
            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Etiqueta de progreso</label>
              <input type="text" className="input"
                placeholder="Cafés, Puntos, Sellos..."
                value={form.pointsLabel ?? ''}
                onChange={e => setForm(f => ({ ...f, pointsLabel: e.target.value }))} />
            </div>
          </div>

          {error && <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">{error}</div>}

          <div className="flex gap-3">
            <button type="submit" disabled={saving} className="btn-primary flex-1 py-2.5">
              {saving ? 'Guardando...' : saved ? '✅ Guardado' : 'Guardar cambios'}
            </button>
            <button type="button" onClick={syncGoogleWallet} disabled={syncing} className="btn-secondary px-4 py-2.5 text-sm">
              {syncing ? 'Sincronizando...' : '🔄 Sync Google Wallet'}
            </button>
          </div>
        </form>

        {/* Preview de la tarjeta */}
        <div className="lg:col-span-2">
          <div className="card p-5 sticky top-6">
            <h2 className="text-sm font-semibold text-gray-900 mb-4">Vista previa</h2>
            <CardPreview business={preview} />
            {!preview.googleClassId && (
              <p className="text-xs text-amber-600 mt-3 text-center">
                ⚠️ Guarda y luego usa "Sync Google Wallet" para activar
              </p>
            )}
            {preview.googleClassId && (
              <p className="text-xs text-green-600 mt-3 text-center">
                ✅ Google Wallet activo
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function CardPreview({ business }: { business: Business }) {
  return (
    <div
      className="rounded-2xl p-5 shadow-lg"
      style={{ backgroundColor: business.primaryColor, color: business.textColor }}
    >
      <div className="flex items-start justify-between mb-4">
        <div>
          {business.logoUrl ? (
            <img src={business.logoUrl} alt="" className="h-10 w-10 rounded-xl object-cover mb-2" />
          ) : (
            <div className="h-10 w-10 rounded-xl bg-white/20 flex items-center justify-center text-lg font-bold mb-2">
              {(business.name || 'N')[0]}
            </div>
          )}
          <p className="text-sm font-bold">{business.name || 'Tu negocio'}</p>
        </div>
        <div className="text-right">
          <p className="text-xs opacity-70">Premio</p>
          <p className="text-xs font-semibold">{business.reward || '1 gratis'}</p>
        </div>
      </div>
      <div>
        <p className="text-3xl font-bold">0 / {business.threshold}</p>
        <p className="text-sm opacity-80">{business.pointsLabel || 'Sellos'}</p>
      </div>
      <div className="mt-3 bg-white/20 rounded-full h-2">
        <div className="bg-white rounded-full h-2 w-0" />
      </div>
      <div className="mt-3 bg-white/20 rounded-lg p-2 text-center">
        <p className="text-xs opacity-70 font-mono">████ QR del cliente ████</p>
      </div>
    </div>
  );
}
