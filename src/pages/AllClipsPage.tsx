import React, { useState, useMemo } from 'react';
import { Search, Filter, Video, Image as ImageIcon, ArrowUpDown, X } from 'lucide-react';
import { ClipItem } from '../types';
import { ClipCard } from '../components/ClipCard';

interface AllClipsPageProps {
  clips: ClipItem[];
  onNavigate: (path: string) => void;
  onShowToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export const AllClipsPage: React.FC<AllClipsPageProps> = ({ clips, onNavigate, onShowToast }) => {
  const [search, setSearch] = useState('');
  const [mediaType, setMediaType] = useState<'all' | 'video' | 'photo'>('all');
  const [sortBy, setSortBy] = useState<'newest' | 'downloads' | 'likes' | 'title'>('newest');
  const [page, setPage] = useState(1);
  const itemsPerPage = 12;

  const filteredAndSortedClips = useMemo(() => {
    let result = clips.filter((c) => {
      if (!c.published) return false;
      const matchesSearch =
        !search.trim() ||
        c.title.toLowerCase().includes(search.toLowerCase()) ||
        c.creatorName.toLowerCase().includes(search.toLowerCase()) ||
        c.uploaderNameSnapshot.toLowerCase().includes(search.toLowerCase());

      const matchesMedia = mediaType === 'all' || c.primaryMediaType === mediaType;
      return matchesSearch && matchesMedia;
    });

    result.sort((a, b) => {
      if (sortBy === 'newest') {
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
      if (sortBy === 'downloads') {
        return (b.downloadCount || 0) - (a.downloadCount || 0);
      }
      if (sortBy === 'likes') {
        return (b.likeCount || 0) - (a.likeCount || 0);
      }
      if (sortBy === 'title') {
        return a.title.localeCompare(b.title);
      }
      return 0;
    });

    return result;
  }, [clips, search, mediaType, sortBy]);

  const totalPages = Math.ceil(filteredAndSortedClips.length / itemsPerPage);
  const paginatedClips = filteredAndSortedClips.slice(0, page * itemsPerPage);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            Semua Clips Persib Bandung
          </h1>
          <p className="text-xs sm:text-sm text-slate-500">
            Kumpulan {clips.length} clips video dan foto siap unduh gratis untuk Bobotoh
          </p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="neu-card p-4 bg-white/90 space-y-3">
        <div className="flex flex-col md:flex-row items-center gap-3">
          {/* Search Bar */}
          <div className="relative w-full flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Cari clips berdasarkan judul atau nama pembuat..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="w-full pl-10 pr-10 py-2.5 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-blue-600 focus:bg-white transition-colors"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Media Types */}
          <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl shrink-0 w-full md:w-auto justify-center">
            <button
              onClick={() => {
                setMediaType('all');
                setPage(1);
              }}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
                mediaType === 'all' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-600 hover:text-blue-700'
              }`}
            >
              Semua
            </button>
            <button
              onClick={() => {
                setMediaType('video');
                setPage(1);
              }}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
                mediaType === 'video' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-600 hover:text-blue-700'
              }`}
            >
              Video
            </button>
            <button
              onClick={() => {
                setMediaType('photo');
                setPage(1);
              }}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
                mediaType === 'photo' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-600 hover:text-blue-700'
              }`}
            >
              Foto
            </button>
          </div>

          {/* Sort By */}
          <div className="flex items-center gap-2 shrink-0 w-full md:w-auto">
            <ArrowUpDown className="w-4 h-4 text-slate-400 shrink-0 hidden sm:block" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="w-full md:w-auto py-2 px-3 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl text-slate-700 outline-none focus:border-blue-600"
            >
              <option value="newest">Terbaru Diunggah</option>
              <option value="downloads">Terbanyak Didownload</option>
              <option value="likes">Paling Disukai</option>
              <option value="title">Judul (A-Z)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Grid of clips */}
      {paginatedClips.length > 0 ? (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-5">
            {paginatedClips.map((clip) => (
              <ClipCard
                key={clip.clipId}
                clip={clip}
                onNavigate={onNavigate}
                onShowToast={onShowToast}
              />
            ))}
          </div>

          {/* Load More Button if more pages exist */}
          {page < totalPages && (
            <div className="flex justify-center pt-6">
              <button
                onClick={() => setPage((prev) => prev + 1)}
                className="neu-button text-white font-bold text-xs sm:text-sm px-6 py-3 rounded-2xl cursor-pointer"
              >
                Muat Lebih Banyak ({filteredAndSortedClips.length - paginatedClips.length} tersisa)
              </button>
            </div>
          )}
        </>
      ) : clips.length === 0 ? (
        <div className="neu-card p-12 text-center space-y-4 bg-white border border-blue-100">
          <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto">
            <Video className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h3 className="font-extrabold text-slate-800 text-base">Belum Ada Clips yang Diunggah (0 Clips)</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Koleksi clips masih 0 seperti yang diminta. Admin dan Owner dapat mulai mengunggah clips Persib pertama kapan saja.
            </p>
          </div>
          <button
            onClick={() => onNavigate('/azryl-control')}
            className="neu-button text-white text-xs font-bold px-5 py-2.5 rounded-xl cursor-pointer"
          >
            Masuk Admin / Owner untuk Mengunggah
          </button>
        </div>
      ) : (
        <div className="neu-card p-12 text-center space-y-3 bg-white">
          <h3 className="font-bold text-slate-800 text-base">Tidak ada clips yang cocok</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Silakan ubah filter atau kata kunci pencarian Anda.
          </p>
          <button
            onClick={() => {
              setSearch('');
              setMediaType('all');
            }}
            className="neu-button text-white text-xs font-bold px-4 py-2 rounded-xl"
          >
            Bersihkan Pencarian
          </button>
        </div>
      )}
    </div>
  );
};
