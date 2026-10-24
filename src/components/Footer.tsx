import React from 'react';
import { Heart, ShieldCheck, Download, Sparkles, Lock } from 'lucide-react';

interface FooterProps {
  onNavigate: (path: string) => void;
}

export const Footer: React.FC<FooterProps> = ({ onNavigate }) => {
  const logoUrl = 'https://i.postimg.cc/4ysQFgqx/1366b69ba442d21911f314947331b50a.jpg';

  return (
    <footer className="mt-16 pb-28 sm:pb-32 border-t border-slate-200/80 bg-white transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          {/* Col 1: Identity & Motto */}
          <div className="md:col-span-2 space-y-3">
            <div className="flex items-center gap-3">
              <img
                src={logoUrl}
                alt="Persib Logo"
                className="w-9 h-9 rounded-full object-cover shadow-xs"
                referrerPolicy="no-referrer"
              />
              <div>
                <span className="font-extrabold text-lg tracking-tight text-blue-900">
                  FREE CLIPS PERSIB
                </span>
                <span className="text-xs text-blue-600 block font-semibold">
                  Free Persib Clips
                </span>
              </div>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 max-w-md leading-relaxed">
              Platform download clips video dan foto Persib Bandung gratis tanpa login. Dibuat khusus
              untuk para Bobotoh, Viking, Bomber, dan seluruh pendukung Maung Bandung untuk kebutuhan
              konten, status medsos, dan arsip momen bersejarah.
            </p>
            <div className="flex items-center gap-2 text-xs font-semibold text-blue-800 pt-1">
              <span className="w-2 h-2 rounded-full bg-blue-600" />
              <span>Bagimu Persib Jiwa Raga Kami 💙</span>
            </div>
          </div>

          {/* Col 2: Quick Links */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              Navigasi Cepat
            </h4>
            <ul className="space-y-2 text-xs sm:text-sm text-slate-600">
              <li>
                <button
                  onClick={() => onNavigate('/')}
                  className="hover:text-blue-700 transition-colors cursor-pointer"
                >
                  Beranda
                </button>
              </li>
              <li>
                <button
                  onClick={() => onNavigate('/clips')}
                  className="hover:text-blue-700 transition-colors cursor-pointer"
                >
                  Semua Clips
                </button>
              </li>
              <li>
                <button
                  onClick={() => onNavigate('/trending')}
                  className="hover:text-blue-700 transition-colors cursor-pointer"
                >
                  Clips Trending
                </button>
              </li>
              <li>
                <button
                  onClick={() => onNavigate('/admin')}
                  className="hover:text-blue-700 transition-colors cursor-pointer"
                >
                  Daftar Admin
                </button>
              </li>
              <li>
                <button
                  onClick={() => onNavigate('/azryl-control')}
                  className="hover:text-blue-700 transition-colors cursor-pointer flex items-center gap-1.5 text-slate-500 font-semibold pt-1"
                >
                  <Lock className="w-3.5 h-3.5 text-blue-600" />
                  <span>Login Admin & Owner</span>
                </button>
              </li>
            </ul>
          </div>

          {/* Col 3: Quality & Commitment */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              Keunggulan
            </h4>
            <div className="space-y-2 text-xs text-slate-500">
              <div className="flex items-center gap-2">
                <Download className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                <span>100% Gratis Tanpa Akun</span>
              </div>
              <div className="flex items-center gap-2">
                <Sparkles className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                <span>3 Media per Item Clips</span>
              </div>
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                <span>Direct ZIP & Fast Download</span>
              </div>
            </div>
          </div>
        </div>

        {/* Divider */}
        <div className="pt-6 border-t border-slate-200/80 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-400">
          <p className="font-medium text-slate-500">
            FREE CLIPS PERSIB — Free Persib Clips
          </p>
          {/* Permanent Elegant Watermark with quick portal shortcut */}
          <button
            onClick={() => onNavigate('/azryl-control')}
            className="flex items-center gap-1.5 text-slate-400 font-medium hover:text-blue-700 transition-colors cursor-pointer group"
            title="Portal Login Admin & Owner"
          >
            <span>Powered by</span>
            <span className="font-extrabold text-blue-700 tracking-wider group-hover:underline">AZRYL</span>
          </button>
        </div>
      </div>
    </footer>
  );
};
