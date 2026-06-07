'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { getUser, logout } from '@/lib/auth';
import { api } from '@/lib/api';

interface ScanResult {
  visit: { id: string; pointsEarned: number };
  customer: {
    id: string;
    name: string;
    balance: number;
    totalVisits: number;
    rewardGiven: boolean;
    reward: string | null;
    threshold: number;
    cardType: string;
  };
}

type ScreenState = 'scan' | 'confirm' | 'success';

export default function StaffScanner() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [code, setCode] = useState('');
  const [screen, setScreen] = useState<ScreenState>('scan');
  const [result, setResult] = useState<ScanResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [amount, setAmount] = useState('');
  const [userName, setUserName] = useState('');

  useEffect(() => {
    const user = getUser();
    if (!user || (user.role !== 'STAFF' && user.role !== 'BUSINESS_ADMIN')) {
      router.replace('/admin/login');
      return;
    }
    setUserName(user.email);
    // Focus al input al cargar
    setTimeout(() => inputRef.current?.focus(), 100);
  }, [router]);

  async function handleScan(e: React.FormEvent) {
    e.preventDefault();
    if (!code.trim()) return;
    setLoading(true);
    setError('');
    try {
      const res = await api.get<{ data: ScanResult['customer'] & { business: { cardType: string; threshold: number; reward: string } } }>(
        `/api/customers/by-code/${code.trim()}`
      );
      // Mostrar confirmación
      setResult({
        visit: { id: '', pointsEarned: 1 },
        customer: {
          id: res.data.id,
          name: res.data.name,
          balance: res.data.balance,
          totalVisits: res.data.totalVisits,
          rewardGiven: false,
          reward: null,
          threshold: res.data.business?.threshold ?? 10,
          cardType: res.data.business?.cardType ?? 'PUNCH',
        },
      });
      setScreen('confirm');
    } catch {
      setError('Código no encontrado. Verifica que el cliente pertenece a este negocio.');
    } finally {
      setLoading(false);
    }
  }

  async function handleConfirm() {
    if (!result) return;
    setLoading(true);
    setError('');
    try {
      const res = await api.post<{ data: ScanResult }>('/api/visits', {
        cardCode: code.trim(),
        amount: amount ? Number(amount) : undefined,
      });
      setResult(res.data);
      setScreen('success');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al registrar visita');
    } finally {
      setLoading(false);
    }
  }

  function reset() {
    setCode('');
    setAmount('');
    setResult(null);
    setError('');
    setScreen('scan');
    setTimeout(() => inputRef.current?.focus(), 100);
  }

  return (
    <div className="min-h-screen bg-gray-900 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800">
        <div>
          <p className="text-white font-semibold text-sm">📷 Scanner de Staff</p>
          <p className="text-gray-400 text-xs">{userName}</p>
        </div>
        <button onClick={() => { logout(); router.push('/admin/login'); }}
          className="text-gray-400 hover:text-white text-xs transition-colors">
          Salir
        </button>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center p-6">

        {/* SCAN screen */}
        {screen === 'scan' && (
          <div className="w-full max-w-sm">
            <div className="text-center mb-8">
              <div className="text-6xl mb-4">📷</div>
              <h1 className="text-xl font-bold text-white">Escanear tarjeta</h1>
              <p className="text-gray-400 text-sm mt-1">
                Escanea el QR del cliente o escribe el código
              </p>
            </div>

            <form onSubmit={handleScan} className="space-y-4">
              <div className="relative">
                <input
                  ref={inputRef}
                  type="text"
                  placeholder="Código del cliente..."
                  value={code}
                  onChange={e => setCode(e.target.value)}
                  className="w-full bg-gray-800 text-white border border-gray-700 rounded-xl px-4 py-4 text-center text-lg font-mono tracking-wider placeholder:text-gray-600 focus:outline-none focus:ring-2 focus:ring-brand-500"
                  autoComplete="off"
                  autoCorrect="off"
                  spellCheck={false}
                />
              </div>

              {error && (
                <div className="bg-red-900/50 border border-red-700 text-red-300 text-sm rounded-xl px-4 py-3 text-center">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading || !code.trim()}
                className="w-full bg-brand-500 hover:bg-brand-600 disabled:opacity-40 text-white font-bold py-4 rounded-xl text-base transition-colors"
              >
                {loading ? 'Buscando...' : 'Registrar visita'}
              </button>
            </form>

            <p className="text-center text-gray-600 text-xs mt-6">
              Tip: Un escáner Bluetooth escribe el código automáticamente
            </p>
          </div>
        )}

        {/* CONFIRM screen */}
        {screen === 'confirm' && result && (
          <div className="w-full max-w-sm">
            <div className="bg-gray-800 rounded-2xl p-6 mb-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="h-12 w-12 rounded-full bg-brand-600 flex items-center justify-center text-white font-bold text-xl">
                  {result.customer.name[0]}
                </div>
                <div>
                  <p className="text-white font-semibold">{result.customer.name}</p>
                  <p className="text-gray-400 text-sm">{result.customer.totalVisits} visitas anteriores</p>
                </div>
              </div>
              <div className="flex justify-between items-center bg-gray-900 rounded-xl p-3">
                <div>
                  <p className="text-gray-400 text-xs">Progreso actual</p>
                  <p className="text-white font-bold text-xl">
                    {Math.floor(result.customer.balance)} / {result.customer.threshold}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-gray-400 text-xs">Después de esta visita</p>
                  <p className="text-brand-400 font-bold text-xl">
                    {Math.min(Math.floor(result.customer.balance) + 1, result.customer.threshold)} / {result.customer.threshold}
                  </p>
                </div>
              </div>
            </div>

            {(result.customer.cardType === 'POINTS' || result.customer.cardType === 'CASHBACK' || result.customer.cardType === 'PREPAID') && (
              <div className="mb-4">
                <label className="block text-sm text-gray-300 mb-2">Monto de la compra (MXN)</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  value={amount}
                  onChange={e => setAmount(e.target.value)}
                  className="w-full bg-gray-800 text-white border border-gray-700 rounded-xl px-4 py-3 text-lg font-mono focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>
            )}

            {error && (
              <div className="bg-red-900/50 border border-red-700 text-red-300 text-sm rounded-xl px-4 py-3 text-center mb-4">
                {error}
              </div>
            )}

            <div className="flex gap-3">
              <button onClick={reset} className="flex-1 bg-gray-700 hover:bg-gray-600 text-white font-semibold py-3 rounded-xl transition-colors">
                Cancelar
              </button>
              <button onClick={handleConfirm} disabled={loading}
                className="flex-1 bg-brand-500 hover:bg-brand-600 disabled:opacity-40 text-white font-bold py-3 rounded-xl transition-colors">
                {loading ? 'Registrando...' : 'Confirmar ✓'}
              </button>
            </div>
          </div>
        )}

        {/* SUCCESS screen */}
        {screen === 'success' && result && (
          <div className="w-full max-w-sm text-center">
            {result.customer.rewardGiven ? (
              <>
                <div className="text-7xl mb-4">🎉</div>
                <h2 className="text-2xl font-bold text-yellow-400 mb-2">¡Premio ganado!</h2>
                <p className="text-white text-lg font-semibold mb-1">{result.customer.name}</p>
                <div className="bg-yellow-500/20 border border-yellow-500/50 rounded-2xl p-4 mb-6">
                  <p className="text-yellow-300 font-bold text-xl">{result.customer.reward}</p>
                  <p className="text-yellow-400/70 text-sm mt-1">Entrega la recompensa al cliente</p>
                </div>
                <p className="text-gray-400 text-sm">El contador se reinició. Nuevo progreso: 0/{result.customer.threshold}</p>
              </>
            ) : (
              <>
                <div className="text-7xl mb-4">✅</div>
                <h2 className="text-2xl font-bold text-green-400 mb-2">¡Visita registrada!</h2>
                <p className="text-white text-lg font-semibold mb-1">{result.customer.name}</p>
                <div className="bg-gray-800 rounded-2xl p-4 mb-6">
                  <p className="text-gray-400 text-sm mb-1">Nuevo progreso</p>
                  <p className="text-white font-bold text-3xl">
                    {Math.floor(result.customer.balance)} / {result.customer.threshold}
                  </p>
                  <p className="text-gray-400 text-xs mt-1">
                    Faltan {Math.max(result.customer.threshold - Math.floor(result.customer.balance), 0)} para el premio
                  </p>
                </div>
                <p className="text-gray-500 text-xs">La tarjeta se actualizó automáticamente en su wallet</p>
              </>
            )}
            <button onClick={reset}
              className="mt-6 w-full bg-brand-500 hover:bg-brand-600 text-white font-bold py-4 rounded-xl text-base transition-colors">
              Escanear siguiente →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
