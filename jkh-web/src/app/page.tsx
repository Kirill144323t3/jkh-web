import { prisma } from '@/lib/prisma';
import Link from 'next/link';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { createUser, createDepartment, logoutUser, deleteUser, deleteDepartment, updateUser, toggleBlockUser, deleteDocument, createDocument, resolvePasswordReset } from './actions';
import { LayoutDashboard, Users, Shield, Building2, FileText, Plus, X, Trash2, UserX, ChevronRight, CheckCircle2, CalendarDays, Paperclip, Briefcase, ScrollText, Database, Download, Key, Check } from 'lucide-react';
import { DashboardLayout } from '@/components/DashboardLayout';

export default async function AdminDashboardPage({ searchParams }: { 
  searchParams: Promise<{ [key: string]: string | string[] | undefined }> 
}) {
  const cookieStore = await cookies();
  const userIdStr = cookieStore.get('userId')?.value;
  const roleId = cookieStore.get('roleId')?.value;
  
  if (!userIdStr) redirect('/login');
  if (roleId !== '1') redirect('/dashboard');

  const userId = parseInt(userIdStr);
  const params = await searchParams;
  const section = params.section || 'overview';
  const isAdding = params.add === 'true';
  const isAddingDoc = params.addDoc === 'true';
  const editUserIdStr = params.edit as string;
  const isEditing = !!editUserIdStr;
  const statusParam = params.status as string | undefined;
  const activeStatus =
    statusParam && ['1', '2', '3', '4'].includes(statusParam) ? statusParam : 'all';
  const searchQueryRaw = params.q as string | undefined;
  const searchQuery = searchQueryRaw ? searchQueryRaw.toString().trim().toLowerCase() : '';

  const departments = await prisma.department.findMany({ include: { _count: { select: { users: true } } } });
  const usersList = await prisma.user.findMany({ 
    include: { 
      role: true, 
      department: true, 
      registration: true,
      passwordResetRequests: {
        where: { status: 'PENDING' }
      }
    }, 
    orderBy: { id: 'asc' } 
  });
  const docsList = await prisma.document.findMany({ include: { author: true, assignee: true }, orderBy: { createdAt: 'desc' } });
  const userToEdit = isEditing ? usersList.find(u => u.id === parseInt(editUserIdStr)) : null;

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
    const haystack = `${u.fullName} ${u.role?.roleName ?? ''} ${u.department?.departmentName ?? ''}`.toLowerCase();
    return haystack.includes(userSearch);
  });

  return (
    <DashboardLayout userRole={parseInt(roleId)}>
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
              </h2>
              <p className="text-sm sm:text-base text-gray-600 mt-1">
                {section === 'overview' && 'Обзор документооборота ЖКХ'}
                {section === 'users' && 'Управление учетными записями и доступами'}
                {section === 'departments' && 'Организационная структура предприятия'}
                {section === 'documents' && 'Управление документами и поручениями'}
                {section === 'audit' && 'История действий пользователей в системе'}
                {section === 'backup' && 'Экспорт данных системы в безопасный формат'}
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
        {section === 'overview' && (
          <div className="space-y-4 sm:space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6">
              {[
                { label: 'ВСЕГО ДОКУМЕНТОВ', value: stats.docsCount, icon: FileText, gradient: 'from-purple-500 to-purple-600' },
                { label: 'АКТИВНЫЕ', value: stats.docsCount - stats.blockedCount, icon: LayoutDashboard, gradient: 'from-orange-500 to-amber-500' },
                { label: 'ОТДЕЛЫ', value: stats.deptsCount, icon: Briefcase, gradient: 'from-teal-500 to-cyan-500' },
                { label: 'ЗАБЛОКИРОВАННЫЕ', value: stats.blockedCount, icon: UserX, gradient: 'from-red-500 to-pink-500' },
              ].map((stat, i) => {
                const Icon = stat.icon;
                return (
                  <div key={i} className="backdrop-blur-md bg-white/80 rounded-xl sm:rounded-2xl p-4 sm:p-6 shadow-xl border border-white/20 hover:shadow-2xl transition-all hover:-translate-y-1">
                    <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-gradient-to-br ${stat.gradient} flex items-center justify-center mb-3 sm:mb-4 shadow-lg`}>
                      <Icon className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                    </div>
                    <p className="text-xs sm:text-sm text-gray-600 uppercase tracking-wide mb-2">{stat.label}</p>
                    <p className="text-3xl sm:text-4xl font-bold text-gray-900">{stat.value}</p>
                  </div>
                );
              })}
            </div>

            {/* Recent Docs */}
            <div className="backdrop-blur-md bg-white/80 rounded-xl sm:rounded-2xl p-4 sm:p-6 lg:p-8 shadow-xl border border-white/20">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 sm:mb-6 gap-3">
                <div>
                  <h3 className="text-lg sm:text-xl font-semibold text-gray-900">Последние документы</h3>
                  <p className="text-xs sm:text-sm text-gray-600 mt-1">Последние созданные или измененные документы</p>
                </div>
                <Link href="/?section=documents" className="text-blue-600 hover:text-blue-700 flex items-center gap-1 text-sm font-medium self-start sm:self-auto">
                  Все <ChevronRight className="w-4 h-4" />
                </Link>
              </div>
              {latestDocs.length === 0 ? (
                <div className="py-10 text-center text-sm text-gray-400">Документов пока нет</div>
              ) : (
                <div className="space-y-2 sm:space-y-3">
                  {latestDocs.map(doc => (
                    <div key={doc.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-3 sm:p-4 rounded-lg sm:rounded-xl bg-gradient-to-r from-gray-50/80 to-white/80 border border-gray-200/50 hover:shadow-md transition-all">
                      <div className="flex items-start sm:items-center gap-3 sm:gap-4 flex-1 min-w-0">
                        <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-gradient-to-br from-blue-100 to-blue-200 flex items-center justify-center flex-shrink-0">
                          <FileText className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-semibold text-gray-900 text-sm sm:text-base truncate">{doc.title}</h4>
                          <p className="text-xs sm:text-sm text-gray-600 truncate">
                            От: {doc.author.fullName}
                            {doc.assignee ? ` • Исполнитель: ${doc.assignee.fullName}` : ''}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center justify-between sm:justify-end gap-3 sm:gap-4">
                        {doc.deadline && <span className="text-xs sm:text-sm text-gray-500">{doc.deadline.toLocaleDateString('ru-RU')}</span>}
                        <span className={`px-2 sm:px-3 py-1 rounded-full text-xs font-medium border ${
                          doc.statusId === 1 ? 'bg-purple-100 text-purple-700 border-purple-200'
                          : doc.statusId === 2 ? 'bg-amber-100 text-amber-700 border-amber-200'
                          : doc.statusId === 4 ? 'bg-green-100 text-green-700 border-green-200'
                          : 'bg-purple-100 text-purple-700 border-purple-200'
                        } whitespace-nowrap`}>
                          {doc.statusId === 1 ? 'Новое' : doc.statusId === 2 ? 'В работе' : doc.statusId === 4 ? 'Завершено' : 'Проверка'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Quick Actions */}
            <div className="backdrop-blur-md bg-gradient-to-br from-purple-500/90 to-purple-600/90 rounded-xl sm:rounded-2xl p-6 sm:p-8 shadow-xl border border-white/20">
              <div className="text-white">
                <p className="text-xs sm:text-sm uppercase tracking-wide mb-2 opacity-90">БЫСТРЫЕ ДЕЙСТВИЯ</p>
                <h3 className="text-xl sm:text-2xl font-semibold mb-4 sm:mb-6">Создайте новый документ</h3>
                <Link href="/?section=documents&addDoc=true" className="flex items-center gap-2 px-5 sm:px-6 py-2.5 sm:py-3 bg-white/20 backdrop-blur-sm hover:bg-white/30 rounded-xl transition-all border border-white/30 shadow-lg w-fit">
                  <Plus className="w-4 h-4 sm:w-5 sm:h-5" /><span className="font-medium text-sm sm:text-base">Новый документ</span>
                </Link>
              </div>
            </div>


          </div>
        )}

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
                            <p className="text-xs text-gray-600 truncate">{u.role?.roleName} {u.department ? `• ${u.department.departmentName}` : ''}</p>
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
                            
                            {u.passwordResetRequests && u.passwordResetRequests.length > 0 && (
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
                          {/* Attachments */}
                          <div className="flex flex-wrap gap-2">
                            {doc.fileUrl && (
                              <a href={doc.fileUrl} {...(doc.fileUrl.toLowerCase().endsWith('.pdf') ? { target: '_blank', rel: 'noopener noreferrer' } : { download: doc.fileName || true })} className="flex items-center gap-2 px-2 sm:px-3 py-1 sm:py-1.5 bg-blue-50 border border-blue-200 rounded-lg text-xs sm:text-sm hover:bg-blue-100 transition-colors">
                                <Paperclip className="w-3 h-3 sm:w-4 sm:h-4 text-blue-600 flex-shrink-0" />
                                <span className="text-blue-700 truncate max-w-[150px] sm:max-w-none">{doc.fileName || 'Файл задачи'}</span>
                              </a>
                            )}
                            {doc.resultFileUrl && (
                              <a href={doc.resultFileUrl} {...(doc.resultFileUrl.toLowerCase().endsWith('.pdf') ? { target: '_blank', rel: 'noopener noreferrer' } : { download: doc.resultFileName || true })} className="flex items-center gap-2 px-2 sm:px-3 py-1 sm:py-1.5 bg-emerald-50 border border-emerald-200 rounded-lg text-xs sm:text-sm">
                                <Paperclip className="w-3 h-3 sm:w-4 sm:h-4 text-emerald-600 flex-shrink-0" />
                                <span className="text-emerald-700 truncate max-w-[150px] sm:max-w-none">{doc.resultFileName || 'Результат'}</span>
                              </a>
                            )}
                          </div>
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 flex justify-between items-center border-b border-slate-100">
              <h3 className="text-lg font-semibold text-slate-900">
                {section === 'users' ? 'Новый сотрудник' : 'Новый отдел'}
              </h3>
              <Link href={`/?section=${section}`} className="w-9 h-9 bg-slate-50 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 border border-slate-100 transition-colors">
                <X className="w-4 h-4" />
              </Link>
            </div>
            <div className="p-6">
              {section === 'users' ? (
                <form action={createUser} className="space-y-4">
                  <input name="fullName" required placeholder="ФИО сотрудника" className="w-full bg-slate-50 focus:bg-white border border-slate-200 focus:border-purple-400 focus:ring-2 focus:ring-purple-200 rounded-xl px-4 py-3 text-[15px] font-medium outline-none transition-colors" />
                  <div className="grid grid-cols-2 gap-4">
                    <input name="login" required placeholder="Логин" className="w-full bg-slate-50 focus:bg-white border border-slate-200 focus:border-purple-400 focus:ring-2 focus:ring-purple-200 rounded-xl px-4 py-3 text-[15px] font-medium outline-none transition-colors" />
                    <input name="password" required type="password" placeholder="Пароль" className="w-full bg-slate-50 focus:bg-white border border-slate-200 focus:border-purple-400 focus:ring-2 focus:ring-purple-200 rounded-xl px-4 py-3 text-[15px] font-medium outline-none transition-colors" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <select name="roleId" className="w-full bg-slate-50 focus:bg-white border border-slate-200 focus:border-purple-400 focus:ring-2 focus:ring-purple-200 rounded-xl px-4 py-3 text-[15px] font-medium outline-none transition-colors appearance-none">
                      <option value="3">Сотрудник</option>
                      <option value="4">Руководитель</option>
                      <option value="1">Администратор</option>
                    </select>
                    <select name="departmentId" className="w-full bg-slate-50 focus:bg-white border border-slate-200 focus:border-purple-400 focus:ring-2 focus:ring-purple-200 rounded-xl px-4 py-3 text-[15px] font-medium outline-none transition-colors appearance-none">
                      <option value="">Без отдела</option>
                      {departments.map(d => (
                        <option key={d.id} value={d.id}>{d.departmentName}</option>
                      ))}
                    </select>
                  </div>
                  <button type="submit" className="w-full bg-gradient-to-r from-purple-500 to-purple-600 text-white py-3.5 rounded-xl text-[15px] font-semibold shadow-lg shadow-purple-500/20 mt-4 hover:shadow-xl active:scale-[0.98] transition-all">
                    Создать
                  </button>
                </form>
              ) : (
                <form action={createDepartment} className="space-y-4">
                  <input name="departmentName" required placeholder="Название отдела" className="w-full bg-slate-50 focus:bg-white border border-slate-200 focus:border-purple-400 focus:ring-2 focus:ring-purple-200 rounded-xl px-4 py-3 text-[15px] font-medium outline-none transition-colors" />
                  <button type="submit" className="w-full bg-gradient-to-r from-orange-500 to-amber-500 text-white py-3.5 rounded-xl text-[15px] font-semibold shadow-lg shadow-orange-500/20 mt-2 hover:shadow-xl active:scale-[0.98] transition-all">
                    Создать отдел
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      )}

      {isEditing && userToEdit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 flex justify-between items-center border-b border-slate-100">
              <h3 className="text-lg font-semibold text-slate-900">Редактирование</h3>
              <Link href="/?section=users" className="w-9 h-9 bg-slate-50 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 border border-slate-100 transition-colors">
                <X className="w-4 h-4" />
              </Link>
            </div>
            <div className="p-6">
              <form action={updateUser} className="space-y-4">
                <input type="hidden" name="id" value={userToEdit.id} />
                <input name="fullName" defaultValue={userToEdit.fullName} required className="w-full bg-slate-50 focus:bg-white border border-slate-200 focus:border-purple-400 focus:ring-2 focus:ring-purple-200 rounded-xl px-4 py-3 text-[15px] font-medium outline-none transition-colors" />
                <input name="password" type="text" placeholder="Новый пароль (если меняете)" className="w-full bg-slate-50 focus:bg-white border border-slate-200 focus:border-purple-400 focus:ring-2 focus:ring-purple-200 rounded-xl px-4 py-3 text-[15px] font-medium outline-none transition-colors" />
                <div className="grid grid-cols-2 gap-4">
                  <select name="roleId" defaultValue={userToEdit.roleId} className="w-full bg-slate-50 focus:bg-white border border-slate-200 focus:border-purple-400 focus:ring-2 focus:ring-purple-200 rounded-xl px-4 py-3 text-[15px] font-medium outline-none transition-colors appearance-none">
                    <option value="3">Сотрудник</option>
                    <option value="4">Руководитель</option>
                    <option value="1">Администратор</option>
                  </select>
                  <select name="departmentId" defaultValue={userToEdit.departmentId || ''} className="w-full bg-slate-50 focus:bg-white border border-slate-200 focus:border-purple-400 focus:ring-2 focus:ring-purple-200 rounded-xl px-4 py-3 text-[15px] font-medium outline-none transition-colors appearance-none">
                    <option value="">Без отдела</option>
                    {departments.map(d => (
                      <option key={d.id} value={d.id}>{d.departmentName}</option>
                    ))}
                  </select>
                </div>
                <button type="submit" className="w-full bg-gradient-to-r from-purple-500 to-purple-600 text-white py-3.5 rounded-xl text-[15px] font-semibold shadow-lg shadow-purple-500/20 mt-4 hover:shadow-xl active:scale-[0.98] transition-all">
                  Сохранить
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {isAddingDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-xl p-8 border border-slate-200">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-slate-900 flex items-center gap-3">
                <FileText className="text-blue-500 w-6 h-6" />
                Новое поручение
              </h3>
              <Link href={`/?section=${section}`} className="w-10 h-10 bg-slate-50 flex items-center justify-center rounded-xl text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors">
                <X className="w-5 h-5" />
              </Link>
            </div>
            <form action={createDocument} className="space-y-5 text-[15px]">
              <div>
                <label className="block mb-2 text-slate-600 font-semibold">Название документа</label>
                <input name="title" required placeholder="Например: Заявка на ремонт" className="w-full bg-slate-50 rounded-xl px-5 py-3.5 outline-none focus:bg-white focus:ring-4 ring-blue-500/10 border border-slate-200 focus:border-blue-400 text-[15px] font-medium transition-all" />
              </div>
              <div>
                <label className="block mb-2 text-slate-600 font-semibold">Описание задачи</label>
                <textarea name="taskDescription" rows={3} placeholder="Подробности..." className="w-full bg-slate-50 rounded-xl px-5 py-3.5 outline-none focus:bg-white focus:ring-4 ring-blue-500/10 border border-slate-200 focus:border-blue-400 text-[15px] font-medium transition-all resize-none" />
              </div>
              <div>
                <label className="block mb-2 text-slate-600 font-semibold">Исполнитель</label>
                <select name="assignedTo" className="w-full bg-slate-50 rounded-xl px-5 py-3.5 outline-none font-medium appearance-none border border-slate-200 focus:bg-white focus:ring-4 ring-blue-500/10 focus:border-blue-400 text-[15px] transition-all">
                  <option value="">Без исполнителя</option>
                  {usersList.map(u => (
                    <option key={u.id} value={u.id}>{u.fullName} — {u.role?.roleName}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block mb-2 text-slate-600 font-semibold">Дедлайн (до)</label>
                  <input type="date" name="deadline" className="w-full bg-slate-50 rounded-xl px-5 py-3.5 outline-none focus:bg-white focus:ring-4 ring-blue-500/10 border border-slate-200 focus:border-blue-400 text-[15px] font-medium transition-all" />
                </div>
                <div>
                  <label className="block mb-2 text-slate-600 font-semibold">Приоритет</label>
                  <select name="priority" className="w-full bg-slate-50 rounded-xl px-5 py-3.5 outline-none font-medium appearance-none border border-slate-200 focus:bg-white focus:ring-4 ring-blue-500/10 focus:border-blue-400 text-[15px] transition-all">
                    <option value="medium">Обычный</option>
                    <option value="high">Высокий</option>
                    <option value="low">Низкий</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block mb-2 text-slate-600 font-semibold">Прикрепить файл (необязательно)</label>
                <input type="file" name="file" className="w-full bg-slate-50 rounded-xl px-5 py-3 outline-none font-medium text-sm border border-slate-200 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-bold file:bg-blue-100 file:text-blue-700 hover:file:bg-blue-200 transition-all cursor-pointer" />
              </div>
              <button type="submit" className="w-full bg-gradient-to-r from-blue-500 to-blue-600 text-white py-4 rounded-xl text-[16px] font-bold shadow-xl shadow-blue-500/20 mt-4 active:scale-[0.98] hover:shadow-2xl transition-all duration-300 flex justify-center items-center gap-2">
                <CheckCircle2 className="w-5 h-5" /> Создать и поручить
              </button>
            </form>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}