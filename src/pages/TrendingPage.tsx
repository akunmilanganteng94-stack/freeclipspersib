import React from 'react';
import { Flame, Heart, Download } from 'lucide-react';
import { ClipItem } from '../types';
import { ClipCard } from '../components/ClipCard';

interface TrendingPageProps {
  clips: ClipItem[];
  onNavigate: (path: string) => void;
  onShowToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export const TrendingPage: React.FC<TrendingPageProps> = ({ clips, onNavigate, onShowToast }) => {
  const [sortBy, setSortBy] = React.useState<'downloads' | 'likes'>('downloads');

  // Sort strictly by download count or like count descending
  const sortedClips = [...clips]
    .filter((c) => c.published)
    .sort((a, b) => {
      if (sortBy === 'likes') {
        return (b.likeCount || 0) - (a.likeCount || 0);
      }
      return (b.downloadCount || 0) - (a.downloadCount || 0);
    });

  const totalDownloads = sortedClips.reduce((acc, c) => acc + (c.downloadCount || 0), 0);
  const totalLikes = sortedClips.reduce((acc, c) => acc + (c.likeCount || 0), 0);

  return (
    <div className="space-y-8">
      {/* Hero Header */}
      <div className="neu-card p-6 sm:p-10 bg-gradient-to-br from-amber-500/10 via-blue-50/50 to-white border border-amber-200/50">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-500 to-amber-400 text-white flex items-center justify-center shadow-md">
              <Flame className="w-6 h-6 fill-current" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                <span>Clips Persib Ter-Trending</span>
              </h1>
              <p className="text-xs sm:text-sm text-slate-500">
                Koleksi video dan foto paling favorit dan banyak diunduh oleh para Bobotoh
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1 p-1 bg-white rounded-xl border border-slate-200 shadow-xs">
              <button
                onClick={() => setSortBy('downloads')}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
                  sortBy === 'downloads'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-blue-700'
                }`}
              >
                Unduhan ({totalDownloads.toLocaleString()})
              </button>
              <button
                onClick={() => setSortBy('likes')}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
                  sortBy === 'likes'
                    ? 'bg-rose-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-rose-700'
                }`}
              >
                Disukai ({totalLikes.toLocaleString()})
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Grid with Ranking Medals */}
      {sortedClips.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-5">
          {sortedClips.map((clip, index) => (
            <ClipCard
              key={clip.clipId}
              clip={clip}
              rank={index + 1}
              onNavigate={onNavigate}
              onShowToast={onShowToast}
            />
          ))}
        </div>
      ) : (
        <div className="neu-card p-12 text-center space-y-3 bg-white border border-amber-200/40">
          <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-500 flex items-center justify-center mx-auto">
            <Flame className="w-6 h-6 fill-current" />
          </div>
          <h3 className="font-extrabold text-slate-800 text-base">Belum Ada Data Trending (0 Clips)</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Belum ada clips yang diunggah saat ini. Setelah admin atau owner mengunggah clips, peringkat unduhan terpopuler akan otomatis muncul di sini!
          </p>
        </div>
      )}
    </div>
  );
};
