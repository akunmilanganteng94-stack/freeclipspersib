import React from 'react';
import { Search, Flame, Video, Users, Home, Shield, LogOut, Smartphone, Lock } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { SiteSettings } from '../types';

interface NavbarProps {
  currentPath: string;
  siteSettings?: SiteSettings;
  onNavigate: (path: string) => void;
  onOpenSearch?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentPath,
  siteSettings,
  onNavigate,
  onOpenSearch,
}) => {
  const { role, isOwner, isAdmin, logout } = useAuth();
  const logoUrl = 'https://i.postimg.cc/4ysQFgqx/1366b69ba442d21911f314947331b50a.jpg';

  const navItems = [
    { label: 'Home', path: '/', icon: Home },
    { label: 'All Clips', path: '/clips', icon: Video },
    { label: 'Trending', path: '/trending', icon: Flame },
    { label: 'All Admin', path: '/admin', icon: Users },
  ];

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-blue-100/80 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        {/* Brand identity: Persib logo + FREE CLIPS PERSIB */}
        <button
          onClick={() => onNavigate('/')}
          className="flex items-center gap-3 group text-left cursor-pointer transition-transform active:scale-95"
        >
          <div className="relative w-10 h-10 rounded-full overflow-hidden p-0.5 bg-gradient-to-tr from-blue-700 via-blue-600 to-sky-400 shadow-sm shrink-0">
            <img
              src={logoUrl}
              alt="Persib Bandung Logo"
              className="w-full h-full object-cover rounded-full bg-white"
              referrerPolicy="no-referrer"
            />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-extrabold text-lg sm:text-xl tracking-tight bg-gradient-to-r from-blue-900 via-blue-700 to-blue-600 bg-clip-text text-transparent">
                FREE CLIPS PERSIB
              </span>
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-100 text-blue-800 uppercase tracking-wider">
                1933
              </span>
            </div>
            <p className="text-[11px] font-medium text-slate-500 hidden sm:block">
              Free Persib Bandung Clips
            </p>
          </div>
        </button>

        {/* Desktop Navigation Links */}
        <nav className="hidden md:flex items-center gap-1 lg:gap-2">
          {navItems.map((item) => {
            const isActive = currentPath === item.path;
            const Icon = item.icon;
            return (
              <button
                key={item.path}
                onClick={() => onNavigate(item.path)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-semibold transition-all cursor-pointer ${
                  isActive
                    ? 'text-blue-700 bg-blue-50/80 shadow-xs'
                    : 'text-slate-600 hover:text-blue-700 hover:bg-slate-50'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-blue-600' : 'text-slate-400'}`} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Right action area: Quick Search, APK Download, and logged-in admin indicator */}
        <div className="flex items-center gap-2">
          {siteSettings?.apkDownloadUrl && siteSettings.apkEnabled !== false && (
            <a
              href={siteSettings.apkDownloadUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-extrabold bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-xs transition-transform active:scale-95 cursor-pointer"
              title={`Download Versi APK Android (${siteSettings.apkVersionName || 'Official'})`}
            >
              <Smartphone className="w-3.5 h-3.5 text-white" />
              <span className="hidden sm:inline">Versi APK</span>
              <span className="sm:hidden">APK</span>
            </a>
          )}

          {onOpenSearch && (
            <button
              onClick={onOpenSearch}
              className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs sm:text-sm font-medium text-slate-500 bg-slate-100 hover:bg-blue-50 hover:text-blue-700 transition-colors cursor-pointer"
              title="Cari Clips Persib"
            >
              <Search className="w-4 h-4 text-slate-400" />
              <span className="hidden sm:inline">Cari clips...</span>
            </button>
          )}

          {/* Discreet indicator if already logged in, or quick login access button */}
          {isAdmin ? (
            <div className="flex items-center gap-1.5 pl-2 border-l border-slate-200">
              <button
                onClick={() => onNavigate(isOwner ? '/azryl-control/owner' : '/azryl-control/admin')}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-blue-600 text-white hover:bg-blue-700 transition-colors cursor-pointer shadow-xs"
              >
                <Shield className="w-3.5 h-3.5" />
                <span>{isOwner ? 'Owner Panel' : 'Admin Panel'}</span>
              </button>
              <button
                onClick={logout}
                className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                title="Logout"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => onNavigate('/azryl-control')}
              className="p-2 rounded-xl text-slate-400 hover:text-blue-700 hover:bg-blue-50 transition-colors cursor-pointer"
              title="Login Admin & Owner"
              aria-label="Login Admin & Owner"
            >
              <Lock className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
