'use client';

import { Bell, CheckCheck, X, BellRing } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';

interface Notification {
  id: number;
  title: string;
  message: string;
  isRead: boolean;
  link: string | null;
  createdAt: string;
}

export function NotificationBell({ userId, collapsed }: { userId: number; collapsed: boolean }) {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const ref = useRef<HTMLDivElement>(null);

  const unreadCount = notifications.filter(n => !n.isRead).length;

  const fetchNotifications = async () => {
    try {
      const res = await fetch(`/api/notifications?userId=${userId}`);
      if (res.ok) {
        const data = await res.json();
        setNotifications(data);
      }
    } catch (e) { /* ignore */ }
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 15000);
    return () => clearInterval(interval);
  }, [userId]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const markAsRead = async (id: number) => {
    await fetch('/api/notifications', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, isRead: true })
    });
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
  };

  const markAllRead = async () => {
    await fetch('/api/notifications', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, markAll: true })
    });
    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
  };

  const timeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'только что';
    if (mins < 60) return `${mins} мин`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours} ч`;
    const days = Math.floor(hours / 24);
    return `${days} д`;
  };

  const getIcon = (title: string) => {
    if (title.includes('сообщен')) return '💬';
    if (title.includes('поручен') || title.includes('Новое')) return '📋';
    if (title.includes('Статус')) return '🔄';
    if (title.includes('коммент')) return '💭';
    return '🔔';
  };

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => { setOpen(!open); if (!open) fetchNotifications(); }}
        className={`relative flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-gray-600 hover:text-gray-900 hover:bg-gray-100/80 transition-all group ${collapsed ? 'justify-center' : ''}`}
        title="Уведомления"
      >
        <div className="relative">
          <Bell className={`w-5 h-5 min-w-[20px] transition-transform ${unreadCount > 0 ? 'group-hover:animate-pulse' : ''}`} />
          {unreadCount > 0 && (
            <span className="absolute -top-2 -right-2 w-[18px] h-[18px] bg-gradient-to-r from-red-500 to-rose-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center shadow-md shadow-red-500/30 border border-white notif-badge">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </div>
        <span className="sidebar-label text-sm font-medium">Уведомления</span>
      </button>

      {open && (
        <div className="notif-dropdown fixed lg:absolute bottom-0 lg:bottom-auto left-0 lg:left-full right-0 lg:right-auto lg:ml-3 h-[80vh] lg:h-auto lg:max-h-[480px] w-full lg:w-96 bg-white rounded-t-2xl lg:rounded-2xl shadow-2xl shadow-gray-900/15 border border-gray-100 z-[100] flex flex-col overflow-hidden">
          {/* Header */}
          <div className="relative px-5 py-4 bg-gradient-to-br from-violet-500 via-purple-500 to-indigo-600">
            <div className="relative z-10 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 bg-white/20 backdrop-blur-sm rounded-lg flex items-center justify-center">
                  <BellRing className="w-4 h-4 text-white" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Уведомления</h3>
                  {unreadCount > 0 && <p className="text-[10px] text-white/60">{unreadCount} непрочитанных</p>}
                </div>
              </div>
              <div className="flex items-center gap-2">
                {unreadCount > 0 && (
                  <button onClick={markAllRead} className="text-[11px] text-white/80 hover:text-white font-medium flex items-center gap-1 px-2.5 py-1.5 bg-white/10 hover:bg-white/20 rounded-lg transition-all">
                    <CheckCheck className="w-3.5 h-3.5" /> Все
                  </button>
                )}
                <button onClick={() => setOpen(false)} className="lg:hidden w-8 h-8 flex items-center justify-center rounded-lg bg-white/10 hover:bg-white/20 transition-all">
                  <X className="w-4 h-4 text-white" />
                </button>
              </div>
            </div>
            {/* Decorative */}
            <div className="absolute top-2 right-6 w-16 h-16 bg-white/5 rounded-full" />
          </div>

          {/* List */}
          <div className="flex-1 overflow-y-auto custom-scrollbar">
            {notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-14 text-gray-400">
                <div className="w-16 h-16 bg-gray-50 rounded-2xl flex items-center justify-center mb-3">
                  <Bell className="w-7 h-7 text-gray-300" />
                </div>
                <p className="text-sm font-medium text-gray-500">Нет уведомлений</p>
                <p className="text-xs text-gray-400 mt-1">Вы в курсе всех событий</p>
              </div>
            ) : (
              <div className="py-1">
                {notifications.map((n, i) => (
                  <div
                    key={n.id}
                    onClick={() => !n.isRead && markAsRead(n.id)}
                    className={`px-4 py-3 hover:bg-gray-50/80 transition-all cursor-pointer border-b border-gray-50 ${!n.isRead ? 'bg-purple-50/30' : ''}`}
                    style={{ animationDelay: `${i * 30}ms` }}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-base flex-shrink-0 ${!n.isRead ? 'bg-purple-100 shadow-sm' : 'bg-gray-50'}`}>
                        {getIcon(n.title)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <p className={`text-[13px] font-semibold truncate ${!n.isRead ? 'text-gray-900' : 'text-gray-600'}`}>{n.title}</p>
                          {!n.isRead && <div className="w-2 h-2 rounded-full bg-purple-500 flex-shrink-0 ml-2" />}
                        </div>
                        <p className="text-xs text-gray-500 mt-0.5 line-clamp-2 leading-relaxed">{n.message}</p>
                        <p className="text-[10px] text-gray-400 mt-1.5 font-medium">{timeAgo(n.createdAt)}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
