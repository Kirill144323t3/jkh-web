import { prisma } from '@/lib/prisma';
import Link from 'next/link';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { createUser, createDepartment, deleteUser, deleteDepartment, updateUser, toggleBlockUser, deleteDocument, createDocument, resolvePasswordReset, impersonateUser } from './actions';
import { LayoutDashboard, Users, Shield, Building2, FileText, Plus, X, Trash2, UserX, ChevronRight, CheckCircle2, CalendarDays, Paperclip, Briefcase, ScrollText, Database, Download, Key, Check, LogIn, AlertTriangle, Clock, TrendingUp } from 'lucide-react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { DocumentComments } from '@/components/DocumentComments';

export default async function AdminDashboardPage(props: { 
  searchParams: Promise<{ [key: string]: string | string[] | undefined }> 
}) {
  const params = await props.searchParams;
  const section = (params.section as string) || 'overview';

  const cookieStore = await cookies();
  const userIdStr = cookieStore.get('userId')?.value;
  const roleId = cookieStore.get('roleId')?.value;
  
  if (!userIdStr) redirect('/login');
  if (roleId !== '1') redirect('/dashboard');

  // Fetch admin user data for layout
  const currentUser = await prisma.user.findUnique({ where: { id: parseInt(userIdStr) }, select: { fullName: true } });

  const userId = parseInt(userIdStr);
  
  const isAdding = params.add === 'true';
  const isAddingDoc = params.addDoc === 'true';
  const editUserIdStr = params.edit as string;
  const isEditing = !!editUserIdStr;
  const statusParam = params.status as string | undefined;
  const activeStatus = statusParam && ['1', '2', '3', '4'].includes(statusParam) ? statusParam : 'all';
  const searchQueryRaw = params.q as string | undefined;
  const searchQuery = searchQueryRaw ? searchQueryRaw.toString().trim().toLowerCase() : '';

  // === УСЛОВНАЯ ЗАГРУЗКА ДАННЫХ ПО СЕКЦИЯМ ===
  const departments = (section === 'departments' || section === 'users' || section === 'overview')
    ? await prisma.department.findMany({ include: { _count: { select: { users: true } } } })
    : [];

  const usersList = (section === 'users' || section === 'documents')
    ? await prisma.user.findMany({ 
        include: { 
          role: true, 
          department: true, 
          registration: true,
          passwordResets: { where: { status: 'PENDING' } }
        }, 
        orderBy: { id: 'asc' } 
      })
    : [];

  const docsList = (section === 'documents' || section === 'overview')
    ? await prisma.document.findMany({
        select: {
          id: true, title: true, taskDescription: true, priority: true,
          statusId: true, deadline: true, createdAt: true, completedAt: true,
          assignedTo: true, userId: true, resultText: true,
          fileName: true, fileType: true,
          resultFileName: true, resultFileType: true,
          author: { select: { id: true, fullName: true } },
          assignee: { select: { id: true, fullName: true } },
          comments: { select: { id: true, text: true, fileName: true, fileType: true, createdAt: true, user: { select: { id: true, fullName: true } } }, orderBy: { createdAt: 'asc' } },
        },
        orderBy: { createdAt: 'desc' }
      })
    : [];

  const userToEdit = isEditing && section === 'users'
    ? (usersList.length > 0
      ? usersList.find(u => u.id === parseInt(editUserIdStr))
      : await prisma.user.findUnique({ where: { id: parseInt(editUserIdStr) }, include: { role: true, department: true, registration: true, passwordResets: { where: { status: 'PENDING' } } } }))
    : null;


  const auditLogs = section === 'audit' ? await prisma.auditLog.findMany({ include: { user: true }, orderBy: { createdAt: 'desc' }, take: 100 }) : [];
  const passwordResets = section === 'resets' ? await prisma.passwordResetRequest.findMany({ include: { user: true }, orderBy: { createdAt: 'desc' } }) : [];

  const stats = {
    usersCount: await prisma.user.count(),
    deptsCount: await prisma.department.count(),
    docsCount: await prisma.document.count(),
    blockedCount: await prisma.registration.count({ where: { isBlocked: true } })
  };

  const statusCounts = {
    total: docsList.length,
    new: docsList.filter(d => d.statusId === 1).length,
    inProgress: docsList.filter(d => d.statusId === 2).length,
    review: docsList.filter(d => d.statusId === 3).length,
    done: docsList.filter(d => d.statusId === 4).length,
  };

  const filteredDocs = docsList.filter(doc => {
    if (activeStatus !== 'all' && doc.statusId.toString() !== activeStatus) {
      return false;
    }
    if (searchQuery) {
      const haystack = `${doc.title} ${doc.author.fullName} ${doc.assignee?.fullName ?? ''}`.toLowerCase();
      if (!haystack.includes(searchQuery)) return false;
    }
    return true;
  });

  const latestDocs = docsList.slice(0, 5);

  const userSearchRaw = params.userQ as string | undefined;
  const userSearch = userSearchRaw ? userSearchRaw.toString().trim().toLowerCase() : '';

  const usersFiltered = usersList.filter(u => {
    if (!userSearch) return true;
    const haystack = `${u.fullName} ${u.role?.name ?? ''} ${u.department?.departmentName ?? ''}`.toLowerCase();
    return haystack.includes(userSearch);
  });

  return (
    <DashboardLayout userRole={parseInt(roleId)} userId={parseInt(userIdStr)} userName={currentUser?.fullName || 'Администратор'}>
      <div className="space-y-4 sm:space-y-6">
        {/* Page Header */}
        <div className="backdrop-blur-md bg-white/80 rounded-xl sm:rounded-2xl p-4 sm:p-6 lg:p-8 shadow-xl border border-white/20">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
            <div>
              <h2 className="text-2xl sm:text-3xl font-bold text-gray-900">
                {section === 'overview' && 'Дашборд'}
                {section === 'users' && 'Сотрудники'}
                {section === 'departments' && 'Отделы'}
                {section === 'documents' && 'Документы'}
                {section === 'audit' && 'Журнал аудита'}
                {section === 'backup' && 'Резервное копирование'}
                {section === 'resets' && 'Запросы паролей'}
              </h2>
              <p className="text-sm sm:text-base text-gray-600 mt-1">
                {section === 'overview' && 'Обзор документооборота ЖКХ'}
                {section === 'users' && 'Управление учетными записями и доступами'}
                {section === 'departments' && 'Организационная структура предприятия'}
                {section === 'documents' && 'Управление документами и поручениями'}
                {section === 'audit' && 'История действий пользователей в системе'}
                {section === 'backup' && 'Экспорт данных системы в безопасный формат'}
                {section === 'resets' && 'Запросы на восстановление паролей'}
              </p>
            </div>
            <div className="flex gap-3 self-start sm:self-auto">
              {section === 'users' && (
                <Link href="/?section=users&add=true" className="flex items-center gap-2 px-5 sm:px-6 py-2.5 sm:py-3 bg-gradient-to-r from-emerald-500 to-green-500 text-white rounded-xl shadow-lg shadow-emerald-500/30 hover:shadow-xl transition-all">
                  <Plus className="w-4 h-4 sm:w-5 sm:h-5" /><span className="font-medium text-sm sm:text-base">Сотрудник</span>
                </Link>
              )}
              {section === 'departments' && (
                <Link href="/?section=departments&add=true" className="flex items-center gap-2 px-5 sm:px-6 py-2.5 sm:py-3 bg-gradient-to-r from-orange-500 to-amber-500 text-white rounded-xl shadow-lg shadow-orange-500/30 hover:shadow-xl transition-all">
                  <Plus className="w-4 h-4 sm:w-5 sm:h-5" /><span className="font-medium text-sm sm:text-base">Отдел</span>
                </Link>
              )}
              {section === 'documents' && (
                <Link href="/?section=documents&addDoc=true" className="flex items-center gap-2 px-5 sm:px-6 py-2.5 sm:py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl shadow-lg shadow-blue-500/30 hover:shadow-xl transition-all">
                  <Plus className="w-4 h-4 sm:w-5 sm:h-5" /><span className="font-medium text-sm sm:text-base">Создать</span>
                </Link>
              )}
            </div>
          </div>
        </div>

        {/* ══ OVERVIEW ══ */}
        {section === 'overview' && (() => {
          const overdueDocs = docsList.filter(d => d.deadline && new Date(d.deadline) < new Date() && d.statusId !== 4);
          const upcomingDeadlines = docsList.filter(d => d.deadline && new Date(d.deadline) >= new Date() && d.statusId !== 4).sort((a, b) => new Date(a.deadline!).getTime() - new Date(b.deadline!).getTime()).slice(0, 5);
          const totalDocs = statusCounts.total || 1;
          return (
          <div className="space-y-4 sm:space-y-6">
            {/* Stat Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-5">
              {[
                { label: 'ДОКУМЕНТЫ', value: stats.docsCount, icon: FileText, gradient: 'from-purple-500 to-purple-600', change: `${statusCounts.new} новых` },
                { label: 'СОТРУДНИКИ', value: stats.usersCount, icon: Users, gradient: 'from-emerald-500 to-green-500', change: `${stats.blockedCount} заблок.` },
                { label: 'ОТДЕЛЫ', value: stats.deptsCount, icon: Building2, gradient: 'from-orange-500 to-amber-500', change: '' },
                { label: 'В РАБОТЕ', value: statusCounts.inProgress + statusCounts.review, icon: Clock, gradient: 'from-cyan-500 to-blue-500', change: `${statusCounts.review} на проверке` },
              ].map((stat, i) => {
                const Icon = stat.icon;
                return (
                  <div key={i} className="backdrop-blur-md bg-white/80 rounded-xl sm:rounded-2xl p-4 sm:p-5 shadow-xl border border-white/20 hover:shadow-2xl transition-all hover:-translate-y-0.5">
                    <div className="flex items-center justify-between mb-3">
                      <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${stat.gradient} flex items-center justify-center shadow-lg`}>
                        <Icon className="w-5 h-5 text-white" />
                      </div>
                    </div>
                    <p className="text-2xl sm:text-3xl font-bold text-gray-900">{stat.value}</p>
                    <p className="text-[11px] sm:text-xs text-gray-500 uppercase tracking-wide mt-1">{stat.label}</p>
                    {stat.change && <p className="text-[11px] text-gray-400 mt-1">{stat.change}</p>}
                  </div>
                );
              })}
            </div>

            {/* Two-column layout */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
              {/* Status Distribution */}
              <div className="backdrop-blur-md bg-white/80 rounded-xl sm:rounded-2xl p-4 sm:p-6 shadow-xl border border-white/20">
                <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wide mb-4">Распределение статусов</h3>
                <div className="space-y-3">
                  {[
                    { label: 'Новые', count: statusCounts.new, color: 'bg-purple-500', bg: 'bg-purple-100' },
                    { label: 'В работе', count: statusCounts.inProgress, color: 'bg-amber-500', bg: 'bg-amber-100' },
                    { label: 'На проверке', count: statusCounts.review, color: 'bg-blue-500', bg: 'bg-blue-100' },
                    { label: 'Завершено', count: statusCounts.done, color: 'bg-emerald-500', bg: 'bg-emerald-100' },
                  ].map((s, i) => (
                    <div key={i}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-medium text-gray-700">{s.label}</span>
                        <span className="text-xs font-bold text-gray-900">{s.count}</span>
                      </div>
                      <div className={`w-full h-2.5 rounded-full ${s.bg}`}>
                        <div className={`h-full rounded-full ${s.color} transition-all duration-1000`} style={{ width: `${Math.max((s.count / totalDocs) * 100, 2)}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Overdue + Quick Actions */}
              <div className="space-y-4">
                {/* Overdue alert */}
                {overdueDocs.length > 0 && (
                  <div className="bg-gradient-to-r from-red-50 to-rose-50 rounded-xl sm:rounded-2xl p-4 sm:p-5 border border-red-100 shadow-lg">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-red-500 to-rose-500 flex items-center justify-center shadow-md">
                        <AlertTriangle className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-red-800">Просрочено: {overdueDocs.length}</h3>
                        <p className="text-[11px] text-red-600">Требуют внимания</p>
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      {overdueDocs.slice(0, 3).map(d => (
                        <div key={d.id} className="flex items-center gap-2 px-3 py-1.5 bg-white/60 rounded-lg text-xs">
                          <span className="font-medium text-red-800 truncate flex-1">{d.title}</span>
                          <span className="text-red-500 text-[10px] flex-shrink-0">{d.deadline!.toLocaleDateString('ru-RU')}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Quick Actions Grid */}
                <div className="backdrop-blur-md bg-white/80 rounded-xl sm:rounded-2xl p-4 sm:p-5 shadow-xl border border-white/20">
                  <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wide mb-3">Быстрые действия</h3>
                  <div className="grid grid-cols-2 gap-2.5">
                    {[
                      { href: '/?section=documents&addDoc=true', label: 'Документ', icon: FileText, gradient: 'from-blue-500 to-blue-600' },
                      { href: '/?section=users&add=true', label: 'Сотрудник', icon: Users, gradient: 'from-emerald-500 to-green-500' },
                      { href: '/?section=departments&add=true', label: 'Отдел', icon: Building2, gradient: 'from-orange-500 to-amber-500' },
                      { href: '/?section=audit', label: 'Журнал', icon: ScrollText, gradient: 'from-indigo-500 to-violet-500' },
                    ].map((action, i) => {
                      const Icon = action.icon;
                      return (
                        <Link key={i} href={action.href} className="flex items-center gap-2.5 px-3 py-3 rounded-xl bg-gray-50 hover:bg-gray-100 transition-all group border border-gray-100">
                          <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${action.gradient} flex items-center justify-center shadow-sm group-hover:shadow-md transition-shadow`}>
                            <Icon className="w-4 h-4 text-white" />
                          </div>
                          <span className="text-xs font-semibold text-gray-700">{action.label}</span>
                        </Link>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>

            {/* Two-column: Recent Docs + Deadlines */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
              {/* Recent Docs (2/3) */}
              <div className="lg:col-span-2 backdrop-blur-md bg-white/80 rounded-xl sm:rounded-2xl p-4 sm:p-6 shadow-xl border border-white/20">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wide">Последние документы</h3>
                  <Link href="/?section=documents" className="text-purple-600 hover:text-purple-700 flex items-center gap-1 text-xs font-medium">
                    Все <ChevronRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
                {latestDocs.length === 0 ? (
                  <div className="py-8 text-center text-sm text-gray-400">Документов пока нет</div>
                ) : (
                  <div className="space-y-2">
                    {latestDocs.map(doc => (
                      <div key={doc.id} className="flex items-center gap-3 p-3 rounded-xl bg-gray-50/80 border border-gray-100 hover:shadow-sm transition-all">
                        <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-purple-100 to-purple-200 flex items-center justify-center flex-shrink-0">
                          <FileText className="w-4 h-4 text-purple-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="text-sm font-semibold text-gray-900 truncate">{doc.title}</h4>
                          <p className="text-[11px] text-gray-500 truncate">
                            {doc.author.fullName} {doc.assignee ? `→ ${doc.assignee.fullName}` : ''}
                          </p>
                        </div>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium border ${
                          doc.statusId === 1 ? 'bg-purple-100 text-purple-700 border-purple-200'
                          : doc.statusId === 2 ? 'bg-amber-100 text-amber-700 border-amber-200'
                          : doc.statusId === 4 ? 'bg-green-100 text-green-700 border-green-200'
                          : 'bg-blue-100 text-blue-700 border-blue-200'
                        } whitespace-nowrap`}>
                          {doc.statusId === 1 ? 'Новое' : doc.statusId === 2 ? 'В работе' : doc.statusId === 4 ? 'Готово' : 'Проверка'}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Upcoming Deadlines (1/3) */}
              <div className="backdrop-blur-md bg-white/80 rounded-xl sm:rounded-2xl p-4 sm:p-6 shadow-xl border border-white/20">
                <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wide mb-4 flex items-center gap-2">
                  <CalendarDays className="w-4 h-4 text-purple-500" /> Дедлайны
                </h3>
                {upcomingDeadlines.length === 0 ? (
                  <div className="py-6 text-center text-sm text-gray-400">Нет активных дедлайнов</div>
                ) : (
                  <div className="space-y-3">
                    {upcomingDeadlines.map((doc, i) => {
                      const daysLeft = Math.ceil((new Date(doc.deadline!).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
                      const urgent = daysLeft <= 2;
                      return (
                        <div key={doc.id} className="relative pl-6">
                          <div className={`timeline-dot absolute left-0 top-1 w-3 h-3 rounded-full ${urgent ? 'bg-red-500' : 'bg-purple-400'}`} />
                          <p className="text-xs font-semibold text-gray-900 truncate">{doc.title}</p>
                          <p className={`text-[11px] ${urgent ? 'text-red-600 font-semibold' : 'text-gray-500'}`}>
                            {doc.deadline!.toLocaleDateString('ru-RU')} · {daysLeft === 0 ? 'Сегодня' : daysLeft === 1 ? 'Завтра' : `${daysLeft} дн.`}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
          );
        })()}


        {/* ══ USERS ══ */}
        {section === 'users' && (
          <div className="space-y-4 sm:space-y-6">
            {/* Stats and Search */}
            <div className="backdrop-blur-md bg-gradient-to-br from-emerald-50/90 to-cyan-50/90 rounded-xl sm:rounded-2xl p-4 sm:p-6 shadow-xl border border-white/20">
              <div className="flex flex-col gap-4">
                <div>
                  <h3 className="text-xs sm:text-sm font-medium text-gray-700 uppercase tracking-wide">КОМАНДА</h3>
                  <p className="text-sm sm:text-base text-gray-600 mt-1">Всего {stats.usersCount} • Активны {stats.usersCount - stats.blockedCount}</p>
                </div>
                <form method="get" className="relative w-full">
                  <input type="hidden" name="section" value="users" />
                  <input name="userQ" defaultValue={userSearchRaw} placeholder="Поиск по ФИО, роли или отделу..." className="w-full pl-4 pr-4 py-2 bg-white/80 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50" />
                </form>
              </div>
            </div>

            {/* Employees List */}
            {usersFiltered.length === 0 ? (
              <div className="backdrop-blur-md bg-white/80 rounded-xl sm:rounded-2xl p-8 shadow-xl border border-white/20 text-center text-sm text-gray-400">
                Сотрудники по такому запросу не найдены
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                {usersFiltered.map((u) => {
                  const colors = ['from-purple-500 to-purple-600', 'from-blue-500 to-blue-600', 'from-teal-500 to-teal-600', 'from-orange-500 to-orange-600', 'from-pink-500 to-pink-600'];
                  const color = colors[u.id % colors.length];
                  return (
                    <div key={u.id} className="backdrop-blur-md bg-white/80 rounded-xl p-4 sm:p-5 shadow-lg border border-white/20 hover:shadow-xl transition-all flex flex-col justify-between">
                      <div>
                        <div className="flex items-center gap-3 sm:gap-4 mb-4">
                          <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-lg bg-gradient-to-br ${color} flex items-center justify-center shadow-md flex-shrink-0`}>
                            <span className="text-lg sm:text-xl font-bold text-white">{u.fullName[0]}</span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="text-sm sm:text-base font-semibold text-gray-900 truncate" title={u.fullName}>{u.fullName}</h3>
                            <p className="text-xs text-gray-600 truncate">{u.role?.name} {u.department ? `• ${u.department.departmentName}` : ''}</p>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex flex-col gap-2 pt-3 border-t border-gray-100">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className={`px-2.5 py-1 rounded-md text-[11px] sm:text-xs font-semibold uppercase tracking-wider ${
                              u.registration?.isBlocked 
                                ? 'bg-rose-50 text-rose-600 border border-rose-100' 
                                : 'bg-emerald-50 text-emerald-600 border border-emerald-100'
                            }`}>
                              {u.registration?.isBlocked ? 'Заблокирован' : 'Активен'}
                            </span>
                            
                            {u.passwordResets && u.passwordResets.length > 0 && (
                              <span className="px-2.5 py-1 rounded-md text-[11px] sm:text-xs font-semibold uppercase tracking-wider bg-amber-50 text-amber-600 border border-amber-100 flex items-center gap-1">
                                <Key className="w-3 h-3" /> Запрос пароля
                              </span>
                            )}
                          </div>
                          
                          {u.id !== userId && (
                            <form action={toggleBlockUser}>
                              <input type="hidden" name="id" value={u.id} />
                              <input type="hidden" name="isBlocked" value={u.registration?.isBlocked ? 'true' : 'false'} />
                              <button type="submit" className={`p-1.5 rounded-md transition-all ${
                                u.registration?.isBlocked 
                                  ? 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100' 
                                  : 'bg-rose-50 text-rose-600 hover:bg-rose-100'
                              }`} title={u.registration?.isBlocked ? 'Разблокировать' : 'Заблокировать'}>
                                {u.registration?.isBlocked ? <Shield className="w-4 h-4" /> : <UserX className="w-4 h-4" />}
                              </button>
                            </form>
                          )}
                        </div>

                        <div className="flex items-center gap-2 mt-1">
                          <Link href={`/?section=users&edit=${u.id}`} className="flex-1 flex items-center justify-center px-3 py-1.5 bg-gray-50 hover:bg-gray-100 text-gray-700 rounded-lg text-xs font-medium transition-all border border-gray-200">
                            Изменить
                          </Link>
                          {u.id !== userId && (
                            <form action={impersonateUser}>
                              <input type="hidden" name="targetUserId" value={u.id} />
                              <button type="submit" className="flex items-center justify-center p-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-500 hover:text-blue-700 border border-blue-200 hover:border-blue-300 transition-all" title={`Войти как ${u.fullName}`}>
                                <LogIn className="w-4 h-4" />
                              </button>
                            </form>
                          )}
                          {u.id !== userId && (
                            <form action={deleteUser}>
                              <input type="hidden" name="id" value={u.id} />
                              <button type="submit" className="flex items-center justify-center p-1.5 rounded-lg bg-gray-50 hover:bg-red-50 hover:text-red-600 text-gray-400 border border-gray-200 hover:border-red-200 transition-all">
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </form>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Info Card */}
            <div className="backdrop-blur-md bg-gradient-to-br from-emerald-500/90 to-green-500/90 rounded-xl sm:rounded-2xl p-6 sm:p-8 shadow-xl border border-white/20">
              <div className="flex items-start gap-3 sm:gap-4 text-white">
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center flex-shrink-0">
                  <Shield className="w-5 h-5 sm:w-6 sm:h-6" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-semibold mb-2">Управление доступами</h3>
                  <p className="text-white/90 text-xs sm:text-sm">
                    Вы можете управлять правами доступа сотрудников, блокировать учетные записи и изменять роли. Для безопасности все действия логируются в системе.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ══ DEPARTMENTS ══ */}
        {section === 'departments' && (
          <div className="space-y-4 sm:space-y-6">
            <div className="backdrop-blur-md bg-gradient-to-br from-orange-50/90 to-amber-50/90 rounded-xl sm:rounded-2xl p-4 sm:p-6 shadow-xl border border-white/20">
              <div>
                <h3 className="text-xs sm:text-sm font-medium text-gray-700 uppercase tracking-wide">ОТДЕЛЫ</h3>
                <p className="text-sm sm:text-base text-gray-600 mt-1">Всего {departments.length}</p>
              </div>
            </div>

            {departments.length === 0 ? (
              <div className="backdrop-blur-md bg-white/80 rounded-xl sm:rounded-2xl p-12 shadow-xl border border-white/20 text-center text-sm text-gray-400">
                Пока нет ни одного отдела
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                {departments.map((dept) => (
                  <div key={dept.id} className="backdrop-blur-md bg-white/80 rounded-xl sm:rounded-2xl p-6 sm:p-8 shadow-xl border border-white/20 hover:shadow-2xl transition-all hover:-translate-y-1">
                    <div className="flex items-start justify-between mb-4 sm:mb-6">
                      <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center shadow-lg">
                        <Building2 className="w-6 h-6 sm:w-7 sm:h-7 text-white" />
                      </div>
                      <form action={deleteDepartment}>
                        <input type="hidden" name="id" value={dept.id} />
                        <button type="submit" className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg bg-red-50 hover:bg-red-100 flex items-center justify-center transition-all">
                          <Trash2 className="w-4 h-4 sm:w-5 sm:h-5 text-red-600" />
                        </button>
                      </form>
                    </div>
                    <h3 className="text-lg sm:text-xl font-semibold text-gray-900 mb-3">{dept.departmentName}</h3>
                    <div className="flex items-center gap-2 text-gray-600">
                      <Users className="w-4 h-4 sm:w-5 sm:h-5" />
                      <span className="text-xs sm:text-sm">{dept._count.users} сотрудников</span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Info Card */}
            <div className="backdrop-blur-md bg-gradient-to-br from-orange-500/90 to-amber-500/90 rounded-xl sm:rounded-2xl p-6 sm:p-8 shadow-xl border border-white/20">
              <div className="flex items-start gap-3 sm:gap-4 text-white">
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center flex-shrink-0">
                  <Building2 className="w-5 h-5 sm:w-6 sm:h-6" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-semibold mb-2">Структура организации</h3>
                  <p className="text-white/90 text-xs sm:text-sm">
                    Отделы помогают организовать работу сотрудников. Вы можете создавать новые отделы и управлять доступом к документам на уровне отдела.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ══ DOCUMENTS ══ */}
        {section === 'documents' && (
          <div className="space-y-4 sm:space-y-6">
            {/* Filters and Search */}
            <div className="backdrop-blur-md bg-white/80 rounded-xl sm:rounded-2xl p-4 sm:p-6 shadow-xl border border-white/20">
              <div className="flex flex-col gap-4 mb-4 sm:mb-6">
                <div>
                  <h3 className="text-xs sm:text-sm font-medium text-gray-700 uppercase tracking-wide">РЕЕСТР ДОКУМЕНТОВ</h3>
                  <p className="text-xs sm:text-sm text-gray-600 mt-1">Всего {statusCounts.total} • В работе {statusCounts.inProgress + statusCounts.review}</p>
                </div>
                <form method="get" className="relative w-full">
                  <input type="hidden" name="section" value="documents" />
                  {activeStatus !== 'all' && <input type="hidden" name="status" value={activeStatus} />}
                  <input name="q" defaultValue={searchQueryRaw} placeholder="Поиск по названию, автору или исполнителю..." className="w-full pl-4 pr-4 py-2 bg-white/80 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50" />
                </form>
              </div>
              {/* Tabs */}
              <div className="flex gap-2 flex-wrap">
                {[
                  { href: '/?section=documents', label: `Все (${statusCounts.total})`, active: activeStatus === 'all' },
                  { href: '/?section=documents&status=1', label: `Новые (${statusCounts.new})`, active: activeStatus === '1' },
                  { href: '/?section=documents&status=2', label: `В работе (${statusCounts.inProgress})`, active: activeStatus === '2' },
                  { href: '/?section=documents&status=3', label: `На проверке (${statusCounts.review})`, active: activeStatus === '3' },
                  { href: '/?section=documents&status=4', label: `Завершены (${statusCounts.done})`, active: activeStatus === '4' },
                ].map((tab, i) => (
                  <Link key={i} href={tab.href} className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-medium transition-all ${
                    tab.active
                      ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg shadow-blue-500/30'
                      : 'bg-white/60 text-gray-700 hover:bg-white border border-gray-200'
                  }`}>
                    {tab.label}
                  </Link>
                ))}
              </div>
            </div>

            {/* Documents List */}
            {filteredDocs.length === 0 ? (
              <div className="backdrop-blur-md bg-white/80 rounded-xl sm:rounded-2xl p-16 shadow-xl border border-white/20 text-center">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <FileText className="w-7 h-7 text-gray-300" />
                </div>
                <p className="text-sm text-gray-400">По заданным критериям ничего не найдено</p>
              </div>
            ) : (
              <div className="space-y-3 sm:space-y-4">
                {filteredDocs.map(doc => (
                  <div key={doc.id} className="backdrop-blur-md bg-white/80 rounded-xl sm:rounded-2xl p-4 sm:p-6 shadow-xl border border-white/20 hover:shadow-2xl transition-all">
                    <div className="flex flex-col gap-4">
                      <div className="flex items-start gap-3 sm:gap-4">
                        <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-gradient-to-br from-blue-100 to-blue-200 flex items-center justify-center flex-shrink-0">
                          <FileText className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-1">{doc.title}</h3>
                          <p className="text-xs sm:text-sm text-gray-600 mb-3">{doc.taskDescription || 'Нет описания задачи'}</p>
                          <div className="flex flex-col gap-2 text-xs sm:text-sm text-gray-600 mb-3">
                            <div className="flex items-start gap-2">
                              <span className="font-medium whitespace-nowrap">От:</span>
                              <span className="text-blue-600 break-words">{doc.author.fullName}</span>
                            </div>
                            {doc.assignee && (
                              <div className="flex items-start gap-2">
                                <span className="font-medium whitespace-nowrap">Исполнитель:</span>
                                <span className="text-blue-600 break-words">{doc.assignee.fullName}</span>
                              </div>
                            )}
                          </div>
                          {/* === БЛОК ПРИКРЕПЛЕННОГО ФАЙЛА === */}
                          {doc.fileName && (
                            <div className="mt-4 p-3 bg-blue-50/60 rounded-lg border border-blue-100">
                              <p className="text-[11px] text-gray-500 mb-1">Прикрепленный документ:</p>
                              <a href={`/api/files/${doc.id}`} download={doc.fileName || 'file'} className="text-sm text-blue-600 hover:text-blue-800 hover:underline flex items-center gap-2">
                                <Paperclip className="w-3.5 h-3.5 text-blue-600 flex-shrink-0" />
                                Скачать {doc.fileName || 'документ'}
                              </a>
                            </div>
                          )}
                          {/* === БЛОК ФАЙЛА-РЕЗУЛЬТАТА === */}
                          {doc.resultFileName && (
                            <div className="mt-2 p-3 bg-emerald-50/60 rounded-lg border border-emerald-100">
                              <p className="text-[11px] text-gray-500 mb-1">Файл результата:</p>
                              <a href={`/api/files/${doc.id}?type=result`} download={doc.resultFileName || 'result-file'} className="text-sm text-emerald-600 hover:text-emerald-800 hover:underline flex items-center gap-2">
                                <Paperclip className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                                Скачать результат ({doc.resultFileName || 'файл'})
                              </a>
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-4 pt-3 border-t border-gray-200">
                        <div className="flex items-center justify-between sm:justify-start gap-4">
                          <div>
                            <p className="text-xs text-gray-500 uppercase mb-1">ПРИОРИТЕТ</p>
                            <span className="inline-block px-2 sm:px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-xs font-medium border border-gray-200">
                              {doc.priority === 'high' ? 'Высокий' : doc.priority === 'low' ? 'Низкий' : 'Обычный'}
                            </span>
                          </div>
                          <span className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-medium border whitespace-nowrap ${
                            doc.statusId === 1 ? 'bg-purple-100 text-purple-700 border-purple-200'
                            : doc.statusId === 2 ? 'bg-amber-100 text-amber-700 border-amber-200'
                            : doc.statusId === 4 ? 'bg-green-100 text-green-700 border-green-200'
                            : 'bg-purple-100 text-purple-700 border-purple-200'
                          }`}>
                            {doc.statusId === 1 ? 'Новое' : doc.statusId === 2 ? 'В работе' : doc.statusId === 4 ? 'Завершено' : 'Проверка'}
                          </span>
                        </div>
                        <form action={deleteDocument} className="sm:ml-auto">
                          <input type="hidden" name="id" value={doc.id} />
                          <button type="submit" className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-red-50 hover:bg-red-100 text-red-600 transition-all text-sm font-medium">
                            <Trash2 className="w-4 h-4" /><span>Удалить</span>
                          </button>
                        </form>
                      </div>

                      {/* Comments */}
                      <DocumentComments
                        documentId={doc.id}
                        initialComments={(doc as any).comments?.map((c: any) => ({ ...c, createdAt: c.createdAt.toISOString ? c.createdAt.toISOString() : c.createdAt })) || []}
                        currentUserId={userId}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ══ AUDIT LOG ══ */}
        {section === 'audit' && (
          <div className="space-y-4 sm:space-y-6">
            <div className="backdrop-blur-md bg-white/80 rounded-xl sm:rounded-2xl p-4 sm:p-6 shadow-xl border border-white/20">
              <div className="flex flex-col gap-4">
                <div>
                  <h3 className="text-xs sm:text-sm font-medium text-gray-700 uppercase tracking-wide">ПОСЛЕДНИЕ СОБЫТИЯ</h3>
                  <p className="text-xs sm:text-sm text-gray-600 mt-1">Показано {auditLogs.length} последних записей</p>
                </div>
              </div>
            </div>

            {auditLogs.length === 0 ? (
              <div className="backdrop-blur-md bg-white/80 rounded-xl sm:rounded-2xl p-16 shadow-xl border border-white/20 text-center">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <ScrollText className="w-7 h-7 text-gray-300" />
                </div>
                <p className="text-sm text-gray-400">Журнал аудита пуст</p>
              </div>
            ) : (
              <div className="backdrop-blur-md bg-white/80 rounded-xl sm:rounded-2xl shadow-xl border border-white/20 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm whitespace-nowrap">
                    <thead className="bg-gray-50/80 text-gray-600 text-xs uppercase font-medium border-b border-gray-200">
                      <tr>
                        <th className="px-6 py-4">Дата и время</th>
                        <th className="px-6 py-4">Пользователь</th>
                        <th className="px-6 py-4">Действие</th>
                        <th className="px-6 py-4">Детали</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {auditLogs.map((log) => (
                        <tr key={log.id} className="hover:bg-gray-50/50 transition-colors">
                          <td className="px-6 py-4 text-gray-500 text-xs">
                            {new Date(log.createdAt).toLocaleString('ru-RU')}
                          </td>
                          <td className="px-6 py-4 font-medium text-gray-900">
                            {log.user ? log.user.fullName : <span className="text-gray-400 italic">Система / Удален</span>}
                          </td>
                          <td className="px-6 py-4">
                            <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium border ${
                              log.action.includes('Удаление') || log.action.includes('Блокировка') ? 'bg-red-50 text-red-700 border-red-100' :
                              log.action.includes('Создание') ? 'bg-emerald-50 text-emerald-700 border-emerald-100' :
                              log.action.includes('Вход') ? 'bg-blue-50 text-blue-700 border-blue-100' :
                              'bg-purple-50 text-purple-700 border-purple-100'
                            }`}>
                              {log.action}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-xs text-gray-500 max-w-[200px] sm:max-w-md truncate" title={log.details || ''}>
                            {log.details || '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ══ PASSWORD RESETS ══ */}
        {section === 'resets' && (
          <div className="space-y-4 sm:space-y-6">
            <div className="backdrop-blur-md bg-white/80 rounded-xl sm:rounded-2xl p-4 sm:p-6 shadow-xl border border-white/20">
              <div className="flex flex-col gap-4">
                <div>
                  <h3 className="text-xs sm:text-sm font-medium text-gray-700 uppercase tracking-wide">ЗАПРОСЫ НА СМЕНУ ПАРОЛЯ</h3>
                  <p className="text-xs sm:text-sm text-gray-600 mt-1">Показано {passwordResets.length} записей</p>
                </div>
              </div>
            </div>

            {passwordResets.length === 0 ? (
              <div className="backdrop-blur-md bg-white/80 rounded-xl sm:rounded-2xl p-16 shadow-xl border border-white/20 text-center">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Key className="w-7 h-7 text-gray-300" />
                </div>
                <p className="text-sm text-gray-400">Запросы отсутствуют</p>
              </div>
            ) : (
              <div className="backdrop-blur-md bg-white/80 rounded-xl sm:rounded-2xl shadow-xl border border-white/20 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm whitespace-nowrap">
                    <thead className="bg-gray-50/80 text-gray-600 text-xs uppercase font-medium border-b border-gray-200">
                      <tr>
                        <th className="px-6 py-4">Дата и время</th>
                        <th className="px-6 py-4">Логин</th>
                        <th className="px-6 py-4">Пользователь</th>
                        <th className="px-6 py-4">Статус</th>
                        <th className="px-6 py-4">Действие</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {passwordResets.map((reset) => (
                        <tr key={reset.id} className="hover:bg-gray-50/50 transition-colors">
                          <td className="px-6 py-4 text-gray-500 text-xs">
                            {new Date(reset.createdAt).toLocaleString('ru-RU')}
                          </td>
                          <td className="px-6 py-4 font-medium text-gray-900">
                            {reset.login}
                          </td>
                          <td className="px-6 py-4">
                            {reset.user ? reset.user.fullName : <span className="text-gray-400 italic">Не привязан</span>}
                          </td>
                          <td className="px-6 py-4">
                            <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium border ${
                              reset.status === 'PENDING' ? 'bg-amber-50 text-amber-700 border-amber-100' : 'bg-emerald-50 text-emerald-700 border-emerald-100'
                            }`}>
                              {reset.status === 'PENDING' ? 'Ожидает' : 'Решено'}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            {reset.status === 'PENDING' && (
                              <form action={resolvePasswordReset}>
                                <input type="hidden" name="requestId" value={reset.id} />
                                <button type="submit" className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-600 rounded-lg text-xs font-medium transition-all border border-emerald-200">
                                  <Check className="w-3.5 h-3.5" /> Решено
                                </button>
                              </form>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ══ BACKUP ══ */}
        {section === 'backup' && (
          <div className="space-y-4 sm:space-y-6">
            <div className="backdrop-blur-md bg-white/80 rounded-xl sm:rounded-2xl p-6 sm:p-10 shadow-xl border border-white/20 text-center max-w-2xl mx-auto mt-8">
              <div className="w-20 h-20 bg-gradient-to-br from-slate-100 to-slate-200 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner">
                <Database className="w-10 h-10 text-slate-600" />
              </div>
              <h3 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">Экспорт базы данных</h3>
              <p className="text-gray-600 mb-8 text-sm sm:text-base leading-relaxed">
                Вы можете скачать полную копию базы данных в формате JSON. Это включает всех пользователей, отделы, документы, статусы и журнал аудита. Рекомендуется регулярно создавать резервные копии для безопасности.
              </p>
              
              <a href="/api/backup" download className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-slate-700 to-slate-900 text-white rounded-xl shadow-lg shadow-slate-900/20 hover:shadow-xl hover:-translate-y-0.5 transition-all text-[15px] font-semibold active:scale-[0.98]">
                <Download className="w-5 h-5" />
                Скачать JSON-архив
              </a>
            </div>
          </div>
        )}

      </div>


      {/* ══ MODALS ══ */}
      {isAdding && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-md animate-fade-in-up">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden animate-fade-in-up">
            {/* Gradient header */}
            <div className={`px-6 py-5 flex justify-between items-center ${section === 'users' ? 'bg-gradient-to-r from-emerald-500 to-green-500' : 'bg-gradient-to-r from-orange-500 to-amber-500'}`}>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
                  {section === 'users' ? <Users className="w-5 h-5 text-white" /> : <Building2 className="w-5 h-5 text-white" />}
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">
                    {section === 'users' ? 'Новый сотрудник' : 'Новый отдел'}
                  </h3>
                  <p className="text-white/70 text-xs">Заполните данные ниже</p>
                </div>
              </div>
              <Link href={`/?section=${section}`} className="w-9 h-9 bg-white/15 backdrop-blur-sm rounded-xl flex items-center justify-center text-white/80 hover:text-white hover:bg-white/25 transition-all">
                <X className="w-4 h-4" />
              </Link>
            </div>
            <div className="p-6">
              {section === 'users' ? (
                <form action={createUser} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">ФИО</label>
                    <input name="fullName" required placeholder="Иванов Иван Иванович" className="w-full bg-gray-50/80 focus:bg-white border border-gray-200 focus:border-emerald-400 focus:ring-4 focus:ring-emerald-500/10 rounded-xl px-4 py-3 text-[15px] font-medium outline-none transition-all" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Логин</label>
                      <input name="login" required placeholder="ivanov" className="w-full bg-gray-50/80 focus:bg-white border border-gray-200 focus:border-emerald-400 focus:ring-4 focus:ring-emerald-500/10 rounded-xl px-4 py-3 text-[15px] font-medium outline-none transition-all" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Пароль</label>
                      <input name="password" required type="password" placeholder="••••••" className="w-full bg-gray-50/80 focus:bg-white border border-gray-200 focus:border-emerald-400 focus:ring-4 focus:ring-emerald-500/10 rounded-xl px-4 py-3 text-[15px] font-medium outline-none transition-all" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Роль</label>
                      <select name="roleId" className="w-full bg-gray-50/80 focus:bg-white border border-gray-200 focus:border-emerald-400 focus:ring-4 focus:ring-emerald-500/10 rounded-xl px-4 py-3 text-[15px] font-medium outline-none transition-all appearance-none cursor-pointer">
                        <option value="3">Сотрудник</option>
                        <option value="4">Руководитель</option>
                        <option value="1">Администратор</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Отдел</label>
                      <select name="departmentId" className="w-full bg-gray-50/80 focus:bg-white border border-gray-200 focus:border-emerald-400 focus:ring-4 focus:ring-emerald-500/10 rounded-xl px-4 py-3 text-[15px] font-medium outline-none transition-all appearance-none cursor-pointer">
                        <option value="">Без отдела</option>
                        {departments.map(d => (
                          <option key={d.id} value={d.id}>{d.departmentName}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <button type="submit" className="w-full bg-gradient-to-r from-emerald-500 to-green-500 text-white py-3.5 rounded-xl text-[15px] font-bold shadow-lg shadow-emerald-500/25 mt-2 hover:shadow-xl hover:-translate-y-0.5 active:scale-[0.98] transition-all flex items-center justify-center gap-2">
                    <Plus className="w-5 h-5" /> Создать сотрудника
                  </button>
                </form>
              ) : (
                <form action={createDepartment} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Название</label>
                    <input name="departmentName" required placeholder="Бухгалтерия" className="w-full bg-gray-50/80 focus:bg-white border border-gray-200 focus:border-orange-400 focus:ring-4 focus:ring-orange-500/10 rounded-xl px-4 py-3 text-[15px] font-medium outline-none transition-all" />
                  </div>
                  <button type="submit" className="w-full bg-gradient-to-r from-orange-500 to-amber-500 text-white py-3.5 rounded-xl text-[15px] font-bold shadow-lg shadow-orange-500/25 mt-2 hover:shadow-xl hover:-translate-y-0.5 active:scale-[0.98] transition-all flex items-center justify-center gap-2">
                    <Plus className="w-5 h-5" /> Создать отдел
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      )}

      {isEditing && userToEdit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-md animate-fade-in-up">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden animate-fade-in-up">
            <div className="px-6 py-5 flex justify-between items-center bg-gradient-to-r from-violet-500 to-purple-600">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center text-white text-sm font-bold">
                  {userToEdit.fullName[0]}
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">Редактирование</h3>
                  <p className="text-white/70 text-xs truncate max-w-[200px]">{userToEdit.fullName}</p>
                </div>
              </div>
              <Link href="/?section=users" className="w-9 h-9 bg-white/15 backdrop-blur-sm rounded-xl flex items-center justify-center text-white/80 hover:text-white hover:bg-white/25 transition-all">
                <X className="w-4 h-4" />
              </Link>
            </div>
            <div className="p-6">
              <form action={updateUser} className="space-y-4">
                <input type="hidden" name="id" value={userToEdit.id} />
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">ФИО</label>
                  <input name="fullName" defaultValue={userToEdit.fullName} required className="w-full bg-gray-50/80 focus:bg-white border border-gray-200 focus:border-purple-400 focus:ring-4 focus:ring-purple-500/10 rounded-xl px-4 py-3 text-[15px] font-medium outline-none transition-all" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Новый пароль</label>
                  <input name="password" type="text" placeholder="Оставьте пустым если не меняете" className="w-full bg-gray-50/80 focus:bg-white border border-gray-200 focus:border-purple-400 focus:ring-4 focus:ring-purple-500/10 rounded-xl px-4 py-3 text-[15px] font-medium outline-none transition-all" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Роль</label>
                    <select name="roleId" defaultValue={userToEdit.roleId} className="w-full bg-gray-50/80 focus:bg-white border border-gray-200 focus:border-purple-400 focus:ring-4 focus:ring-purple-500/10 rounded-xl px-4 py-3 text-[15px] font-medium outline-none transition-all appearance-none cursor-pointer">
                      <option value="3">Сотрудник</option>
                      <option value="4">Руководитель</option>
                      <option value="1">Администратор</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Отдел</label>
                    <select name="departmentId" defaultValue={userToEdit.departmentId || ''} className="w-full bg-gray-50/80 focus:bg-white border border-gray-200 focus:border-purple-400 focus:ring-4 focus:ring-purple-500/10 rounded-xl px-4 py-3 text-[15px] font-medium outline-none transition-all appearance-none cursor-pointer">
                      <option value="">Без отдела</option>
                      {departments.map(d => (
                        <option key={d.id} value={d.id}>{d.departmentName}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <button type="submit" className="w-full bg-gradient-to-r from-violet-500 to-purple-600 text-white py-3.5 rounded-xl text-[15px] font-bold shadow-lg shadow-purple-500/25 mt-2 hover:shadow-xl hover:-translate-y-0.5 active:scale-[0.98] transition-all flex items-center justify-center gap-2">
                  <CheckCircle2 className="w-5 h-5" /> Сохранить изменения
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {isAddingDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-md animate-fade-in-up">
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden animate-fade-in-up">
            <div className="px-6 py-5 flex justify-between items-center bg-gradient-to-r from-blue-500 to-cyan-500">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
                  <FileText className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">Новое поручение</h3>
                  <p className="text-white/70 text-xs">Создайте документ и назначьте исполнителя</p>
                </div>
              </div>
              <Link href={`/?section=${section}`} className="w-9 h-9 bg-white/15 backdrop-blur-sm rounded-xl flex items-center justify-center text-white/80 hover:text-white hover:bg-white/25 transition-all">
                <X className="w-5 h-5" />
              </Link>
            </div>
            <form action={createDocument} encType="multipart/form-data" className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Название документа</label>
                <input name="title" required placeholder="Например: Заявка на ремонт" className="w-full bg-gray-50/80 focus:bg-white border border-gray-200 focus:border-blue-400 focus:ring-4 focus:ring-blue-500/10 rounded-xl px-4 py-3 text-[15px] font-medium outline-none transition-all" />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Описание задачи</label>
                <textarea name="taskDescription" rows={3} placeholder="Подробности задачи..." className="w-full bg-gray-50/80 focus:bg-white border border-gray-200 focus:border-blue-400 focus:ring-4 focus:ring-blue-500/10 rounded-xl px-4 py-3 text-[15px] font-medium outline-none transition-all resize-none" />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Исполнитель</label>
                <select name="assignedTo" className="w-full bg-gray-50/80 focus:bg-white border border-gray-200 focus:border-blue-400 focus:ring-4 focus:ring-blue-500/10 rounded-xl px-4 py-3 text-[15px] font-medium outline-none transition-all appearance-none cursor-pointer">
                  <option value="">Без исполнителя</option>
                  {usersList.map(u => (
                    <option key={u.id} value={u.id}>{u.fullName} — {u.role?.name}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Дедлайн</label>
                  <input type="date" name="deadline" className="w-full bg-gray-50/80 focus:bg-white border border-gray-200 focus:border-blue-400 focus:ring-4 focus:ring-blue-500/10 rounded-xl px-4 py-3 text-[15px] font-medium outline-none transition-all" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Приоритет</label>
                  <select name="priority" className="w-full bg-gray-50/80 focus:bg-white border border-gray-200 focus:border-blue-400 focus:ring-4 focus:ring-blue-500/10 rounded-xl px-4 py-3 text-[15px] font-medium outline-none transition-all appearance-none cursor-pointer">
                    <option value="medium">Обычный</option>
                    <option value="high">Высокий</option>
                    <option value="low">Низкий</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Файл</label>
                <input type="file" name="file" className="w-full bg-gray-50/80 rounded-xl px-4 py-2.5 text-sm border border-gray-200 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-blue-100 file:text-blue-700 hover:file:bg-blue-200 transition-all cursor-pointer" />
              </div>
              <button type="submit" className="w-full bg-gradient-to-r from-blue-500 to-cyan-500 text-white py-3.5 rounded-xl text-[15px] font-bold shadow-lg shadow-blue-500/25 mt-2 hover:shadow-xl hover:-translate-y-0.5 active:scale-[0.98] transition-all flex items-center justify-center gap-2">
                <CheckCircle2 className="w-5 h-5" /> Создать и поручить
              </button>
            </form>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
