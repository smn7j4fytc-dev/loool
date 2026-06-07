'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';

interface Customer {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  balance: number;
  totalVisits: number;
  totalRewards: number;
  cardCode: string;
  googleObjectId: string | null;
  createdAt: string;
}

interface Pagination {
  customers: Customer[];
  total: number;
  page: number;
  pages: number;
}

export default function Customers() {
  const [data, setData] = useState<Pagination | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');

  useEffect(() => {
    api.get<{ data: Pagination }>(`/api/customers?page=${page}&limit=20`)
      .then(res => setData(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [page]);

  const filtered = data?.customers.filter(c =>
    !search || c.name.toLowerCase().includes(search.toLowerCase()) || c.email.toLowerCase().includes(search.toLowerCase())
  ) ?? [];

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Clientes</h1>
          <p className="text-sm text-gray-500 mt-0.5">{data?.total ?? 0} registrados</p>
        </div>
      </div>

      {/* Search */}
      <div className="mb-4">
        <input
          type="text"
          placeholder="Buscar por nombre o correo..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="input max-w-sm"
        />
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Cliente</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Progreso</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Visitas</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Premios</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Wallet</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Registro</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                [...Array(8)].map((_, i) => (
                  <tr key={i}><td colSpan={6} className="px-4 py-3"><div className="h-4 bg-gray-100 rounded animate-pulse" /></td></tr>
                ))
              ) : filtered.length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400 text-sm">No hay clientes</td></tr>
              ) : (
                filtered.map(c => (
                  <tr key={c.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-900">{c.name}</p>
                      <p className="text-xs text-gray-500">{c.email}</p>
                    </td>
                    <td className="px-4 py-3">
                      <ProgressBadge balance={c.balance} />
                    </td>
                    <td className="px-4 py-3 text-gray-900">{c.totalVisits}</td>
                    <td className="px-4 py-3 text-gray-900">{c.totalRewards}</td>
                    <td className="px-4 py-3">
                      {c.googleObjectId
                        ? <span className="badge bg-green-100 text-green-700">Google ✓</span>
                        : <span className="badge bg-gray-100 text-gray-500">Sin wallet</span>
                      }
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs">
                      {new Date(c.createdAt).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {data && data.pages > 1 && (
          <div className="px-4 py-3 border-t border-gray-100 flex items-center justify-between text-sm">
            <span className="text-gray-500">Página {data.page} de {data.pages}</span>
            <div className="flex gap-2">
              <button disabled={page <= 1} onClick={() => setPage(p => p - 1)} className="btn-secondary text-xs py-1 px-3 disabled:opacity-40">← Ant</button>
              <button disabled={page >= data.pages} onClick={() => setPage(p => p + 1)} className="btn-secondary text-xs py-1 px-3 disabled:opacity-40">Sig →</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function ProgressBadge({ balance }: { balance: number }) {
  const n = Math.floor(balance);
  return (
    <span className="inline-flex items-center gap-1 text-xs font-mono font-semibold text-gray-700">
      {n} pts
    </span>
  );
}
