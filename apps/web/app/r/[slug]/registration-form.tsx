'use client';

import { useState } from 'react';

interface Business {
  id: string;
  name: string;
  slug: string;
  logoUrl: string | null;
  primaryColor: string;
  secondaryColor: string;
  textColor: string;
  cardType: string;
  threshold: number;
  reward: string;
  pointsLabel: string;
}

interface WalletResult {
  saveToGoogleWalletUrl: string;
  applePassUrl: string | null;
  customer: { name: string; cardCode: string; balance: number };
  isNew: boolean;
}

export default function RegistrationForm({ business }: { business: Business }) {
  const [step, setStep] = useState<'form' | 'wallet'>('form');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<WalletResult | null>(null);

  const [form, setForm] = useState({ name: '', email: '', phone: '' });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim() || !form.email.trim()) return;
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/customers/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, businessId: business.id }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Error al registrarse');
      setResult(json.data);
      setStep('wallet');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setLoading(false);
    }
  }

  const bg = business.primaryColor;
  const text = business.textColor;
  const cardTypeLabels: Record<string, string> = {
    PUNCH: 'Sellos', POINTS: 'Puntos', CASHBACK: 'Cashback',
    DISCOUNT: 'Descuento', COUPON: 'Cupón', PREPAID: 'Prepago',
  };

  if (step === 'wallet' && result) {
    return (
      <div className="min-h-screen flex flex-col" style={{ backgroundColor: bg }}>
        {/* Header */}
        <div className="px-6 pt-10 pb-6 text-center" style={{ color: text }}>
          {business.logoUrl ? (
            <img src={business.logoUrl} alt={business.name} className="h-16 w-16 rounded-2xl mx-auto mb-3 object-cover" />
          ) : (
            <div className="h-16 w-16 rounded-2xl mx-auto mb-3 bg-white/20 flex items-center justify-center text-2xl font-bold">
              {business.name[0]}
            </div>
          )}
          <h1 className="text-xl font-bold">{business.name}</h1>
          <p className="text-sm opacity-80 mt-1">
            {result.isNew ? '¡Registro exitoso!' : '¡Ya eres parte del programa!'}
          </p>
        </div>

        {/* Card visual */}
        <div className="mx-6 bg-white/15 backdrop-blur rounded-2xl p-5 mb-6">
          <div className="flex justify-between items-start mb-4" style={{ color: text }}>
            <div>
              <p className="text-xs opacity-70">{cardTypeLabels[business.cardType] ?? business.cardType}</p>
              <p className="text-2xl font-bold">
                {Math.floor(result.customer.balance)}/{business.threshold}
              </p>
              <p className="text-sm opacity-80">{business.pointsLabel}</p>
            </div>
            <div className="text-right" style={{ color: text }}>
              <p className="text-xs opacity-70">Premio</p>
              <p className="text-sm font-semibold">{business.reward}</p>
            </div>
          </div>
          {/* Progress bar */}
          <div className="bg-white/20 rounded-full h-3 mb-2">
            <div
              className="bg-white rounded-full h-3 transition-all"
              style={{ width: `${Math.min((result.customer.balance / business.threshold) * 100, 100)}%` }}
            />
          </div>
          <p className="text-xs opacity-70" style={{ color: text }}>
            Faltan {Math.max(business.threshold - Math.floor(result.customer.balance), 0)} {business.pointsLabel.toLowerCase()} para tu {business.reward}
          </p>
        </div>

        {/* Wallet buttons */}
        <div className="px-6 pb-10 flex flex-col gap-3">
          <p className="text-sm text-center font-medium mb-1" style={{ color: text, opacity: 0.9 }}>
            Agrega tu tarjeta a tu wallet
          </p>

          {/* Google Wallet */}
          <a
            href={result.saveToGoogleWalletUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-3 bg-white text-gray-900 font-semibold py-3.5 px-6 rounded-xl shadow-lg hover:bg-gray-50 active:bg-gray-100 transition-colors"
          >
            <svg viewBox="0 0 24 24" className="w-5 h-5" aria-hidden="true">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Save to Google Wallet
          </a>

          {/* Apple Wallet (solo si hay URL) */}
          {result.applePassUrl ? (
            <a
              href={result.applePassUrl}
              className="flex items-center justify-center gap-3 bg-black text-white font-semibold py-3.5 px-6 rounded-xl shadow-lg hover:bg-gray-900 transition-colors"
            >
              <svg viewBox="0 0 24 24" className="w-5 h-5 fill-white" aria-hidden="true">
                <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
              </svg>
              Add to Apple Wallet
            </a>
          ) : null}

          <p className="text-xs text-center opacity-60 mt-2" style={{ color: text }}>
            Tu tarjeta se actualizará automáticamente en tu wallet con cada visita
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: bg }}>
      {/* Header con branding del negocio */}
      <div className="px-6 pt-12 pb-8 text-center" style={{ color: text }}>
        {business.logoUrl ? (
          <img src={business.logoUrl} alt={business.name} className="h-20 w-20 rounded-2xl mx-auto mb-4 object-cover shadow-lg" />
        ) : (
          <div className="h-20 w-20 rounded-2xl mx-auto mb-4 bg-white/20 flex items-center justify-center text-3xl font-bold shadow-lg">
            {business.name[0]}
          </div>
        )}
        <h1 className="text-2xl font-bold">{business.name}</h1>
        <p className="text-sm opacity-80 mt-1">Programa de lealtad</p>

        {/* Chip de la recompensa */}
        <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur px-4 py-2 rounded-full mt-4">
          <span className="text-lg">🎁</span>
          <span className="text-sm font-semibold">
            Acumula {business.threshold} {business.pointsLabel.toLowerCase()} → {business.reward}
          </span>
        </div>
      </div>

      {/* Formulario */}
      <div className="flex-1 bg-white rounded-t-3xl px-6 pt-8 pb-10 shadow-2xl">
        <h2 className="text-xl font-bold text-gray-900 mb-1">Regístrate gratis</h2>
        <p className="text-sm text-gray-500 mb-6">
          Agrega tu tarjeta a Apple Wallet o Google Wallet en segundos
        </p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nombre completo *</label>
            <input
              type="text"
              autoComplete="name"
              placeholder="Juan García"
              value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              className="input"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Correo electrónico *</label>
            <input
              type="email"
              autoComplete="email"
              placeholder="juan@ejemplo.com"
              value={form.email}
              onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
              className="input"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Teléfono (opcional)</label>
            <input
              type="tel"
              autoComplete="tel"
              placeholder="+52 55 1234 5678"
              value={form.phone}
              onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
              className="input"
            />
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !form.name || !form.email}
            className="btn-primary py-3.5 text-base mt-2"
            style={{ backgroundColor: bg, color: text }}
          >
            {loading ? 'Registrando...' : 'Obtener mi tarjeta de lealtad'}
          </button>
        </form>

        <p className="text-xs text-center text-gray-400 mt-4">
          Sin apps. Sin spam. Solo tus recompensas.
        </p>
      </div>
    </div>
  );
}
