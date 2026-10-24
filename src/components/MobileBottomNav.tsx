import React from 'react';
import { Home, Search, TrendingUp, Shield } from 'lucide-react';
import { SiteSettings } from '../types';

interface FloatingBottomNavProps {
  currentPath: string;
  siteSettings?: SiteSettings;
  onNavigate: (path: string) => void;
}

export const MobileBottomNav: React.FC<FloatingBottomNavProps> = ({ currentPath, onNavigate }) => {
  // 4 Menu dengan urutan wajib dari kiri ke kanan:
  // 1. Home (ikon rumah -> '/')
  // 2. Pencarian (ikon kaca pembesar -> '/clips')
  // 3. Trending (ikon trending/grafik naik -> '/trending')
  // 4. All Admin (ikon shield/informasi -> '/admin')
  const tabs = [
    {
      id: 'home',
      label: 'Home',
      path: '/',
      icon: Home,
      isActive: currentPath === '/' || currentPath === '',
    },
    {
      id: 'search',
      label: 'Pencarian',
      path: '/clips',
      icon: Search,
      isActive: currentPath.startsWith('/clips'),
    },
    {
      id: 'trending',
      label: 'Trending',
      path: '/trending',
      icon: TrendingUp,
      isActive: currentPath === '/trending',
    },
    {
      id: 'admin',
      label: 'All Admin',
      path: '/admin',
      icon: Shield,
      isActive: currentPath.startsWith('/admin'),
    },
  ];

  return (
    <nav
      aria-label="Floating Bottom Navigation"
      className="fixed bottom-3 sm:bottom-5 left-1/2 -translate-x-1/2 z-50 w-[92%] max-w-sm sm:max-w-md select-none transition-all duration-300"
    >
      {/* Kapsul horizontal berdesain Modern Neumorphism Soft UI, Light Theme, warna putih bersih melayang */}
      <div className="bg-white/95 backdrop-blur-md rounded-full shadow-[0_12px_36px_-6px_rgba(0,40,110,0.18),0_4px_16px_rgba(0,0,0,0.05)] border border-slate-100/90 px-3 py-1.5 flex items-center justify-around">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = tab.isActive;

          return (
            <button
              key={tab.id}
              onClick={() => onNavigate(tab.path)}
              className="flex-1 flex flex-col items-center justify-center cursor-pointer group py-0.5 transition-all duration-200 active:scale-95 relative"
            >
              {isActive ? (
                // Menu aktif: Ikon menonjol di dalam lingkaran biru gradient dengan efek glossy & sedikit lebih besar
                <div className="flex flex-col items-center">
                  <div className="relative w-11 h-11 sm:w-12 sm:h-12 -mt-4 rounded-full bg-gradient-to-tr from-blue-700 via-blue-600 to-sky-400 text-white shadow-[0_8px_20px_rgba(0,75,172,0.42)] flex items-center justify-center transition-all duration-300 transform scale-105 border-2 border-white ring-2 ring-blue-500/20 overflow-hidden">
                    {/* Glossy top reflection highlight */}
                    <div className="absolute top-0 inset-x-0 h-1/2 bg-gradient-to-b from-white/40 to-transparent pointer-events-none rounded-t-full" />
                    <Icon className="w-5 h-5 sm:w-5.5 sm:h-5.5 text-white stroke-[2.3px] relative z-10" />
                  </div>
                  <span className="text-[10px] sm:text-[11px] font-extrabold text-blue-700 tracking-tight mt-0.5 transition-colors">
                    {tab.label}
                  </span>
                </div>
              ) : (
                // Menu tidak aktif: Ikon abu-abu dengan tampilan minimalis
                <div className="flex flex-col items-center py-1">
                  <div className="w-8 h-8 flex items-center justify-center text-slate-400 group-hover:text-slate-600 transition-colors">
                    <Icon className="w-5 h-5 stroke-[1.8px] text-slate-400 group-hover:text-slate-600 transition-colors" />
                  </div>
                  <span className="text-[10px] font-semibold text-slate-400 group-hover:text-slate-600 tracking-tight transition-colors">
                    {tab.label}
                  </span>
                </div>
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
};
