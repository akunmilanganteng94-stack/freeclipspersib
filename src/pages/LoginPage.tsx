import React, { useState } from 'react';
import { Lock, Mail, ShieldAlert, ArrowRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface LoginPageProps {
  onNavigate: (path: string) => void;
  onShowToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onNavigate, onShowToast }) => {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const logoUrl = 'https://i.postimg.cc/4ysQFgqx/1366b69ba442d21911f314947331b50a.jpg';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setErrorMsg('Harap masukkan email dan password.');
      return;
    }

    setLoading(true);
    setErrorMsg('');

    const res = await login(email, password);
    setLoading(false);

    if (res.success) {
      onShowToast('Login berhasil! Wilujeng sumping.', 'success');
      // Redirect based on role
      const isOwnerLogin = email.toLowerCase().includes('apriliansyah') || email.toLowerCase().includes('owner');
      if (isOwnerLogin) {
        onNavigate('/azryl-control/owner');
      } else {
        onNavigate('/azryl-control/admin');
      }
    } else {
      setErrorMsg(res.error || 'Autentikasi gagal.');
    }
  };

  return (
    <div className="min-h-[75vh] flex items-center justify-center p-4">
      <div className="neu-card max-w-md w-full p-6 sm:p-8 bg-white/95 relative space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="w-16 h-16 rounded-full overflow-hidden p-1 bg-gradient-to-tr from-blue-700 via-blue-600 to-sky-400 mx-auto shadow-md">
            <img
              src={logoUrl}
              alt="AZRYL CLIPS Logo"
              className="w-full h-full object-cover rounded-full bg-white"
              referrerPolicy="no-referrer"
            />
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
            FREE CLIPS PERSIB PANEL
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
            Portal autentikasi khusus Admin & Owner FREE CLIPS PERSIB
          </p>
        </div>

        {/* Error notification */}
        {errorMsg && (
          <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 shrink-0 text-rose-600" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
              Email Pengelola
            </label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="email"
                placeholder="nama@azrylclips.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full neu-input pl-10 pr-4 py-2.5 text-xs sm:text-sm text-slate-800"
                required
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
              Kata Sandi
            </label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full neu-input pl-10 pr-4 py-2.5 text-xs sm:text-sm text-slate-800"
                required
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full neu-button text-white py-3 rounded-xl text-xs sm:text-sm font-black flex items-center justify-center gap-2 cursor-pointer shadow-md disabled:opacity-60"
          >
            <span>{loading ? 'Memverifikasi...' : 'Masuk ke Dashboard'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        <div className="pt-2 border-t border-slate-100 text-center">
          <p className="text-[11px] text-slate-400">
            Akun Admin &amp; Owner terverifikasi oleh sistem FREE CLIPS PERSIB.
          </p>
        </div>

        <p className="text-[11px] text-center text-slate-400">
          Akun Admin hanya dibuat oleh Owner melalui sistem administrasi terverifikasi.
        </p>
      </div>
    </div>
  );
};
