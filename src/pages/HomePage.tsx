import React, { useState, useMemo } from 'react';
import { Search, Flame, Video, X, Sparkles, Download, Users, ArrowRight, Smartphone } from 'lucide-react';
import { ClipItem, UserProfile, SiteSettings } from '../types';
import { ClipCard } from '../components/ClipCard';

interface HomePageProps {
  clips: ClipItem[];
  admins: UserProfile[];
  siteSettings?: SiteSettings;
  onNavigate: (path: string) => void;
  onShowToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export const HomePage: React.FC<HomePageProps> = ({ clips, admins, siteSettings, onNavigate, onShowToast }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [mediaFilter, setMediaFilter] = useState<'all' | 'video' | 'photo'>('all');

  // Real-time search & filter
  const filteredClips = useMemo(() => {
    return clips.filter((clip) => {
      if (!clip.published) return false;
      const matchesSearch =
        !searchQuery.trim() ||
        clip.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        clip.creatorName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        clip.uploaderNameSnapshot.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (clip.description && clip.description.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesMedia = mediaFilter === 'all' || clip.primaryMediaType === mediaFilter;
      return matchesSearch && matchesMedia;
    });
  }, [clips, searchQuery, mediaFilter]);

  // Trending clips (top 4 by downloadCount)
  const trendingClips = useMemo(() => {
    return [...clips]
      .filter((c) => c.published)
      .sort((a, b) => (b.downloadCount || 0) - (a.downloadCount || 0))
      .slice(0, 4);
  }, [clips]);

  // Total downloads across all clips
  const totalDownloads = useMemo(() => {
    return clips.reduce((acc, curr) => acc + (curr.downloadCount || 0), 0);
  }, [clips]);

  return (
    <div className="space-y-12">
      {/* A. Hero Section */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-blue-900 via-blue-800 to-indigo-950 text-white shadow-xl p-6 sm:p-10 lg:p-14 border border-blue-700/40">
        {/* Subtle stadium backdrop image */}
        <div className="absolute inset-0 opacity-20 pointer-events-none mix-blend-overlay">
          <img
            src="/src/assets/images/hero_persib_stadium_1792849004095.jpg"
            alt="Persib Stadium Background"
            className="w-full h-full object-cover"
          />
        </div>
        <div className="absolute -right-20 -top-20 w-80 h-80 bg-blue-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -left-20 -bottom-20 w-80 h-80 bg-sky-400/15 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 max-w-3xl space-y-5">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-blue-200 text-xs font-bold tracking-wide uppercase">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>Platform Resmi Bebas Unduh Bobotoh</span>
          </div>

          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black tracking-tight leading-[1.1] text-white">
            FREE PERSIB <span className="text-sky-300">CLIPS</span>
          </h1>

          <p className="text-sm sm:text-base lg:text-lg text-blue-100 max-w-2xl leading-relaxed font-normal">
            Kumpulan clips Persib Bandung gratis untuk semua Bobotoh. Cari, tonton, download 3 media
            sekaligus, dan bagikan momen magis Pangeran Biru!
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-wrap items-center gap-3 pt-2">
            <button
              onClick={() => onNavigate('/clips')}
              className="px-6 py-3 rounded-2xl bg-white text-blue-900 font-extrabold text-sm hover:bg-blue-50 transition-all shadow-lg active:scale-95 cursor-pointer flex items-center gap-2"
            >
              <Video className="w-4 h-4 text-blue-700" />
              <span>Jelajahi Clips</span>
            </button>
            <button
              onClick={() => onNavigate('/trending')}
              className="px-6 py-3 rounded-2xl bg-blue-600/60 text-white font-extrabold text-sm hover:bg-blue-600 transition-all border border-blue-400/40 backdrop-blur-md active:scale-95 cursor-pointer flex items-center gap-2"
            >
              <Flame className="w-4 h-4 text-amber-400 fill-current" />
              <span>Clips Trending</span>
            </button>

            {siteSettings?.apkDownloadUrl && siteSettings.apkEnabled !== false && (
              <a
                href={siteSettings.apkDownloadUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="px-6 py-3 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-500 text-white font-extrabold text-sm hover:from-emerald-500 hover:to-teal-400 transition-all shadow-lg active:scale-95 cursor-pointer flex items-center gap-2 border border-emerald-400/30"
                title={`Download Versi APK Android (${siteSettings.apkVersionName || 'Official'})`}
              >
                <Smartphone className="w-4 h-4 text-emerald-100" />
                <span>Download Versi APK ({siteSettings.apkVersionName || 'Official'})</span>
              </a>
            )}
          </div>

          {/* Quick Bobotoh KPI Bar */}
          <div className="grid grid-cols-3 gap-4 pt-6 mt-6 border-t border-white/15 max-w-lg">
            <div>
              <p className="text-2xl sm:text-3xl font-black text-white tabular-nums">
                {totalDownloads.toLocaleString()}
              </p>
              <p className="text-[11px] text-blue-200 font-medium">Total Download</p>
            </div>
            <div>
              <p className="text-2xl sm:text-3xl font-black text-white tabular-nums">
                {clips.length}
              </p>
              <p className="text-[11px] text-blue-200 font-medium">Total Clips HD</p>
            </div>
            <div>
              <p className="text-2xl sm:text-3xl font-black text-white">
                100%
              </p>
              <p className="text-[11px] text-blue-200 font-medium">Gratis Tanpa Login</p>
            </div>
          </div>
        </div>
      </section>

      {/* B. Search & Filter Bar (Real-Time) */}
      <section className="space-y-4">
        <div className="neu-card p-3 sm:p-4 bg-white/90">
          <div className="flex flex-col sm:flex-row items-center gap-3">
            {/* Search Input */}
            <div className="relative w-full flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Cari clips berdasarkan judul, nama pembuat, atau admin..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-10 py-2.5 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-blue-600 focus:bg-white transition-colors"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 cursor-pointer"
                  title="Hapus pencarian"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Media Filter Tabs */}
            <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl w-full sm:w-auto shrink-0 justify-center">
              <button
                onClick={() => setMediaFilter('all')}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
                  mediaFilter === 'all'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-blue-700'
                }`}
              >
                Semua
              </button>
              <button
                onClick={() => setMediaFilter('video')}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
                  mediaFilter === 'video'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-blue-700'
                }`}
              >
                Video
              </button>
              <button
                onClick={() => setMediaFilter('photo')}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
                  mediaFilter === 'photo'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-blue-700'
                }`}
              >
                Foto
              </button>
            </div>
          </div>
        </div>

        {/* Search Results Feedback */}
        {searchQuery && (
          <div className="flex items-center justify-between text-xs text-slate-600 px-2">
            <span>
              Menampilkan {filteredClips.length} hasil untuk "{searchQuery}"
            </span>
            <button
              onClick={() => setSearchQuery('')}
              className="text-blue-600 font-bold hover:underline"
            >
              Reset Pencarian
            </button>
          </div>
        )}
      </section>

      {/* C. Ter Trending Section */}
      {!searchQuery && (
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-amber-500/10 text-amber-600">
                <Flame className="w-5 h-5 fill-current" />
              </div>
              <div>
                <h2 className="text-lg sm:text-xl font-extrabold text-slate-900">
                  Clips Paling Trending
                </h2>
                <p className="text-xs text-slate-500">
                  Diurutkan berdasarkan jumlah download tertinggi Bobotoh
                </p>
              </div>
            </div>
            <button
              onClick={() => onNavigate('/trending')}
              className="text-xs sm:text-sm font-bold text-blue-700 hover:text-blue-800 flex items-center gap-1 cursor-pointer"
            >
              <span>Lihat Semua Trending</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-5">
            {trendingClips.map((clip, index) => (
              <ClipCard
                key={clip.clipId}
                clip={clip}
                rank={index + 1}
                onNavigate={onNavigate}
                onShowToast={onShowToast}
              />
            ))}
          </div>
        </section>
      )}

      {/* D. All Clips — Terbaru Section */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg sm:text-xl font-extrabold text-slate-900">
              {searchQuery ? 'Hasil Pencarian Clips' : 'Clips Terbaru'}
            </h2>
            <p className="text-xs text-slate-500">
              Setiap item berisi tepat 3 media (Video/Foto Utama + 2 Foto Pendukung)
            </p>
          </div>
          {!searchQuery && (
            <button
              onClick={() => onNavigate('/clips')}
              className="text-xs sm:text-sm font-bold text-blue-700 hover:text-blue-800 flex items-center gap-1 cursor-pointer"
            >
              <span>Semua Koleksi</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {filteredClips.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-5">
            {filteredClips.map((clip) => (
              <ClipCard
                key={clip.clipId}
                clip={clip}
                onNavigate={onNavigate}
                onShowToast={onShowToast}
              />
            ))}
          </div>
        ) : clips.length === 0 ? (
          <div className="neu-card p-10 sm:p-14 text-center space-y-4 bg-white border border-blue-100">
            <div className="w-14 h-14 rounded-3xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto shadow-xs">
              <Video className="w-7 h-7" />
            </div>
            <div className="space-y-1">
              <h3 className="font-extrabold text-slate-900 text-base sm:text-lg">
                Koleksi Clips Masih Kosong (0 Clips)
              </h3>
              <p className="text-xs sm:text-sm text-slate-500 max-w-md mx-auto leading-relaxed">
                Platform baru saja disiapkan! Admin dan Owner akan segera mengunggah clips video dan foto aksi terbaik Persib Bandung.
              </p>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
              <button
                onClick={() => onNavigate('/azryl-control')}
                className="neu-button text-white text-xs font-bold px-5 py-2.5 rounded-xl shadow-xs cursor-pointer"
              >
                Login Admin / Owner untuk Unggah
              </button>
              {siteSettings?.apkDownloadUrl && siteSettings.apkEnabled !== false && (
                <a
                  href={siteSettings.apkDownloadUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="neu-button-secondary text-xs font-bold px-4 py-2.5 rounded-xl inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <Smartphone className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Download APK Android</span>
                </a>
              )}
            </div>
          </div>
        ) : (
          <div className="neu-card p-10 text-center space-y-3 bg-white">
            <div className="w-12 h-12 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center mx-auto">
              <Search className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-slate-800 text-base">Tidak ada clips ditemukan</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Tidak ada clips yang cocok dengan kata kunci "{searchQuery}". Coba kata kunci lain
              seperti nama pemain atau "Persib".
            </p>
            <button
              onClick={() => {
                setSearchQuery('');
                setMediaFilter('all');
              }}
              className="neu-button text-white text-xs font-bold px-4 py-2 rounded-xl"
            >
              Reset Filter
            </button>
          </div>
        )}
      </section>

      {/* E. All Admin Section Showcase */}
      <section className="neu-card p-6 sm:p-8 bg-gradient-to-r from-blue-50/60 to-sky-50/60 border border-blue-100">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-xs">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-extrabold text-blue-950 dark:text-sky-300">
                Kreator & Admin FREE CLIPS PERSIB
              </h2>
              <p className="text-xs text-slate-500">
                Kenali dan ikuti media sosial para Bobotoh yang berkontribusi mengunggah clips
              </p>
            </div>
          </div>
          <button
            onClick={() => onNavigate('/admin')}
            className="neu-button-secondary text-xs sm:text-sm font-bold px-4 py-2 rounded-xl cursor-pointer"
          >
            Lihat Semua Admin
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {admins.slice(0, 3).map((adm) => {
            const adminClipsCount = clips.filter((c) => c.uploaderUid === adm.uid).length;
            return (
              <div
                key={adm.uid}
                onClick={() => onNavigate(`/admin/${adm.uid}`)}
                className="p-4 rounded-2xl bg-white shadow-xs border border-blue-100/80 hover:shadow-md transition-all cursor-pointer flex items-center gap-3.5"
              >
                <img
                  src={adm.profileImage || 'https://i.postimg.cc/4ysQFgqx/1366b69ba442d21911f314947331b50a.jpg'}
                  alt={adm.adminName}
                  className="w-12 h-12 rounded-full object-cover border-2 border-blue-500/30"
                  referrerPolicy="no-referrer"
                />
                <div className="min-w-0 flex-1">
                  <h4 className="font-bold text-sm text-slate-800 truncate">
                    {adm.adminName}
                  </h4>
                  <p className="text-[11px] text-blue-600 font-semibold uppercase tracking-wider">
                    {adm.role === 'owner' ? 'Owner / Founder' : 'Admin Uploader'}
                  </p>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    {adminClipsCount} clips diunggah
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
};
