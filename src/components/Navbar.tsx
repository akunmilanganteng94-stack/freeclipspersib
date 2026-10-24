import React from 'react';
import { Smartphone } from 'lucide-react';
import { SiteSettings } from '../types';

interface NavbarProps {
  currentPath: string;
  siteSettings?: SiteSettings;
  onNavigate: (path: string) => void;
  onOpenSearch?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  siteSettings,
  onNavigate,
}) => {
  const logoUrl = 'https://i.postimg.cc/4ysQFgqx/1366b69ba442d21911f314947331b50a.jpg';

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-blue-100/80 shadow-xs">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 h-14 sm:h-16 flex items-center justify-between gap-3">
        {/* Brand identity: Logo + Teks ke pinggir (horizontal sebaris), tidak ke bawah */}
        <button
          onClick={() => onNavigate('/')}
          className="flex items-center gap-2.5 group text-left cursor-pointer transition-transform active:scale-95 min-w-0"
        >
          <div className="relative w-9 h-9 sm:w-10 sm:h-10 rounded-full overflow-hidden p-0.5 bg-gradient-to-tr from-blue-700 via-blue-600 to-sky-400 shadow-sm shrink-0">
            <img
              src={logoUrl}
              alt="Persib Bandung Logo"
              className="w-full h-full object-cover rounded-full bg-white"
              referrerPolicy="no-referrer"
            />
          </div>

          {/* Teks horizontal menyamping (ke pinggir, bukan ke bawah) */}
          <div className="flex items-center gap-1.5 sm:gap-2 flex-nowrap min-w-0">
            <span className="font-black text-base sm:text-lg tracking-tight bg-gradient-to-r from-blue-900 via-blue-700 to-blue-600 bg-clip-text text-transparent whitespace-nowrap">
              FREE CLIPS PERSIB
            </span>
            <span className="text-[10px] font-black px-1.5 py-0.5 rounded bg-blue-100 text-blue-800 uppercase tracking-wider shrink-0">
              1933
            </span>
            <span className="text-xs font-semibold text-slate-400 hidden sm:inline whitespace-nowrap">
              • Free Persib Clips
            </span>
          </div>
        </button>

        {/* Right side: hanya tombol Versi APK jika aktif (pencarian & ikon kunci dihapus agar hemat tempat) */}
        <div className="flex items-center gap-2 shrink-0">
          {siteSettings?.apkDownloadUrl && siteSettings.apkEnabled !== false && (
            <a
              href={siteSettings.apkDownloadUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-xs transition-transform active:scale-95 cursor-pointer"
              title={`Download Versi APK Android (${siteSettings.apkVersionName || 'Official'})`}
            >
              <Smartphone className="w-3.5 h-3.5 text-white" />
              <span className="hidden sm:inline">Versi APK</span>
              <span className="sm:hidden">APK</span>
            </a>
          )}
        </div>
      </div>
    </header>
  );
};
