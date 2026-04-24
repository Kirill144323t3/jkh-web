'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Shield, LayoutDashboard, FileText, Users, Building2, LogOut, Menu, X, ScrollText, Database, Key, ChevronLeft, ChevronRight, Bell } from 'lucide-react';
import { useState, useEffect } from 'react';
import { NotificationBell } from './NotificationBell';
import { ChatWidget } from './ChatWidget';

export function DashboardLayout({ children, userRole, userId, userName }: { children: React.ReactNode, userRole: number, userId: number, userName: string }) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const searchParams = useSearchParams();
  const [section, setSection] = useState('overview');

  useEffect(() => {
    const s = searchParams.get('section');
    setSection(s || 'overview');
  }, [searchParams]);

  // Close mobile menu on resize
  useEffect(() => {
    const handler = () => { if (window.innerWidth >= 1024) setMobileMenuOpen(false); };
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);

  const navItems = [
    { to: userRole === 1 ? '/?section=overview' : '/dashboard?section=overview', sectionId: 'overview', label: 'Дашборд', icon: LayoutDashboard, gradient: 'from-purple-500 to-purple-600', shadow: 'shadow-purple-500/30' },
    { to: userRole === 1 ? '/?section=documents' : '/dashboard?section=documents', sectionId: 'documents', label: 'Документы', icon: FileText, gradient: 'from-cyan-500 to-blue-500', shadow: 'shadow-cyan-500/30' },
    ...(userRole === 1 ? [
      { to: '/?section=users', sectionId: 'users', label: 'Сотрудники', icon: Users, gradient: 'from-emerald-500 to-green-500', shadow: 'shadow-emerald-500/30' },
      { to: '/?section=departments', sectionId: 'departments', label: 'Отделы', icon: Building2, gradient: 'from-orange-500 to-amber-500', shadow: 'shadow-orange-500/30' },
      { to: '/?section=audit', sectionId: 'audit', label: 'Аудит', icon: ScrollText, gradient: 'from-indigo-500 to-violet-500', shadow: 'shadow-indigo-500/30' },
      { to: '/?section=resets', sectionId: 'resets', label: 'Пароли', icon: Key, gradient: 'from-amber-500 to-red-500', shadow: 'shadow-amber-500/30' },
      { to: '/?section=backup', sectionId: 'backup', label: 'Бэкапы', icon: Database, gradient: 'from-slate-600 to-slate-800', shadow: 'shadow-slate-500/30' }
    ] : [])
  ];

  const getLogoGradient = () => {
    if (section === 'documents') return 'from-cyan-500 to-blue-500';
    if (section === 'users') return 'from-emerald-500 to-green-500';
    if (section === 'departments') return 'from-orange-500 to-amber-500';
    if (section === 'audit') return 'from-indigo-500 to-violet-500';
    if (section === 'resets') return 'from-amber-500 to-red-500';
    if (section === 'backup') return 'from-slate-600 to-slate-800';
    return 'from-purple-500 to-purple-600';
  };

  const isActive = (itemSectionId: string) => section === itemSectionId;

  const initials = userName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-purple-50/30 to-blue-50/40">
      {/* ═══ DESKTOP SIDEBAR ═══ */}
      <aside className={`sidebar fixed top-0 left-0 h-screen z-40 hidden lg:flex flex-col bg-white/90 backdrop-blur-xl border-r border-gray-200/60 shadow-lg ${collapsed ? 'collapsed' : ''}`}>
        {/* Logo */}
        <div className="flex items-center gap-2.5 px-4 py-5 border-b border-gray-100">
          <div className={`w-10 h-10 min-w-[40px] rounded-xl bg-gradient-to-br ${getLogoGradient()} flex items-center justify-center shadow-lg transition-all duration-500`}>
            <Shield className="w-5 h-5 text-white" />
          </div>
          <span className="sidebar-label text-lg font-bold text-gray-900 tracking-tight">ЖКХ</span>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto custom-scrollbar">
          <p className="sidebar-label text-[10px] font-bold uppercase text-gray-400 tracking-widest px-3 mb-2">Навигация</p>
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.sectionId);
            return (
              <Link
                key={item.sectionId}
                href={item.to}
                title={collapsed ? item.label : undefined}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group relative ${
                  active
                    ? `bg-gradient-to-r ${item.gradient} text-white shadow-lg ${item.shadow}`
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100/80'
                }`}
              >
                <Icon className="w-5 h-5 min-w-[20px]" />
                <span className="sidebar-label text-sm font-medium">{item.label}</span>
                {collapsed && (
                  <div className="absolute left-full ml-2 px-2 py-1 bg-gray-900 text-white text-xs rounded-md opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-50">
                    {item.label}
                  </div>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Bottom: User + Collapse */}
        <div className="border-t border-gray-100 p-3 space-y-2">
          {/* Notifications */}
          <div className="flex items-center justify-center">
            <NotificationBell userId={userId} collapsed={collapsed} />
          </div>

          {/* User */}
          <div className={`flex items-center gap-3 px-3 py-2.5 rounded-xl bg-gray-50/80 ${collapsed ? 'justify-center' : ''}`}>
            <div className="w-9 h-9 min-w-[36px] rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-white text-xs font-bold shadow-md">
              {initials}
            </div>
            <div className="sidebar-label flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-900 truncate">{userName}</p>
              <p className="text-[11px] text-gray-500">{userRole === 1 ? 'Админ' : userRole === 4 ? 'Рук-ль' : 'Сотрудник'}</p>
            </div>
          </div>

          {/* Logout */}
          <form action="/api/auth/logout" method="POST">
            <button type="submit" className={`flex items-center gap-3 w-full px-3 py-2.5 text-red-500 hover:bg-red-50 rounded-xl transition-all text-sm font-medium ${collapsed ? 'justify-center' : ''}`}>
              <LogOut className="w-5 h-5 min-w-[20px]" />
              <span className="sidebar-label">Выйти</span>
            </button>
          </form>

          {/* Collapse toggle */}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="flex items-center justify-center w-full py-2 text-gray-400 hover:text-gray-600 transition-colors"
          >
            {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>
      </aside>

      {/* ═══ MOBILE HEADER ═══ */}
      <header className="sticky top-0 z-50 lg:hidden backdrop-blur-md bg-white/80 border-b border-gray-200/50 shadow-sm">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${getLogoGradient()} flex items-center justify-center shadow-md transition-all duration-500`}>
              <Shield className="w-4 h-4 text-white" />
            </div>
            <span className="text-lg font-bold text-gray-900">ЖКХ</span>
          </div>
          <div className="flex items-center gap-2">
            <NotificationBell userId={userId} collapsed={false} />
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="w-10 h-10 flex items-center justify-center rounded-xl hover:bg-gray-100 transition-all"
            >
              {mobileMenuOpen ? <X className="w-5 h-5 text-gray-700" /> : <Menu className="w-5 h-5 text-gray-700" />}
            </button>
          </div>
        </div>
      </header>

      {/* ═══ MOBILE OVERLAY MENU ═══ */}
      {mobileMenuOpen && (
        <>
          <div className="fixed inset-0 z-40 sidebar-overlay lg:hidden" onClick={() => setMobileMenuOpen(false)} />
          <div className="fixed top-0 left-0 h-full w-72 z-50 bg-white shadow-2xl lg:hidden animate-slide-in-right flex flex-col">
            <div className="flex items-center justify-between px-4 py-5 border-b border-gray-100">
              <div className="flex items-center gap-2.5">
                <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${getLogoGradient()} flex items-center justify-center shadow-lg`}>
                  <Shield className="w-5 h-5 text-white" />
                </div>
                <span className="text-lg font-bold text-gray-900">ЖКХ Система</span>
              </div>
              <button onClick={() => setMobileMenuOpen(false)} className="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-gray-100">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
              {navItems.map((item) => {
                const Icon = item.icon;
                const active = isActive(item.sectionId);
                return (
                  <Link
                    key={item.sectionId}
                    href={item.to}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center gap-3 px-4 py-3.5 rounded-xl transition-all ${
                      active
                        ? `bg-gradient-to-r ${item.gradient} text-white shadow-lg ${item.shadow}`
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    <span className="font-semibold text-[15px]">{item.label}</span>
                  </Link>
                );
              })}
            </nav>
            <div className="border-t border-gray-100 p-3 space-y-2">
              <div className="flex items-center gap-3 px-3 py-3 rounded-xl bg-gray-50">
                <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-white text-xs font-bold">
                  {initials}
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-900">{userName}</p>
                  <p className="text-[11px] text-gray-500">{userRole === 1 ? 'Администратор' : userRole === 4 ? 'Руководитель' : 'Сотрудник'}</p>
                </div>
              </div>
              <form action="/api/auth/logout" method="POST">
                <button type="submit" className="flex items-center gap-3 w-full px-4 py-3 text-red-500 bg-red-50/50 hover:bg-red-100 rounded-xl transition-all text-sm font-semibold">
                  <LogOut className="w-5 h-5" />
                  <span>Выйти</span>
                </button>
              </form>
            </div>
          </div>
        </>
      )}

      {/* ═══ MAIN CONTENT ═══ */}
      <main className={`transition-all duration-300 min-h-screen ${collapsed ? 'lg:ml-[72px]' : 'lg:ml-[260px]'}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-6 lg:py-8">
          {children}
        </div>
      </main>

      {/* ═══ CHAT WIDGET ═══ */}
      <ChatWidget userId={userId} userName={userName} />
    </div>
  );
}
