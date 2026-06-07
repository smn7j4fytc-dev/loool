'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { getUser, logout, type AuthUser } from '@/lib/auth';

const navItems = [
  { href: '/admin/dashboard', label: 'Dashboard', icon: '◈' },
  { href: '/admin/card', label: 'Tarjeta', icon: '🎴' },
  { href: '/admin/customers', label: 'Clientes', icon: '👥' },
  { href: '/admin/analytics', label: 'Analítica', icon: '📊' },
  { href: '/admin/staff', label: 'Staff', icon: '🧑‍💼' },
  { href: '/admin/notifications', label: 'Notificaciones', icon: '🔔' },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    if (pathname === '/admin/login') return; // no redirigir en la página de login
    const u = getUser();
    if (!u || (u.role !== 'BUSINESS_ADMIN' && u.role !== 'SUPER_ADMIN')) {
      router.replace('/admin/login');
      return;
    }
    setUser(u);
  }, [router, pathname]);

  if (!user) {
    // En /admin/login no hay usuario logueado - renderizar directamente sin layout
    if (pathname === '/admin/login') return <>{children}</>;
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin h-8 w-8 rounded-full border-4 border-brand-500 border-t-transparent" />
      </div>
    );
  }

  function handleLogout() {
    logout();
    router.push('/admin/login');
  }

  const Sidebar = (
    <aside className="w-64 bg-white border-r border-gray-200 flex flex-col h-full">
      {/* Logo */}
      <div className="p-6 border-b border-gray-100">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 bg-brand-500 rounded-xl flex items-center justify-center">
            <span className="text-white text-sm font-bold">L</span>
          </div>
          <div>
            <p className="text-sm font-bold text-gray-900">Loyalty SaaS</p>
            <p className="text-xs text-gray-400">Panel admin</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {navItems.map(item => {
          const active = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setSidebarOpen(false)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                active
                  ? 'bg-brand-50 text-brand-600'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              }`}
            >
              <span className="text-base">{item.icon}</span>
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* User */}
      <div className="p-4 border-t border-gray-100">
        <div className="flex items-center gap-3 mb-3">
          <div className="h-8 w-8 rounded-full bg-brand-100 flex items-center justify-center text-brand-600 font-semibold text-sm">
            {user.email[0].toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-gray-900 truncate">{user.email}</p>
            <p className="text-xs text-gray-400">{user.role === 'SUPER_ADMIN' ? 'Super admin' : 'Admin'}</p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="w-full text-left text-xs text-gray-500 hover:text-red-600 transition-colors py-1"
        >
          Cerrar sesión
        </button>
      </div>
    </aside>
  );

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      {/* Desktop sidebar */}
      <div className="hidden lg:flex flex-col flex-shrink-0">{Sidebar}</div>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setSidebarOpen(false)} />
          <div className="absolute left-0 top-0 bottom-0 flex flex-col">{Sidebar}</div>
        </div>
      )}

      {/* Main */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Mobile topbar */}
        <div className="lg:hidden flex items-center gap-3 px-4 py-3 bg-white border-b border-gray-200">
          <button onClick={() => setSidebarOpen(true)} className="p-1 text-gray-500">
            <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <span className="text-sm font-semibold text-gray-900">Loyalty SaaS</span>
        </div>

        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
