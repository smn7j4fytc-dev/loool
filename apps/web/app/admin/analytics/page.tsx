'use client';

import { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { api } from '@/lib/api';

interface Analytics {
  totalCustomers: number;
  newCustomersLast30: number;
  totalVisits: number;
  visitsLast30: number;
  rewardsGiven: number;
  rewardsLast30: number;
  activeCustomers: number;
  inactiveCustomers: number;
  redemptionRate: number;
  visitsByDay: Array<{ day: string; count: number }>;
  topCustomers: Array<{ id: string; name: string; email: string; totalVisits: number; totalRewards: number; balance: number }>;
}

export default function Analytics() {
  const [data, setData] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get<{ data: Analytics }>('/api/analytics')
      .then(res => setData(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="p-6 space-y-4">
      {[...Array(3)].map((_, i) => <div key={i} className="h-40 bg-gray-100 rounded-xl animate-pulse" />)}
    </div>
  );
  if (!data) return null;

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Analítica</h1>
        <p className="text-sm text-gray-500 mt-0.5">Últimos 30 días</p>
      </div>

      {/* KPI grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <KpiCard label="Clientes totales" value={data.totalCustomers} delta={`+${data.newCustomersLast30}`} />
        <KpiCard label="Visitas (30d)" value={data.visitsLast30} />
        <KpiCard label="Premios (30d)" value={data.rewardsLast30} />
        <KpiCard label="Tasa de canje" value={`${data.redemptionRate}%`} />
      </div>

      {/* Gráfica de visitas por día */}
      <div className="card p-5 mb-6">
        <h2 className="text-sm font-semibold text-gray-900 mb-4">Visitas por día (últimos 30 días)</h2>
        {data.visitsByDay.length > 0 ? (
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={data.visitsByDay} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis
                dataKey="day"
                tick={{ fontSize: 11, fill: '#9ca3af' }}
                tickFormatter={d => new Date(d).toLocaleDateString('es-MX', { day: '2-digit', month: 'short' })}
                interval="preserveStartEnd"
              />
              <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} />
              <Tooltip
                labelFormatter={d => new Date(d).toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' })}
                contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb', fontSize: '12px' }}
              />
              <Bar dataKey="count" name="Visitas" fill="#7C3AED" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-48 flex items-center justify-center text-gray-400 text-sm">
            Sin datos de visitas aún
          </div>
        )}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Clientes activos vs inactivos */}
        <div className="card p-5">
          <h2 className="text-sm font-semibold text-gray-900 mb-4">Clientes activos vs inactivos</h2>
          <div className="flex gap-4 items-center">
            <div className="flex-1">
              <p className="text-3xl font-bold text-green-600">{data.activeCustomers}</p>
              <p className="text-sm text-gray-500">Activos (7d)</p>
            </div>
            <div className="flex-1">
              <p className="text-3xl font-bold text-gray-400">{data.inactiveCustomers}</p>
              <p className="text-sm text-gray-500">Inactivos</p>
            </div>
          </div>
          {data.totalCustomers > 0 && (
            <div className="mt-4 bg-gray-100 rounded-full h-3">
              <div
                className="bg-green-500 rounded-full h-3 transition-all"
                style={{ width: `${(data.activeCustomers / data.totalCustomers) * 100}%` }}
              />
            </div>
          )}
        </div>

        {/* Top clientes */}
        <div className="card p-5">
          <h2 className="text-sm font-semibold text-gray-900 mb-4">Top clientes</h2>
          <div className="space-y-2">
            {data.topCustomers.map((c, i) => (
              <div key={c.id} className="flex items-center gap-3">
                <span className="text-xs font-bold text-gray-400 w-4">{i + 1}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{c.name}</p>
                  <p className="text-xs text-gray-500">{c.totalVisits} visitas · {c.totalRewards} premios</p>
                </div>
                <span className="text-xs font-semibold text-brand-600">{Math.floor(c.balance)} pts</span>
              </div>
            ))}
            {data.topCustomers.length === 0 && (
              <p className="text-sm text-gray-400 text-center py-4">Sin datos aún</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function KpiCard({ label, value, delta }: { label: string; value: string | number; delta?: string }) {
  return (
    <div className="stat-card">
      <p className="text-xs text-gray-500 mb-1">{label}</p>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
      {delta && <p className="text-xs text-green-600 mt-0.5">{delta} este mes</p>}
    </div>
  );
}
