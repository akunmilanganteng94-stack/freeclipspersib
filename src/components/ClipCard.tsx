import React, { useState, useEffect } from 'react';
import { Download, Video, Image as ImageIcon, Flame, Heart, User } from 'lucide-react';
import { ClipItem } from '../types';
import { trackDownload, isClipLikedLocally, toggleClipLike } from '../services/clipsService';

interface ClipCardProps {
  clip: ClipItem;
  rank?: number;
  onNavigate: (path: string) => void;
  onShowToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export const ClipCard: React.FC<ClipCardProps> = ({ clip, rank, onNavigate, onShowToast }) => {
  const [downloading, setDownloading] = useState(false);
  const [localDownloads, setLocalDownloads] = useState(clip.downloadCount);
  const [isLiked, setIsLiked] = useState(false);
  const [localLikes, setLocalLikes] = useState(clip.likeCount || 0);
  const [animateHeart, setAnimateHeart] = useState(false);

  useEffect(() => {
    setIsLiked(isClipLikedLocally(clip.clipId));
    setLocalLikes(clip.likeCount || 0);
  }, [clip.clipId, clip.likeCount]);

  // Time format helper (Indonesian)
  const formatTimeAgo = (dateStr: string) => {
    try {
      const now = Date.now();
      const past = new Date(dateStr).getTime();
      const diffHrs = Math.floor((now - past) / 3600000);
      if (diffHrs < 1) return 'Baru saja';
      if (diffHrs < 24) return `${diffHrs} jam lalu`;
      const diffDays = Math.floor(diffHrs / 24);
      if (diffDays === 1) return 'Kemarin';
      return `${diffDays} hari lalu`;
    } catch {
      return 'Baru saja';
    }
  };

  const handleToggleLike = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setAnimateHeart(true);
    setTimeout(() => setAnimateHeart(false), 300);

    const result = await toggleClipLike(clip.clipId);
    setIsLiked(result.liked);
    setLocalLikes(result.newCount);

    if (result.liked) {
      onShowToast('Disukai! Hatur nuhun Bobotoh 💙', 'success');
    }
  };

  const handleQuickDownload = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (downloading) return;
    setDownloading(true);
    onShowToast(`Mempersiapkan unduhan "${clip.title.substring(0, 24)}..."`, 'info');

