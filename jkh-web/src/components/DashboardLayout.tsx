'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Shield, LayoutDashboard, FileText, Users, Building2, LogOut, Menu, X, ScrollText, Database, Key } from 'lucide-react';
import { useState, useEffect } from 'react';

export function DashboardLayout({ children, userRole }: { children: React.ReactNode, userRole: number }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const searchParams = useSearchParams();
  const [section, setSection] = useState('overview');

  useEffect(() => {
    const s = searchParams.get('section');
    if (s) {
      setSection(s);
    } else {
      setSection('overview');
    }
  }, [searchParams]);

  const navItems = [
    { to: userRole === 1 ? '/?section=overview' : '/dashboard?section=overview', sectionId: 'overview', label: 'Дашборд', icon: LayoutDashboard, gradient: 'from-purple-500 to-purple-600', shadow: 'shadow-purple-500/30' },
    { to: userRole === 1 ? '/?section=documents' : '/dashboard?section=documents', sectionId: 'documents', label: 'Документы', icon: FileText, gradient: 'from-cyan-500 to-blue-500', shadow: 'shadow-cyan-500/30' },
    ...(userRole === 1 ? [
      { to: '/?section=users', sectionId: 'users', label: 'Сотрудники', icon: Users, gradient: 'from-emerald-500 to-green-500', shadow: 'shadow-emerald-500/30' },
      { to: '/?section=departments', sectionId: 'departments', label: 'Отделы', icon: Building2, gradient: 'from-orange-500 to-amber-500', shadow: 'shadow-orange-500/30' },
      { to: '/?section=audit', sectionId: 'audit', label: 'Журнал аудита', icon: ScrollText, gradient: 'from-indigo-500 to-violet-500', shadow: 'shadow-indigo-500/30' },
      { to: '/?section=resets', sectionId: 'resets', label: 'Запросы паролей', icon: Key, gradient: 'from-amber-500 to-red-500', shadow: 'shadow-amber-500/30' },
      { to: '/?section=backup', sectionId: 'backup', label: 'Резервные копии', icon: Database, gradient: 'from-slate-600 to-slate-800', shadow: 'shadow-slate-500/30' }
    ] : [])
  ];

  const getLogoGradient = () => {
    if (section === 'documents') return 'from-cyan-500 to-blue-500';
    if (section === 'users') return 'from-emerald-500 to-green-500';
    if (section === 'departments' || section === 'department') return 'from-orange-500 to-amber-500';
    if (section === 'audit') return 'from-indigo-500 to-violet-500';
    if (section === 'resets') return 'from-amber-500 to-red-500';
    if (section === 'backup') return 'from-slate-600 to-slate-800';
    return 'from-purple-500 to-purple-600';
  };

  const isActive = (itemSectionId: string) => {
    return section === itemSectionId;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-cyan-50">
      <header className="sticky top-0 z-50 backdrop-blur-md bg-white/70 border-b border-white/20 shadow-sm transition-all duration-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 sm:py-4">
          <div className="flex items-center justify-between">
            {/* Logo */}
            <div className="flex items-center gap-2 sm:gap-3">
              <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-gradient-to-br ${getLogoGradient()} flex items-center justify-center shadow-lg transition-all duration-500`}>
                <Shield className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
              </div>
              <span className="text-lg sm:text-xl font-semibold text-gray-900 tracking-tight">ЖКХ Система</span>
            </div>

            {/* Desktop Navigation */}
            <nav className="hidden lg:flex items-center gap-1.5 xl:gap-2">
              {navItems.map((item) => {
                const Icon = item.icon;
                const active = isActive(item.sectionId);
                return (
                  <Link
                    key={item.to}
                    href={item.to}
                    className={`flex items-center gap-2 px-3 xl:px-4 py-2 rounded-lg transition-all duration-300 text-sm xl:text-base font-medium ${
                      active
                        ? `bg-gradient-to-r ${item.gradient} text-white shadow-lg ${item.shadow} translate-y-[-1px]`
                        : 'text-gray-600 hover:text-gray-900 hover:bg-white/60 hover:shadow-sm'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </nav>

            {/* Desktop Logout */}
            <form action="/api/auth/logout" method="POST" className="hidden lg:block">
              <button type="submit" className="flex items-center gap-2 px-4 py-2 text-red-600 hover:bg-red-50 hover:text-red-700 rounded-lg transition-all font-medium text-sm xl:text-base">
                <LogOut className="w-4 h-4" />
                <span>Выйти</span>
              </button>
            </form>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden w-10 h-10 flex items-center justify-center rounded-lg hover:bg-white/50 transition-all border border-transparent hover:border-gray-200 shadow-sm bg-white/40"
            >
              {mobileMenuOpen ? (
                <X className="w-6 h-6 text-gray-700" />
              ) : (
                <Menu className="w-6 h-6 text-gray-700" />
              )}
            </button>
          </div>

          {/* Mobile Menu */}
          {mobileMenuOpen && (
            <div className="lg:hidden mt-4 pb-4 space-y-2 animate-in fade-in slide-in-from-top-4 duration-300">
              {navItems.map((item) => {
                const Icon = item.icon;
                const active = isActive(item.sectionId);
                return (
                  <Link
                    key={item.to}
                    href={item.to}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center gap-3 px-4 py-3.5 rounded-xl transition-all duration-300 border ${
                      active
                        ? `bg-gradient-to-r ${item.gradient} text-white shadow-lg ${item.shadow} border-transparent`
                        : 'bg-white/50 text-gray-700 hover:bg-white/80 border-white/40 shadow-sm'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    <span className="font-semibold text-base tracking-tight">{item.label}</span>
                  </Link>
                );
              })}
              <form action="/api/auth/logout" method="POST" className="pt-2 mt-2 border-t border-gray-200/50">
                <button type="submit" className="w-full flex items-center gap-3 px-4 py-3.5 text-red-600 bg-red-50/50 hover:bg-red-100/80 rounded-xl transition-all border border-red-100">
                  <LogOut className="w-5 h-5" />
                  <span className="font-semibold text-base tracking-tight">Выйти</span>
                </button>
              </form>
            </div>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-6 lg:py-8">
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 ease-out fill-mode-both">
          {children}
        </div>
      </main>
    </div>
  );
}
