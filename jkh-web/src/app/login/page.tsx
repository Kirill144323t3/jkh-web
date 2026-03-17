import { loginUser, requestPasswordReset } from '../actions';
import { Shield, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default async function LoginPage({ searchParams }: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const params = await searchParams;
  const error = params.error as string | undefined;
  const reset = params.reset === 'true';
  const success = params.success as string | undefined;

  return (
    <div className="relative flex items-center justify-center min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-cyan-50 overflow-hidden">
      {/* Фоновые декоративные элементы */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute top-[-15%] left-[-10%] w-[500px] h-[500px] bg-purple-300/20 rounded-full mix-blend-multiply filter blur-[100px] animate-blob"></div>
        <div className="absolute top-[30%] right-[-5%] w-[450px] h-[450px] bg-cyan-300/20 rounded-full mix-blend-multiply filter blur-[110px] animate-blob animation-delay-2000"></div>
        <div className="absolute bottom-[-10%] left-[30%] w-[500px] h-[500px] bg-blue-300/15 rounded-full mix-blend-multiply filter blur-[120px] animate-blob animation-delay-4000"></div>
      </div>

      {/* Карточка авторизации */}
      <div className="relative z-10 w-full max-w-md mx-4 animate-fade-in-up">
        <div className="backdrop-blur-md bg-white/80 border border-white/20 rounded-2xl shadow-xl p-6 sm:p-10">
          {/* Логотип */}
          <div className="flex flex-col items-center mb-8">
            <div className="w-14 h-14 sm:w-16 sm:h-16 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg shadow-purple-500/30 mb-4">
              <Shield className="text-white w-7 h-7 sm:w-8 sm:h-8" />
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900">ЖКХ Система</h1>
            <p className="text-sm text-gray-600 mt-1">Войдите в свою учётную запись</p>
          </div>

          {/* Ошибки */}
          {error === '1' && (
            <div className="mb-5 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm font-medium text-center">
              Неверный логин или пароль
            </div>
          )}
          {error === 'blocked' && (
            <div className="mb-5 px-4 py-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-700 text-sm font-medium text-center">
              Ваш аккаунт заблокирован
            </div>
          )}
          {success === 'reset' && (
            <div className="mb-5 px-4 py-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-700 text-sm font-medium text-center">
              Запрос отправлен админу
            </div>
          )}

          {reset ? (
            /* Форма восстановления пароля */
            <form action={requestPasswordReset} className="space-y-4">
              <div>
                <label htmlFor="login_reset" className="block text-sm font-medium text-gray-700 mb-1.5">Логин</label>
                <input id="login_reset" name="login" type="text" required autoComplete="username" placeholder="Введите логин для сброса"
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 sm:py-3 text-sm sm:text-base outline-none focus:bg-white focus:border-purple-400 focus:ring-2 focus:ring-purple-100 transition-all" />
              </div>
              <button type="submit" className="w-full bg-gradient-to-r from-purple-500 to-purple-600 text-white py-3 sm:py-3.5 rounded-xl text-sm sm:text-base font-bold shadow-lg shadow-purple-500/25 hover:shadow-xl active:scale-[0.98] transition-all">
                Запросить сброс пароля
              </button>
              <Link href="/login" className="flex items-center justify-center gap-2 text-sm text-gray-500 hover:text-gray-700 mt-2">
                <ArrowLeft className="w-4 h-4" /> назад к входу
              </Link>
            </form>
          ) : (
            /* Стандартная форма */
            <form action={loginUser} className="space-y-4">
              <div>
                <label htmlFor="login" className="block text-sm font-medium text-gray-700 mb-1.5">Логин</label>
                <input id="login" name="login" type="text" required autoComplete="username" placeholder="Введите логин"
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 sm:py-3 text-sm sm:text-base outline-none focus:bg-white focus:border-purple-400 focus:ring-2 focus:ring-purple-100 transition-all" />
              </div>
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1.5">Пароль</label>
                <input id="password" name="password" type="password" required autoComplete="current-password" placeholder="Введите пароль"
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 sm:py-3 text-sm sm:text-base outline-none focus:bg-white focus:border-purple-400 focus:ring-2 focus:ring-purple-100 transition-all" />
              </div>
              <div className="flex justify-end">
                <Link href="/login?reset=true" className="text-xs sm:text-sm text-purple-600 hover:text-purple-700 font-medium transition-colors">
                  Забыли пароль?
                </Link>
              </div>
              <button type="submit" className="w-full bg-gradient-to-r from-purple-500 to-purple-600 text-white py-3 sm:py-3.5 rounded-xl text-sm sm:text-base font-bold shadow-lg shadow-purple-500/25 hover:shadow-xl active:scale-[0.98] transition-all">
                Войти в систему
              </button>
            </form>
          )}
        </div>

        <p className="text-center text-xs text-gray-400 mt-6">
          © {new Date().getFullYear()} ЖКХ Система — Документооборот
        </p>
      </div>
    </div>
  );
}