    try {
      // 1. Record download count
      const updated = await trackDownload(clip.clipId, clip.primaryMediaType);
      if (updated !== null) {
        setLocalDownloads(updated);
      }

      // 2. Trigger direct download via proxy to ensure attachment download
      const ext = clip.primaryMediaType === 'video' ? 'mp4' : 'jpg';
      const cleanSlug = clip.slug || 'persib-clip';
      const filename = `${cleanSlug}_utama.${ext}`;
      const downloadProxyUrl = `/api/download?url=${encodeURIComponent(clip.primaryMediaUrl)}&filename=${encodeURIComponent(filename)}`;

      const link = document.createElement('a');
      link.href = downloadProxyUrl;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      onShowToast('Unduhan berhasil dimulai! 💙', 'success');
    } catch (err) {
      console.error(err);
      onShowToast('Gagal mengunduh file. Silakan coba lagi.', 'error');
    } finally {
      setTimeout(() => setDownloading(false), 800);
    }
  };

  const isTrending = (clip.downloadCount || 0) >= 200 || (rank !== undefined && rank <= 5);

  return (
    <div
      onClick={() => onNavigate(`/clips/${clip.slug}`)}
      className="neu-card group flex flex-col justify-between overflow-hidden cursor-pointer relative bg-white"
    >
      {/* Thumbnail Container */}
      <div className="relative aspect-4/3 w-full bg-slate-900 overflow-hidden">
        {clip.primaryMediaType === 'video' ? (
          <div className="relative w-full h-full">
            <img
              src={clip.photoOneUrl || clip.photoTwoUrl}
              alt={clip.title}
              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-103"
              loading="lazy"
              referrerPolicy="no-referrer"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/70 via-transparent to-black/20" />
            <div className="absolute bottom-2.5 left-2.5 flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-blue-600 text-white text-[11px] font-bold shadow-xs">
              <Video className="w-3 h-3" />
              <span>Video</span>
            </div>
          </div>
        ) : (
          <div className="relative w-full h-full">
            <img
              src={clip.primaryMediaUrl}
              alt={clip.title}
              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-103"
              loading="lazy"
              referrerPolicy="no-referrer"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/70 via-transparent to-black/20" />
            <div className="absolute bottom-2.5 left-2.5 flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-slate-800 text-white text-[11px] font-bold shadow-xs">
              <ImageIcon className="w-3 h-3" />
              <span>Foto HD</span>
            </div>
          </div>
        )}

        {/* Top Right: 3-Media Tag and Heart Like Button */}
        <div className="absolute top-2 right-2 flex items-center gap-1.5 z-10">
          <div className="px-2 py-0.5 rounded-md bg-black/60 text-white text-[10px] font-medium backdrop-blur-xs">
            3 Media
          </div>
          <button
            onClick={handleToggleLike}
            className={`p-1.5 rounded-full backdrop-blur-md transition-all active:scale-90 cursor-pointer ${
              isLiked
                ? 'bg-rose-500 text-white shadow-md'
                : 'bg-black/50 text-white/90 hover:bg-black/70'
            } ${animateHeart ? 'animate-heart-pop' : ''}`}
            title={isLiked ? 'Batal Suka' : 'Suka Clip Ini'}
            aria-label="Like clip"
          >
            <Heart className={`w-3.5 h-3.5 ${isLiked ? 'fill-current' : ''}`} />
          </button>
        </div>

        {/* Rank or Trending Badge */}
        {rank !== undefined ? (
          <div
            className={`absolute top-2.5 left-2.5 w-7 h-7 rounded-full flex items-center justify-center text-xs font-black shadow-md ${
              rank === 1
                ? 'bg-amber-400 text-amber-950 ring-2 ring-amber-300'
                : rank === 2
                ? 'bg-slate-200 text-slate-800 ring-2 ring-slate-300'
                : rank === 3
                ? 'bg-amber-700 text-amber-100 ring-2 ring-amber-600'
                : 'bg-blue-600 text-white'
            }`}
          >
            #{rank}
          </div>
        ) : isTrending ? (
          <div className="absolute top-2.5 left-2.5 flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-500 text-white text-[10px] font-black uppercase tracking-wider shadow-sm">
            <Flame className="w-3 h-3 fill-current" />
            <span>Trending</span>
          </div>
        ) : null}
      </div>

      {/* Card Content */}
      <div className="p-3.5 sm:p-4 flex flex-col flex-1 justify-between gap-2.5">
        <div>
          {/* Metadata clean text */}
          <div className="flex items-center gap-2 text-[11px] text-slate-400 font-medium mb-1 truncate">
            <span className="truncate">{clip.creatorName}</span>
            <span aria-hidden="true">·</span>
            <span className="shrink-0">{formatTimeAgo(clip.createdAt)}</span>
          </div>

          {/* Title */}
          <h3 className="font-bold text-sm sm:text-base text-slate-800 group-hover:text-blue-700 transition-colors line-clamp-2 leading-snug">
            {clip.title}
          </h3>
        </div>

        {/* Uploader, Likes, & Download stats */}
        <div>
          <div className="flex items-center justify-between text-xs text-slate-500 py-1 border-t border-slate-100 mt-1">
            <span className="text-[11px] text-slate-500 flex items-center gap-1 truncate max-w-[110px]">
              <User className="w-3 h-3 text-blue-600 shrink-0" />
              <span className="truncate">{clip.uploaderNameSnapshot}</span>
            </span>

            <div className="flex items-center gap-2.5">
              {/* Real-time Like count */}
              <button
                onClick={handleToggleLike}
                className="flex items-center gap-1 text-[11px] font-bold text-rose-600 hover:opacity-80 transition-opacity cursor-pointer"
              >
                <Heart className={`w-3 h-3 ${isLiked ? 'fill-current' : ''}`} />
                <span className="tabular-nums">{localLikes}</span>
              </button>

              {/* Download Count */}
              <span className="font-semibold text-blue-700 text-[11px] tabular-nums">
                {localDownloads.toLocaleString()} dl
              </span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-2 gap-2 mt-2 pt-1">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onNavigate(`/clips/${clip.slug}`);
              }}
              className="neu-button-secondary py-2 px-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <span>3 Media</span>
            </button>
            <button
              onClick={handleQuickDownload}
              disabled={downloading}
              className="neu-button text-white py-2 px-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-70"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{downloading ? 'Unduh...' : 'Download'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
