import React from 'react';
import { Home, Video, Flame, Users } from 'lucide-react';
import { SiteSettings } from '../types';

interface MobileBottomNavProps {
  currentPath: string;
  siteSettings?: SiteSettings;
  onNavigate: (path: string) => void;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({ currentPath, onNavigate }) => {
  const tabs = [
    { label: 'Home', path: '/', icon: Home },
    { label: 'Clips', path: '/clips', icon: Video },
    { label: 'Trending', path: '/trending', icon: Flame },
    { label: 'Admin', path: '/admin', icon: Users },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 md:hidden bg-white border-t border-slate-200 shadow-[0_-4px_20px_rgba(0,43,102,0.06)] pb-safe transition-colors">
      <div className="grid grid-cols-4 items-center h-16 max-w-md mx-auto">
        {tabs.map((tab) => {
          const isActive = currentPath === tab.path;
          const Icon = tab.icon;
          return (
            <button
              key={tab.path}
              onClick={() => onNavigate(tab.path)}
              className={`flex flex-col items-center justify-center h-full transition-all cursor-pointer select-none active:scale-95 ${
                isActive ? 'text-blue-700' : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              <div className="relative">
                <Icon className={`w-5 h-5 ${isActive ? 'stroke-[2.5px]' : 'stroke-2'}`} />
                {isActive && (
                  <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 bg-blue-600 rounded-full" />
                )}
              </div>
              <span className={`text-[10px] font-semibold mt-1 tracking-tight ${isActive ? 'text-blue-700' : 'text-slate-500'}`}>
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
