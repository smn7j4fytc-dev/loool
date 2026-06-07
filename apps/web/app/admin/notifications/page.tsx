'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';

interface Notification {
  id: string;
  title: string;
  body: string;
  type: string;
  sentAt: string | null;
  recipientCount: number;
  createdAt: string;
}

const TYPE_LABELS: Record<string, { label: string; color: string }> = {
  PROMO:    { label: 'Promoción', color: 'bg-blue-100 text-blue-700' },
  REMINDER: { label: 'Recordatorio', color: 'bg-yellow-100 text-yellow-700' },
  REWARD:   { label: 'Premio', color: 'bg-green-100 text-green-700' },
};

export default function Notifications() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ title: '', body: '', type: 'PROMO' });
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);

  function load() {
    api.get<{ data: Notification[] }>('/api/notifications')
      .then(res => setNotifications(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }

  useEffect(load, []);

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    setSending(true);
    setError('');
    try {
      await api.post('/api/notifications', form);
      setForm({ title: '', body: '', type: 'PROMO' });
      setSent(true);
      setTimeout(() => setSent(false), 3000);
      load();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al enviar');
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Notificaciones</h1>
        <p className="text-sm text-gray-500 mt-0.5">Envía campañas push a todos tus clientes con Apple Wallet</p>
      </div>

      {/* Send form */}
      <div className="card p-6 mb-6">
        <h2 className="text-sm font-semibold text-gray-900 mb-4">Nueva campaña</h2>
        <form onSubmit={handleSend} className="space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Título</label>
              <input type="text" className="input" maxLength={100} placeholder="☕ ¡Doble sellos hoy!"
                value={form.title} required
                onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tipo</label>
              <select className="input" value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}>
                <option value="PROMO">Promoción</option>
                <option value="REMINDER">Recordatorio</option>
                <option value="REWARD">Premio</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Mensaje</label>
            <textarea rows={3} className="input resize-none" maxLength={500}
              placeholder="Visítanos hoy y recibe doble sellos en cualquier compra..."
              value={form.body} required
              onChange={e => setForm(f => ({ ...f, body: e.target.value }))} />
            <p className="text-xs text-gray-400 mt-1 text-right">{form.body.length}/500</p>
          </div>
          {error && <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">{error}</div>}
          <div className="flex items-center gap-3">
            <button type="submit" disabled={sending} className="btn-primary py-2 px-6 text-sm">
              {sending ? 'Enviando...' : '🔔 Enviar a todos los clientes'}
            </button>
            {sent && <span className="text-sm text-green-600 font-medium">✅ Enviado correctamente</span>}
          </div>
        </form>
      </div>

      {/* History */}
      <div>
        <h2 className="text-sm font-semibold text-gray-900 mb-3">Historial</h2>
        <div className="card overflow-hidden">
          {loading ? (
            <div className="p-4 space-y-3">{[...Array(3)].map((_, i) => <div key={i} className="h-16 bg-gray-100 rounded animate-pulse" />)}</div>
          ) : notifications.length === 0 ? (
            <div className="p-8 text-center text-gray-400 text-sm">No hay campañas enviadas aún</div>
          ) : (
            <div className="divide-y divide-gray-100">
              {notifications.map(n => {
                const typeInfo = TYPE_LABELS[n.type] ?? { label: n.type, color: 'bg-gray-100 text-gray-700' };
                return (
                  <div key={n.id} className="px-5 py-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className={`badge ${typeInfo.color}`}>{typeInfo.label}</span>
                          <p className="text-sm font-semibold text-gray-900">{n.title}</p>
                        </div>
                        <p className="text-xs text-gray-500 line-clamp-2">{n.body}</p>
                      </div>
                      <div className="text-right text-xs text-gray-400 flex-shrink-0">
                        <p>{n.recipientCount} recibieron</p>
                        <p className="mt-0.5">
                          {n.sentAt
                            ? new Date(n.sentAt).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
                            : 'Pendiente'
                          }
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
