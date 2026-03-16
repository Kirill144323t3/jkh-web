import { prisma } from '@/lib/prisma';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createDocument, updateDocumentStatus, deleteDocument, submitDocumentResult } from '../actions';
import { FileText, Clock, CheckCircle2, Plus, X, Paperclip, Shield, Users, AlertTriangle, Calendar, ArrowRight, Send, Briefcase, ChevronRight, Trash2 } from 'lucide-react';
import { DashboardLayout } from '@/components/DashboardLayout';

export default async function EmployeeDashboard({ searchParams }: { 
  searchParams: Promise<{ [key: string]: string | string[] | undefined }> 
}) {
  const cookieStore = await cookies();
  const userIdString = cookieStore.get('userId')?.value;
  if (!userIdString) redirect('/login');
  const userId = parseInt(userIdString);

  const params = await searchParams;
  const isAddingDoc = params.addDoc === 'true';
  const isSubmittingDoc = params.submitDoc ? parseInt(params.submitDoc as string) : null;
  const section = (params.section || 'overview') as string;
  const tab = (params.tab || 'incoming') as string;

  const user = await prisma.user.findUnique({
    where: { id: userId }, include: { role: true, department: true }
  });
  if (!user) redirect('/login');

  const allUsers = await prisma.user.findMany({ 
    where: { roleId: { not: 1 } }, 
    include: { department: true },
    orderBy: { fullName: 'asc' } 
  });
  
  const groupedUsers = allUsers.reduce((acc, current) => {
    const deptName = current.department?.departmentName || 'Вне отдела';
    if (!acc[deptName]) acc[deptName] = [];
    acc[deptName].push(current);
    return acc;
  }, {} as Record<string, typeof allUsers>);
  
  // === РАЗГРАНИЧЕНИЕ ДОСТУПА К ДОКУМЕНТАМ ПО РОЛЯМ ===
  let myDocs: any[];
  if (user.roleId === 4 && user.departmentId) {
    const deptUsers = await prisma.user.findMany({
      where: { departmentId: user.departmentId },
      select: { id: true }
    });
    const deptUserIds = deptUsers.map(u => u.id);
    myDocs = await prisma.document.findMany({
      where: { OR: [{ assignedTo: { in: deptUserIds } }, { userId: { in: deptUserIds } }] },
      include: { author: true, assignee: true, status: true },
      orderBy: { createdAt: 'desc' }
    });
  } else {
    myDocs = await prisma.document.findMany({
      where: { OR: [{ assignedTo: userId }, { userId: userId }] },
      include: { author: true, assignee: true, status: true },
      orderBy: { createdAt: 'desc' }
    });
  }

  let incomingDocs: any[], completedDocs: any[], sentDocs: any[];
  if (user.roleId === 4) {
    incomingDocs = myDocs.filter((d: any) => d.statusId !== 4);
    completedDocs = myDocs.filter((d: any) => d.statusId === 4);
    sentDocs = myDocs.filter((d: any) => d.userId === userId && d.assignedTo !== userId);
  } else {
    incomingDocs = myDocs.filter((d: any) => d.assignedTo === userId && d.statusId !== 4);
    completedDocs = myDocs.filter((d: any) => d.assignedTo === userId && d.statusId === 4);
    sentDocs = myDocs.filter((d: any) => d.userId === userId && d.assignedTo !== userId);
  }
  
  const myTasksCount = incomingDocs.length;
  const myCreatedDocsCount = myDocs.filter((d: any) => d.userId === userId).length;
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const completedTodayCount = completedDocs.filter((d: any) => d.completedAt && new Date(d.completedAt) >= startOfToday).length;

  let displayedDocs = incomingDocs;
  if (tab === 'completed') displayedDocs = completedDocs;
  if (tab === 'sent') displayedDocs = sentDocs;

  let departmentUsers: any[] = [];
  let departmentDocs: any[] = [];
  if (user.roleId === 4 && user.departmentId) {
    departmentUsers = await prisma.user.findMany({
      where: { departmentId: user.departmentId },
      include: { assignedDocs: { include: { status: true } } }
    });
    const userIds = departmentUsers.map((u: any) => u.id);
    departmentDocs = await prisma.document.findMany({
      where: { OR: [{ userId: { in: userIds } }, { assignedTo: { in: userIds } }] },
      include: { author: true, assignee: true, status: true },
      orderBy: { createdAt: 'desc' }
    });
  }

  const statusConfig: Record<number, { label: string; color: string; border: string }> = {
    1: { label: 'Новое', color: 'bg-purple-100 text-purple-700', border: 'border-purple-200' },
    2: { label: 'В работе', color: 'bg-amber-100 text-amber-700', border: 'border-amber-200' },
    3: { label: 'На проверке', color: 'bg-blue-100 text-blue-700', border: 'border-blue-200' },
    4: { label: 'Завершено', color: 'bg-green-100 text-green-700', border: 'border-green-200' },
  };
  const priorityConfig: Record<string, { label: string; dot: string }> = {
    high: { label: 'Высокий', dot: 'bg-red-500' },
    medium: { label: 'Средний', dot: 'bg-amber-400' },
    low: { label: 'Низкий', dot: 'bg-gray-300' },
  };
  const isOverdue = (doc: any) => doc.deadline && new Date(doc.deadline) < new Date() && doc.statusId !== 4;

  return (
    <DashboardLayout userRole={user.roleId}>
      <div className="space-y-4 sm:space-y-6">
        {/* ═══ ОБЗОР ═══ */}
        {section === 'overview' && (<>
          <div className="backdrop-blur-md bg-white/80 rounded-xl sm:rounded-2xl p-4 sm:p-6 lg:p-8 shadow-xl border border-white/20">
            <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900 truncate">Добрый день, {user.fullName.split(' ')[0]}!</h1>
            <p className="text-xs sm:text-sm text-gray-600 mt-1">{new Date().toLocaleDateString('ru-RU', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 lg:gap-6">
            {[
              { label: user.roleId === 4 ? 'ЗАДАЧ В ОТДЕЛЕ' : 'ЗАДАЧ В РАБОТЕ', value: myTasksCount, gradient: 'from-purple-500 to-purple-600', icon: Clock },
              { label: 'ВЫПОЛНЕНО СЕГОДНЯ', value: completedTodayCount, gradient: 'from-teal-500 to-cyan-500', icon: CheckCircle2 },
              { label: 'СОЗДАНО ДОКУМЕНТОВ', value: myCreatedDocsCount, gradient: 'from-orange-500 to-amber-500', icon: Send },
            ].map((stat, i) => (
              <div key={i} className="backdrop-blur-md bg-white/80 rounded-xl sm:rounded-2xl p-4 sm:p-6 shadow-xl border border-white/20 hover:shadow-2xl transition-all hover:-translate-y-1">
                <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-gradient-to-br ${stat.gradient} flex items-center justify-center mb-3 sm:mb-4 shadow-lg`}>
                  <stat.icon className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                </div>
                <p className="text-xs sm:text-sm text-gray-600 uppercase tracking-wide mb-2">{stat.label}</p>
                <p className="text-3xl sm:text-4xl font-bold text-gray-900">{stat.value}</p>
              </div>
            ))}
          </div>

          {incomingDocs.length > 0 && (
            <div className="backdrop-blur-md bg-white/80 rounded-xl sm:rounded-2xl p-4 sm:p-6 lg:p-8 shadow-xl border border-white/20">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 sm:mb-6 gap-2 sm:gap-3">
                <div className="flex-1 min-w-0">
                  <h2 className="text-base sm:text-lg lg:text-xl font-semibold text-gray-900 truncate">Последние задачи</h2>
                  <p className="text-[11px] sm:text-xs text-gray-600 mt-0.5 sm:mt-1 truncate">Активные документы</p>
                </div>
                <Link href="/dashboard?section=documents" className="text-purple-600 hover:text-purple-700 flex items-center gap-1 text-xs sm:text-sm font-medium self-start sm:self-auto shrink-0">
                  Все <ChevronRight className="w-3 h-3 sm:w-4 sm:h-4" />
                </Link>
              </div>
              <div className="space-y-2 sm:space-y-3">
                {incomingDocs.slice(0, 5).map((doc: any) => {
                  const st = statusConfig[doc.statusId] || statusConfig[1];
                  return (
                    <div key={doc.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-3 sm:p-4 rounded-lg sm:rounded-xl bg-gradient-to-r from-gray-50/80 to-white/80 border border-gray-200/50 hover:shadow-md transition-all">
                      <div className="flex items-start sm:items-center gap-3 sm:gap-4 flex-1 min-w-0">
                        <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-gradient-to-br from-purple-100 to-purple-200 flex items-center justify-center flex-shrink-0">
                          <FileText className="w-4 h-4 sm:w-5 sm:h-5 text-purple-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-gray-900 text-sm sm:text-base truncate">{doc.title}</h3>
                          <p className="text-xs sm:text-sm text-gray-600 truncate">От: {doc.author?.fullName}</p>
                          <p className="text-xs sm:text-sm text-gray-600 truncate">Исполнитель: {doc.assignee?.fullName || 'Не назначен'}</p>
                        </div>
                      </div>
                      <div className="flex items-center justify-between sm:justify-end gap-3 sm:gap-4">
                        {isOverdue(doc) && <span className="text-xs font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded-full border border-red-200">Просрочен</span>}
                        <span className={`px-2 sm:px-3 py-1 rounded-full text-xs font-medium border ${st.color} ${st.border}`}>{st.label}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <Link href={`/dashboard?section=${section}&addDoc=true`} className="block">
            <div className="backdrop-blur-md bg-gradient-to-br from-purple-500/90 to-purple-600/90 rounded-xl sm:rounded-2xl p-6 sm:p-8 shadow-xl border border-white/20 hover:shadow-2xl transition-all hover:-translate-y-1">
              <div className="text-white">
                <p className="text-xs sm:text-sm uppercase tracking-wide mb-2 opacity-90">БЫСТРЫЕ ДЕЙСТВИЯ</p>
                <h2 className="text-xl sm:text-2xl font-semibold mb-4 sm:mb-6">Создайте новый документ</h2>
                <div className="flex items-center gap-2 px-5 sm:px-6 py-2.5 sm:py-3 bg-white/20 backdrop-blur-sm hover:bg-white/30 rounded-xl transition-all border border-white/30 shadow-lg w-fit">
                  <Plus className="w-4 h-4 sm:w-5 sm:h-5" />
                  <span className="font-medium text-sm sm:text-base">Новый документ</span>
                </div>
              </div>
            </div>
          </Link>
        </>)}

        {/* ═══ ДОКУМЕНТЫ ═══ */}
        {section === 'documents' && (<>
          <div className="backdrop-blur-md bg-white/80 rounded-xl sm:rounded-2xl p-4 sm:p-6 lg:p-8 shadow-xl border border-white/20">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
              <div className="flex-1 min-w-0">
                <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900 truncate">{user.roleId === 4 ? 'Документы отдела' : 'Мои документы'}</h1>
                <p className="text-xs sm:text-sm text-gray-600 mt-1 truncate">Управление поручениями</p>
              </div>
              <Link href={`/dashboard?section=documents&tab=${tab}&addDoc=true`} className="w-full sm:w-auto flex items-center justify-center gap-1.5 sm:gap-2 px-4 sm:px-5 py-2 sm:py-2.5 bg-gradient-to-r from-purple-500 to-purple-600 text-white rounded-xl shadow-lg shadow-purple-500/30 hover:shadow-xl transition-all font-medium text-xs sm:text-sm">
                <Plus className="w-4 h-4" /> <span className="whitespace-nowrap">Новый документ</span>
              </Link>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide -mx-4 px-4 sm:mx-0 sm:px-0">
            {[
              { key: 'incoming', label: user.roleId === 4 ? 'Задачи отдела' : 'Полученные', count: incomingDocs.length, gradient: 'from-cyan-500 to-blue-500', shadow: 'shadow-cyan-500/30' },
              { key: 'sent', label: 'Отправленные', count: sentDocs.length, gradient: 'from-indigo-500 to-purple-500', shadow: 'shadow-indigo-500/30' },
              { key: 'completed', label: 'Выполненные', count: completedDocs.length, gradient: 'from-teal-500 to-cyan-500', shadow: 'shadow-teal-500/30' },
            ].map(t => (
              <Link key={t.key} href={`/dashboard?section=documents&tab=${t.key}`}
                className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-medium transition-all whitespace-nowrap shrink-0 ${
                  tab === t.key ? `bg-gradient-to-r ${t.gradient} text-white shadow-lg ${t.shadow}` : 'backdrop-blur-md bg-white/80 text-gray-700 hover:bg-white/90 border border-white/20 shadow-sm'
                }`}
              >
                <span>{t.label}</span>
                <span className={`px-1.5 sm:px-2 py-0.5 rounded-md text-[10px] sm:text-xs font-bold ${tab === t.key ? 'bg-white/25 text-white' : 'bg-gray-100 text-gray-600'}`}>{t.count}</span>
              </Link>
            ))}
          </div>

          {/* Document list */}
          {displayedDocs.length === 0 ? (
            <div className="backdrop-blur-md bg-white/80 rounded-xl sm:rounded-2xl p-8 sm:p-12 shadow-xl border border-white/20 text-center">
              <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center mx-auto mb-4">
                <FileText className="w-7 h-7 text-gray-400" />
              </div>
              <p className="text-base font-medium text-gray-500">Документов пока нет</p>
            </div>
          ) : (
            <div className="space-y-3">
              {displayedDocs.map((doc: any) => {
                const st = statusConfig[doc.statusId] || statusConfig[1];
                const pr = priorityConfig[doc.priority] || priorityConfig.medium;
                const overdue = isOverdue(doc);
                return (
                  <div key={doc.id} className={`backdrop-blur-md bg-white/80 rounded-xl sm:rounded-2xl p-4 sm:p-5 shadow-xl border hover:shadow-2xl transition-all hover:-translate-y-0.5 ${overdue ? 'border-red-200 bg-red-50/30' : 'border-white/20'}`}>
                    {/* Status row */}
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium border ${st.color} ${st.border}`}>{st.label}</span>
                      <span className="flex items-center gap-1 text-xs text-gray-500"><span className={`w-1.5 h-1.5 rounded-full ${pr.dot}`}></span>{pr.label}</span>
                      {doc.deadline && (
                        <span className={`flex items-center gap-1 text-xs ${overdue ? 'text-red-600 font-semibold' : 'text-gray-500'}`}>
                          <Calendar className="w-3 h-3" />
                          {overdue && <AlertTriangle className="w-3 h-3" />}
                          до {new Date(doc.deadline).toLocaleDateString('ru-RU')}
                        </span>
                      )}
                    </div>

                    <h3 className="text-sm sm:text-base font-semibold text-gray-900">{doc.title}</h3>
                    {doc.taskDescription && <p className="text-xs sm:text-sm text-gray-600 mt-1 line-clamp-2">{doc.taskDescription}</p>}

                    <p className="text-xs sm:text-sm text-gray-500 mt-2">
                      <span>{doc.author?.fullName}</span> <ArrowRight className="w-3 h-3 inline text-gray-300 mx-1" /> <span className="font-medium text-gray-700">{doc.assignee?.fullName || 'Не назначен'}</span>
                    </p>

                    {/* Files */}
                    {(doc.fileUrl || doc.resultFileUrl || doc.resultText) && (
                      <div className="flex flex-wrap gap-2 mt-3">
                        {doc.fileUrl && (
                          <a href={doc.fileUrl} {...(doc.fileUrl.toLowerCase().endsWith('.pdf') ? { target: '_blank', rel: 'noopener noreferrer' } : { download: doc.fileName || true })}
                            className="inline-flex items-center gap-1 text-xs font-medium text-purple-600 bg-purple-50 px-2.5 py-1 rounded-lg border border-purple-100 hover:bg-purple-100 transition-colors">
                            <Paperclip className="w-3 h-3" /> {doc.fileName ? doc.fileName.slice(0, 20) + (doc.fileName.length > 20 ? '...' : '') : 'Файл'}
                          </a>
                        )}
                        {doc.resultFileUrl && (
                          <a href={doc.resultFileUrl} {...(doc.resultFileUrl.toLowerCase().endsWith('.pdf') ? { target: '_blank', rel: 'noopener noreferrer' } : { download: doc.resultFileName || true })}
                            className="inline-flex items-center gap-1 text-xs font-medium text-teal-600 bg-teal-50 px-2.5 py-1 rounded-lg border border-teal-100 hover:bg-teal-100 transition-colors">
                            <Paperclip className="w-3 h-3" /> {doc.resultFileName ? doc.resultFileName.slice(0, 20) + (doc.resultFileName.length > 20 ? '...' : '') : 'Результат'}
                          </a>
                        )}
                        {doc.resultText && <span className="text-xs text-gray-400 italic">«{doc.resultText}»</span>}
                      </div>
                    )}

                    {/* Actions */}
                    <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-2 mt-3 pt-3 border-t border-gray-100">
                      {doc.assignedTo === userId && doc.statusId === 1 && (
                        <form action={updateDocumentStatus} className="w-full sm:w-auto"><input type="hidden" name="id" value={doc.id} /><input type="hidden" name="statusId" value="2" />
                          <button type="submit" className="w-full sm:w-auto text-[11px] sm:text-xs font-medium text-amber-700 bg-amber-50 border border-amber-200 px-3 py-2 sm:py-1.5 rounded-lg hover:bg-amber-100 transition-colors flex items-center justify-center">Взять в работу</button>
                        </form>
                      )}
                      {doc.assignedTo === userId && (doc.statusId === 1 || doc.statusId === 2) && (
                        <Link href={`/dashboard?section=documents&tab=${tab}&submitDoc=${doc.id}`} className="w-full sm:w-auto text-[11px] sm:text-xs font-medium text-teal-700 bg-teal-50 border border-teal-200 px-3 py-2 sm:py-1.5 rounded-lg hover:bg-teal-100 transition-colors flex items-center justify-center">Сдать результат</Link>
                      )}
                      {doc.statusId === 3 && (doc.userId === userId || user.roleId === 4) && (<>
                        <form action={updateDocumentStatus} className="w-full sm:w-auto"><input type="hidden" name="id" value={doc.id} /><input type="hidden" name="statusId" value="4" />
                          <button type="submit" className="w-full sm:w-auto text-[11px] sm:text-xs font-medium text-green-700 bg-green-50 border border-green-200 px-3 py-2 sm:py-1.5 rounded-lg hover:bg-green-100 transition-colors flex items-center justify-center">✓ Принять</button>
                        </form>
                        <form action={updateDocumentStatus} className="w-full sm:w-auto"><input type="hidden" name="id" value={doc.id} /><input type="hidden" name="statusId" value="2" />
                          <button type="submit" className="w-full sm:w-auto text-[11px] sm:text-xs font-medium text-red-600 bg-red-50 border border-red-200 px-3 py-2 sm:py-1.5 rounded-lg hover:bg-red-100 transition-colors flex items-center justify-center">Доработать</button>
                        </form>
                      </>)}
                      {user.roleId === 4 && (
                        <form action={deleteDocument} className="w-full sm:w-auto sm:ml-auto col-span-2 sm:col-span-1"><input type="hidden" name="id" value={doc.id} />
                          <button type="submit" className="w-full sm:w-auto text-[11px] sm:text-xs font-medium flex items-center justify-center text-gray-500 hover:text-red-500 border border-gray-200 sm:border-transparent px-3 py-2 sm:py-1.5 rounded-lg hover:bg-red-50 hover:border-red-200 transition-colors">
                            <Trash2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 sm:mr-1" />
                            <span className="sm:hidden ml-1">Удалить</span>
                          </button>
                        </form>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>)}

        {/* ═══ МОЙ ОТДЕЛ ═══ */}
        {section === 'department' && user.roleId === 4 && (<>
          <div className="backdrop-blur-md bg-white/80 rounded-xl sm:rounded-2xl p-4 sm:p-6 lg:p-8 shadow-xl border border-white/20">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Отдел: {user.department?.departmentName}</h1>
            <p className="text-sm sm:text-base text-gray-600 mt-1">Сотрудники и задачи</p>
          </div>

          <div className="backdrop-blur-md bg-white/80 rounded-xl sm:rounded-2xl p-4 sm:p-6 shadow-xl border border-white/20">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Сотрудники · {departmentUsers.length}</h2>
            <div className="space-y-2">
              {departmentUsers.map((u: any) => (
                <div key={u.id} className="flex items-center justify-between p-3 sm:p-4 rounded-xl bg-gradient-to-r from-gray-50/80 to-white/80 border border-gray-200/50 hover:shadow-md transition-all">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg bg-gradient-to-br from-indigo-100 to-purple-200 flex items-center justify-center text-indigo-700 font-bold text-sm">{u.fullName[0]}</div>
                    <div>
                      <p className="text-sm font-semibold text-gray-900">{u.fullName}</p>
                      <p className="text-xs text-gray-500">{u.position}</p>
                    </div>
                  </div>
                  <span className="text-xs font-medium text-orange-700 bg-orange-50 px-2.5 py-1 rounded-full border border-orange-200">
                    {u.assignedDocs?.filter((d: any) => d.statusId !== 4).length || 0} задач
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="backdrop-blur-md bg-white/80 rounded-xl sm:rounded-2xl p-4 sm:p-6 shadow-xl border border-white/20">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Все документы отдела</h2>
            {departmentDocs.length === 0 ? (
              <p className="text-center text-gray-400 py-8">Нет документов</p>
            ) : (
              <div className="space-y-2">
                {departmentDocs.map((doc: any) => {
                  const st = statusConfig[doc.statusId] || statusConfig[1];
                  return (
                    <div key={doc.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 p-3 sm:p-4 rounded-xl bg-gradient-to-r from-gray-50/80 to-white/80 border border-gray-200/50 hover:shadow-md transition-all">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-gray-900 truncate">{doc.title}</p>
                        <p className="text-xs text-gray-500">{doc.author?.fullName} → {doc.assignee?.fullName || 'Не назначен'}</p>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        {doc.fileUrl && (
                          <a href={doc.fileUrl} {...(doc.fileUrl.toLowerCase().endsWith('.pdf') ? { target: '_blank', rel: 'noopener noreferrer' } : { download: doc.fileName || true })} className="text-xs font-medium text-purple-600 bg-purple-50 px-2 py-0.5 rounded-md border border-purple-100">
                            Файл
                          </a>
                        )}
                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium border ${st.color} ${st.border}`}>{st.label}</span>
                        {doc.statusId === 3 && (<>
                          <form action={updateDocumentStatus}><input type="hidden" name="id" value={doc.id} /><input type="hidden" name="statusId" value="4" />
                            <button type="submit" className="text-xs font-bold text-green-600 bg-green-50 px-2 py-0.5 rounded-md hover:bg-green-100">✓</button>
                          </form>
                          <form action={updateDocumentStatus}><input type="hidden" name="id" value={doc.id} /><input type="hidden" name="statusId" value="2" />
                            <button type="submit" className="text-xs font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded-md hover:bg-red-100">✕</button>
                          </form>
                        </>)}
                        <form action={deleteDocument}><input type="hidden" name="id" value={doc.id} />
                          <button type="submit" className="text-xs text-gray-400 hover:text-red-500">Удалить</button>
                        </form>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </>)}
      </div>

      {/* ═══ МОДАЛКА: НОВЫЙ ДОКУМЕНТ ═══ */}
      {isAddingDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl">
            <div className="flex justify-between items-center px-6 py-4 border-b border-gray-100">
              <h3 className="text-lg font-bold text-gray-900">Новое поручение</h3>
              <Link href={`/dashboard?section=${section}&tab=${tab}`} className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"><X className="w-5 h-5" /></Link>
            </div>
            <form action={createDocument} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Заголовок</label>
                <input name="title" required placeholder="Название документа" className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:bg-white focus:border-purple-400 focus:ring-2 focus:ring-purple-100 transition-all" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Описание задачи</label>
                <textarea name="taskDescription" rows={3} placeholder="Подробности..." className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:bg-white focus:border-purple-400 focus:ring-2 focus:ring-purple-100 transition-all resize-none" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Исполнитель</label>
                <select name="assignedTo" className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none appearance-none focus:bg-white focus:border-purple-400 focus:ring-2 focus:ring-purple-100 transition-all">
                  <option value="">Без исполнителя</option>
                  {Object.entries(groupedUsers).map(([dept, users]) => (
                    <optgroup key={dept} label={dept}>
                      {(users as any[]).map(u => (<option key={u.id} value={u.id}>{u.fullName} ({u.position})</option>))}
                    </optgroup>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Дедлайн</label>
                  <input type="date" name="deadline" className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:bg-white focus:border-purple-400 focus:ring-2 focus:ring-purple-100 transition-all" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Приоритет</label>
                  <select name="priority" className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none appearance-none focus:bg-white focus:border-purple-400 focus:ring-2 focus:ring-purple-100 transition-all">
                    <option value="medium">Средний</option>
                    <option value="high">Высокий</option>
                    <option value="low">Низкий</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Файл</label>
                <input type="file" name="file" className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2 text-sm file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-purple-50 file:text-purple-600 hover:file:bg-purple-100 cursor-pointer" />
              </div>
              <button type="submit" className="w-full bg-gradient-to-r from-purple-500 to-purple-600 text-white py-3 rounded-xl font-bold shadow-lg shadow-purple-500/30 hover:shadow-xl active:scale-[0.98] transition-all">Отправить</button>
            </form>
          </div>
        </div>
      )}

      {/* ═══ МОДАЛКА: СДАЧА РЕЗУЛЬТАТА ═══ */}
      {isSubmittingDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl">
            <div className="flex justify-between items-center px-6 py-4 border-b border-gray-100">
              <h3 className="text-lg font-bold text-gray-900">Сдача результата</h3>
              <Link href={`/dashboard?section=${section}&tab=${tab}`} className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"><X className="w-5 h-5" /></Link>
            </div>
            <form action={submitDocumentResult} className="p-6 space-y-4">
              <input type="hidden" name="id" value={isSubmittingDoc} />
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Комментарий</label>
                <textarea name="resultText" rows={4} placeholder="Опишите результат..." className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:bg-white focus:border-teal-400 focus:ring-2 focus:ring-teal-100 transition-all resize-none" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Файл результата</label>
                <input type="file" name="file" required className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2 text-sm file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-teal-50 file:text-teal-600 hover:file:bg-teal-100 cursor-pointer" />
              </div>
              <button type="submit" className="w-full bg-gradient-to-r from-teal-500 to-cyan-500 text-white py-3 rounded-xl font-bold shadow-lg shadow-teal-500/30 hover:shadow-xl active:scale-[0.98] transition-all">Отправить на проверку</button>
            </form>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}