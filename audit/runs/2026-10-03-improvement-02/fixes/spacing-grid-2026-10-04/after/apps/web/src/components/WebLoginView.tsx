import React, { useState } from 'react';
import {
  ArrowRight,
  AlertCircle,
  Boxes,
  Eye,
  EyeOff,
  FileCheck,
  Lock,
  Mail,
  ShieldCheck,
} from 'lucide-react';
import { useApp } from '../context/AppContext';

export const WebLoginView: React.FC = () => {
  const { login } = useApp();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (isSubmitting) return;
    setErrorMessage('');
    setIsSubmitting(true);
    try {
      const result = await login(email.trim(), password);
      if (!result.success) setErrorMessage(result.message);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : 'Không thể đăng nhập. Vui lòng thử lại.',
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-dvh bg-slate-950 text-slate-100 flex flex-col relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(var(--icd-login-grid)_1px,transparent_1px)] [background-size:28px_28px] opacity-25 pointer-events-none" />
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-blue-600/20 rounded-full blur-3xl pointer-events-none" />
      <header className="relative px-5 py-5 sm:px-8 border-b border-slate-800/80 flex items-center gap-3">
        <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-blue-700 to-sky-500 flex items-center justify-center font-black text-sm">
          ICD
        </div>
        <div>
          <h1 className="font-bold text-sm sm:text-base">ICD-TOS · Vận hành cảng cạn</h1>
          <p className="text-xs text-slate-400 mt-1">Cổng quản trị & điều hành</p>
        </div>
      </header>
      <main className="relative flex-1 mx-auto w-full max-w-6xl px-5 py-8 sm:py-12 flex flex-col lg:flex-row items-center justify-center gap-8 lg:gap-16">
        <div className="max-w-lg flex-1 space-y-5">
          <div className="inline-flex items-center gap-2 rounded-full border border-blue-500/30 bg-blue-500/10 px-3 py-2 text-xs font-semibold text-blue-300">
            <ShieldCheck className="h-4 w-4" />
            Không gian vận hành tập trung
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight leading-tight">
            Quản lý vòng đời container <span className="text-sky-400">từ cổng đến bãi.</span>
          </h2>
          <p className="text-sm leading-relaxed text-slate-300">
            Theo dõi lược khai, chuyến xe, vị trí bãi, dịch vụ và bàn giao vận chuyển trong cùng một
            không gian làm việc.
          </p>
          <div className="hidden sm:grid grid-cols-2 gap-3">
            <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
              <Boxes className="h-5 w-5 text-sky-400 mb-3" />
              <p className="font-semibold text-sm">Vận hành cổng & bãi</p>
              <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                Điều phối vị trí, tác nghiệp và công việc của ca.
              </p>
            </div>
            <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
              <FileCheck className="h-5 w-5 text-emerald-400 mb-3" />
              <p className="font-semibold text-sm">Kiểm soát ra cổng</p>
              <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                Đối soát hồ sơ, thanh toán và phiếu ra cổng.
              </p>
            </div>
          </div>
        </div>
        <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900/95 p-6 sm:p-8 shadow-2xl">
          <h2 className="text-xl font-bold">Đăng nhập hệ thống</h2>
          <p className="mt-2 mb-6 text-xs leading-relaxed text-slate-400">
            Dùng tài khoản được quản trị viên cấp để truy cập nghiệp vụ của bạn.
          </p>
          {errorMessage && (
            <div
              role="alert"
              className="mb-4 flex items-start gap-2 rounded-lg border border-rose-800 bg-rose-950/50 p-3 text-xs text-rose-300"
            >
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="login-email"
                className="mb-2 block text-xs font-semibold text-slate-300"
              >
                Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                <input
                  id="login-email"
                  type="email"
                  autoComplete="username"
                  required
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 py-3 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Email công việc"
                />
              </div>
            </div>
            <div>
              <label
                htmlFor="login-password"
                className="mb-2 block text-xs font-semibold text-slate-300"
              >
                Mật khẩu
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 py-3 pl-10 pr-12 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  type="button"
                  aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                  onClick={() => setShowPassword((show) => !show)}
                  className="absolute right-1 top-1/2 -translate-y-1/2 p-3 text-slate-400 hover:text-white"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-sky-600 p-3 text-sm font-bold hover:from-blue-500 hover:to-sky-500 disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <span className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                  Đang xác thực…
                </>
              ) : (
                <>
                  Đăng nhập
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </form>
          <p className="mt-5 text-xs leading-relaxed text-slate-500">
            Cần cấp tài khoản hoặc khôi phục mật khẩu? Liên hệ quản trị viên hệ thống.
          </p>
        </div>
      </main>
      <footer className="relative border-t border-slate-900 px-5 py-4 text-center text-xs text-slate-500">
        ICD Management System · Văn phòng & điều hành cảng cạn
      </footer>
    </div>
  );
};
