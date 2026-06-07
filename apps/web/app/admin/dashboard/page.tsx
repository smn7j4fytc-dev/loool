'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { getUser } from '@/lib/auth';

interface Stats {
  totalCustomers: number;
  newCustomersLast30: number;
  visitsLast30: number;
  rewardsLast30: number;
  activeCustomers: number;
  redemptionRate: number;
}

interface QrData {
  registrationUrl: string;
  qrDataUrl: string;
  businessName: string;
}

interface Business {
  id: string;
  name: string;
  cardType: string;
  threshold: number;
  reward: string;
  googleClassId: string | null;
  slug: string;
}

export default function Dashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [qr, setQr] = useState<QrData | null>(null);
  const [business, setBusiness] = useState<Business | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const user = getUser();
    if (!user?.businessId) return;

    Promise.all([
      api.get<{ data: Stats }>('/api/analytics'),
      api.get<{ data: QrData }>(`/api/businesses/${user.businessId}/qr`),
      api.get<{ data: Business }>(`/api/businesses/${user.businessId}`),
    ])
      .then(([statsRes, qrRes, bizRes]) => {
        setStats(statsRes.data);
        setQr(qrRes.data);
        setBusiness(bizRes.data);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <PageLoading />;

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">{business?.name ?? 'Dashboard'}</h1>
        <p className="text-sm text-gray-500 mt-0.5">Resumen de los últimos 30 días</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        <StatCard label="Clientes totales" value={stats?.totalCustomers ?? 0} sub={`+${stats?.newCustomersLast30 ?? 0} este mes`} color="brand" />
        <StatCard label="Visitas este mes" value={stats?.visitsLast30 ?? 0} color="blue" />
        <StatCard label="Premios canjeados" value={stats?.rewardsLast30 ?? 0} color="green" />
        <StatCard label="Clientes activos" value={stats?.activeCustomers ?? 0} sub="últimos 7 días" color="purple" />
        <StatCard label="Tasa de canje" value={`${stats?.redemptionRate ?? 0}%`} color="orange" />
      </div>

      {/* Google Wallet Setup banner si no está configurado */}
      {business && !business.googleClassId && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6 flex items-start gap-3">
          <span className="text-2xl">⚠️</span>
          <div>
            <p className="text-sm font-semibold text-amber-900">Configura Google Wallet</p>
            <p className="text-xs text-amber-700 mt-0.5">Para que los clientes puedan agregar su tarjeta debes crear la LoyaltyClass en Google.</p>
            <SetupWalletButton businessId={business.id} />
          </div>
        </div>
      )}

      <div className="grid lg:grid-cols-2 gap-6">
        {/* QR maestro */}
        <div className="card p-6">
          <h2 className="text-base font-semibold text-gray-900 mb-4">QR de registro</h2>
          {qr ? (
            <>
              <div className="flex justify-center mb-4">
                <img src={qr.qrDataUrl} alt="QR de registro" className="w-48 h-48" />
              </div>
              <p className="text-xs text-gray-500 text-center mb-3 font-mono bg-gray-50 rounded-lg p-2 break-all">
                {qr.registrationUrl}
              </p>
              <div className="flex gap-2">
                <a href={qr.qrDataUrl} download={`qr-${business?.slug}.png`} className="btn-secondary text-xs flex-1 text-center py-2">
                  Descargar QR
                </a>
                <button
                  onClick={() => navigator.clipboard.writeText(qr.registrationUrl)}
                  className="btn-secondary text-xs flex-1 py-2"
                >
                  Copiar URL
                </button>
              </div>
            </>
          ) : (
            <div className="h-48 bg-gray-100 rounded-xl animate-pulse" />
          )}
        </div>

        {/* Acciones rápidas */}
        <div className="card p-6">
          <h2 className="text-base font-semibold text-gray-900 mb-4">Acciones rápidas</h2>
          <div className="space-y-2">
            <QuickLink href="/admin/card" icon="🎴" label="Configurar tarjeta" desc="Colores, tipo, umbral y recompensa" />
            <QuickLink href="/admin/customers" icon="👥" label="Ver clientes" desc={`${stats?.totalCustomers ?? 0} registrados`} />
            <QuickLink href="/admin/analytics" icon="📊" label="Analítica detallada" desc="Gráficas de visitas y canje" />
            <QuickLink href="/admin/notifications" icon="🔔" label="Enviar notificación" desc="Campaña push a todos los clientes" />
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, sub, color }: { label: string; value: string | number; sub?: string; color: string }) {
  const colors: Record<string, string> = {
    brand: 'text-brand-600', blue: 'text-blue-600', green: 'text-green-600',
    purple: 'text-purple-600', orange: 'text-orange-600',
  };
  return (
    <div className="stat-card">
      <p className="text-xs text-gray-500 mb-1">{label}</p>
      <p className={`text-2xl font-bold ${colors[color] ?? 'text-gray-900'}`}>{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
    </div>
  );
}

function QuickLink({ href, icon, label, desc }: { href: string; icon: string; label: string; desc: string }) {
  return (
    <Link href={href} className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors group">
      <span className="text-xl w-8">{icon}</span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900 group-hover:text-brand-600 transition-colors">{label}</p>
        <p className="text-xs text-gray-500 truncate">{desc}</p>
      </div>
      <span className="text-gray-300 group-hover:text-brand-400 transition-colors">→</span>
    </Link>
  );
}

function SetupWalletButton({ businessId }: { businessId: string }) {
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  async function setup() {
    setLoading(true);
    try {
      await api.post(`/api/businesses/${businessId}/wallet/setup`, {});
      setDone(true);
      window.location.reload();
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  if (done) return <p className="text-xs text-green-700 mt-2">✅ Google Wallet configurado</p>;
  return (
    <button onClick={setup} disabled={loading} className="text-xs btn-primary mt-2 py-1.5 px-3">
      {loading ? 'Configurando...' : 'Configurar Google Wallet'}
    </button>
  );
}

function PageLoading() {
  return (
    <div className="p-6">
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="stat-card h-20 animate-pulse bg-gray-100 rounded-xl" />
        ))}
      </div>
    </div>
  );
}
