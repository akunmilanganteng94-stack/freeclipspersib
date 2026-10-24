import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Navbar } from './components/Navbar';
import { MobileBottomNav } from './components/MobileBottomNav';
import { Footer } from './components/Footer';
import { ToastContainer } from './components/Toast';
import { HomePage } from './pages/HomePage';
import { AllClipsPage } from './pages/AllClipsPage';
import { TrendingPage } from './pages/TrendingPage';
import { AllAdminPage } from './pages/AllAdminPage';
import { AdminProfilePage } from './pages/AdminProfilePage';
import { ClipDetailPage } from './pages/ClipDetailPage';
import { LoginPage } from './pages/LoginPage';
import { AdminDashboard } from './pages/AdminDashboard';
import { OwnerDashboard } from './pages/OwnerDashboard';
import { NotFoundPage } from './pages/NotFoundPage';
import {
  subscribeToClips,
  subscribeToUsers,
  subscribeToSettings,
  getLocalClips,
  getLocalUsers,
  getLocalSettings,
} from './services/clipsService';
import { ClipItem, UserProfile, SiteSettings, ToastMessage } from './types';
import { AlertCircle, Wrench } from 'lucide-react';

function AppContent() {
  const { role, isOwner, isAdmin, loading: authLoading } = useAuth();

  const [currentPath, setCurrentPath] = useState(window.location.pathname || '/');
  const [clips, setClips] = useState<ClipItem[]>(getLocalClips());
  const [admins, setAdmins] = useState<UserProfile[]>(getLocalUsers());
  const [siteSettings, setSiteSettings] = useState<SiteSettings>(getLocalSettings());
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  // Enforce no-zoom on touch devices (only swipe, scroll, tap, and press allowed)
  useEffect(() => {
    document.documentElement.classList.remove('dark');
    localStorage.removeItem('azryl_theme');

    const preventZoom = (e: TouchEvent) => {
      if (e.touches && e.touches.length > 1) {
        e.preventDefault();
      }
    };
    document.addEventListener('touchmove', preventZoom, { passive: false });
    return () => {
      document.removeEventListener('touchmove', preventZoom);
    };
  }, []);

  // Browser navigation sync
  useEffect(() => {
    const handlePopState = () => {
      setCurrentPath(window.location.pathname);
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const navigate = (path: string) => {
    window.history.pushState({}, '', path);
    setCurrentPath(path);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Real-time Firestore subscriptions
  useEffect(() => {
    const unsubClips = subscribeToClips((updatedClips) => {
      setClips(updatedClips);
    });
    const unsubUsers = subscribeToUsers((updatedUsers) => {
      setAdmins(updatedUsers);
    });
    const unsubSettings = subscribeToSettings((updatedSettings) => {
      setSiteSettings(updatedSettings);
    });

    return () => {
      unsubClips();
      unsubUsers();
      unsubSettings();
    };
  }, []);

  // Toast helpers
  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    const id = `${Date.now()}_${Math.random()}`;
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      removeToast(id);
    }, 4000);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // Route parser
  const renderRoute = () => {
    // 1. Maintenance mode check (except for control panel or logged in owner)
    if (siteSettings.maintenanceMode && !isOwner && !currentPath.startsWith('/azryl-control')) {
      return (
        <div className="min-h-[60vh] flex items-center justify-center p-4">
          <div className="neu-card p-8 sm:p-12 text-center max-w-md w-full bg-white space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center mx-auto">
              <Wrench className="w-7 h-7" />
            </div>
            <h2 className="text-xl font-black text-slate-900">Sedang Dalam Pemeliharaan</h2>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              Website AZRYL CLIPS sedang dalam optimalisasi server untuk meningkatkan kecepatan download
              Bobotoh. Kami akan segera kembali!
            </p>
          </div>
        </div>
      );
    }

    // 2. Control routes
    if (currentPath === '/azryl-control') {
      return <LoginPage onNavigate={navigate} onShowToast={showToast} />;
    }

    if (currentPath === '/azryl-control/admin') {
      if (!authLoading && !isAdmin) {
        return (
          <div className="min-h-[50vh] flex items-center justify-center">
            <div className="neu-card p-8 text-center max-w-md bg-white space-y-3">
              <AlertCircle className="w-10 h-10 text-rose-600 mx-auto" />
              <h3 className="font-bold text-slate-900">Akses Ditolak</h3>
              <p className="text-xs text-slate-500">Anda harus login sebagai Admin untuk mengakses halaman ini.</p>
              <button
                onClick={() => navigate('/azryl-control')}
                className="neu-button text-white px-4 py-2 rounded-xl text-xs font-bold"
              >
                Login Sekarang
              </button>
            </div>
          </div>
        );
      }
      return <AdminDashboard clips={clips} onNavigate={navigate} onShowToast={showToast} />;
    }

    if (currentPath === '/azryl-control/owner') {
      if (!authLoading && !isOwner) {
        return (
          <div className="min-h-[50vh] flex items-center justify-center">
            <div className="neu-card p-8 text-center max-w-md bg-white space-y-3">
              <AlertCircle className="w-10 h-10 text-rose-600 mx-auto" />
              <h3 className="font-bold text-slate-900">Akses Khusus Owner</h3>
              <p className="text-xs text-slate-500">Halaman ini hanya dapat diakses oleh akun Founder/Owner.</p>
              <button
                onClick={() => navigate('/azryl-control')}
                className="neu-button text-white px-4 py-2 rounded-xl text-xs font-bold"
              >
                Login sebagai Owner
              </button>
            </div>
          </div>
        );
      }
      return (
        <OwnerDashboard
          clips={clips}
          admins={admins}
          siteSettings={siteSettings}
          onNavigate={navigate}
          onShowToast={showToast}
        />
      );
    }

    // 3. Public Routes
    if (currentPath === '/' || currentPath === '') {
      return (
        <HomePage
          clips={clips}
          admins={admins}
          siteSettings={siteSettings}
          onNavigate={navigate}
          onShowToast={showToast}
        />
      );
    }

    if (currentPath === '/clips') {
      return (
        <AllClipsPage
          clips={clips}
          onNavigate={navigate}
          onShowToast={showToast}
        />
      );
    }

    if (currentPath === '/trending') {
      return (
        <TrendingPage
          clips={clips}
          onNavigate={navigate}
          onShowToast={showToast}
        />
      );
    }

    if (currentPath === '/admin') {
      return (
        <AllAdminPage
          admins={admins}
          clips={clips}
          onNavigate={navigate}
        />
      );
    }

    // Sub-route: /clips/:slug
    if (currentPath.startsWith('/clips/')) {
      const slug = currentPath.replace('/clips/', '');
      return (
        <ClipDetailPage
          slug={slug}
          clips={clips}
          admins={admins}
          onNavigate={navigate}
          onShowToast={showToast}
        />
      );
    }

    // Sub-route: /admin/:adminId
    if (currentPath.startsWith('/admin/')) {
      const adminId = currentPath.replace('/admin/', '');
      return (
        <AdminProfilePage
          adminId={adminId}
          admins={admins}
          clips={clips}
          onNavigate={navigate}
          onShowToast={showToast}
        />
      );
    }

    // 404 Fallback
    return <NotFoundPage onNavigate={navigate} />;
  };

  const isControlPage = currentPath.startsWith('/azryl-control');

  return (
    <div className="flex flex-col min-h-screen bg-[#f1f5fa] text-slate-800">
      {/* Optional Announcement Banner */}
      {siteSettings.announcement && !isControlPage && (
        <aside aria-label="Pengumuman" className="bg-gradient-to-r from-blue-700 via-blue-800 to-indigo-900 text-white text-xs py-2 px-4 text-center font-semibold shadow-xs">
          <span>{siteSettings.announcement}</span>
        </aside>
      )}

      {/* Main Navbar */}
      <Navbar
        currentPath={currentPath}
        siteSettings={siteSettings}
        onNavigate={navigate}
        onOpenSearch={() => {
          if (currentPath !== '/clips') {
            navigate('/clips');
          }
        }}
      />

      {/* Main Page Body */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {renderRoute()}
      </main>

      {/* Footer (Pure White Bottom Area) */}
      {!isControlPage && (
        <div className="w-full bg-white mt-auto">
          <Footer onNavigate={navigate} />
        </div>
      )}

      {/* Mobile Bottom Tab Navigation */}
      {!isControlPage && (
        <MobileBottomNav currentPath={currentPath} siteSettings={siteSettings} onNavigate={navigate} />
      )}

      {/* Toast Notification Container */}
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
