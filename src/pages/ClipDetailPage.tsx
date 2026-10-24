import React, { useState, useEffect } from 'react';
import {
  Download,
  Share2,
  Copy,
  Check,
  ArrowLeft,
  Calendar,
  User,
  Film,
  Image as ImageIcon,
  Flame,
  FileArchive,
  Maximize2,
  ShieldCheck,
  Heart,
} from 'lucide-react';
import { ClipItem, UserProfile } from '../types';
import { VideoPlayer } from '../components/VideoPlayer';
import { ImageLightbox } from '../components/ImageLightbox';
import { ShareModal } from '../components/ShareModal';
import { ClipCard } from '../components/ClipCard';
import { trackDownload, isClipLikedLocally, toggleClipLike } from '../services/clipsService';

interface ClipDetailPageProps {
  slug: string;
  clips: ClipItem[];
  admins: UserProfile[];
  onNavigate: (path: string) => void;
  onShowToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export const ClipDetailPage: React.FC<ClipDetailPageProps> = ({
  slug,
  clips,
  admins,
  onNavigate,
  onShowToast,
}) => {
  const [downloadingTarget, setDownloadingTarget] = useState<string | null>(null);
  const [downloadingZip, setDownloadingZip] = useState(false);
  const [copied, setCopied] = useState(false);
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [lightboxData, setLightboxData] = useState<{ url: string; label: string } | null>(null);

  // Find clip by slug or clipId
  const clip = clips.find((c) => c.slug === slug || c.clipId === slug);

  const [isLiked, setIsLiked] = useState(false);
  const [localLikes, setLocalLikes] = useState(clip?.likeCount || 0);
  const [animateHeart, setAnimateHeart] = useState(false);

  useEffect(() => {
    if (clip) {
      setIsLiked(isClipLikedLocally(clip.clipId));
      setLocalLikes(clip.likeCount || 0);
    }
  }, [clip?.clipId, clip?.likeCount]);

  const handleToggleLike = async () => {
    if (!clip) return;
    setAnimateHeart(true);
    setTimeout(() => setAnimateHeart(false), 300);

    const result = await toggleClipLike(clip.clipId);
    setIsLiked(result.liked);
    setLocalLikes(result.newCount);

    if (result.liked) {
      onShowToast('Disukai! Hatur nuhun Bobotoh 💙', 'success');
    }
  };

  if (!clip) {
    return (
      <div className="neu-card p-12 text-center bg-white space-y-4">
        <h2 className="text-xl font-bold text-slate-800">Clips Tidak Ditemukan</h2>
        <p className="text-xs text-slate-500">
          Clips dengan link ini mungkin telah diarsipkan atau url salah.
        </p>
        <button
          onClick={() => onNavigate('/clips')}
          className="neu-button text-white px-5 py-2.5 rounded-xl text-xs font-bold"
        >
          Kembali ke Koleksi Clips
        </button>
      </div>
    );
  }

  const uploader = admins.find((a) => a.uid === clip.uploaderUid);

  // Copy URL
  const handleCopyLink = () => {
    const fullUrl = window.location.href;
    navigator.clipboard.writeText(fullUrl);
    setCopied(true);
    onShowToast('Link berhasil disalin!', 'success');
    setTimeout(() => setCopied(false), 2000);
  };

  // Download a single media
  const handleDownloadSingle = async (url: string, label: string, type: 'video' | 'photo') => {
    if (downloadingTarget) return;
    setDownloadingTarget(label);
    onShowToast(`Memulai unduhan ${label}...`, 'info');

    try {
      await trackDownload(clip.clipId, type);

      const ext = type === 'video' ? 'mp4' : 'jpg';
      const cleanSlug = clip.slug || 'persib';
      const filename = `${cleanSlug}_${label.toLowerCase().replace(/\s+/g, '_')}.${ext}`;
      const proxyUrl = `/api/download?url=${encodeURIComponent(url)}&filename=${encodeURIComponent(filename)}`;

      const a = document.createElement('a');
      a.href = proxyUrl;
      a.setAttribute('download', filename);
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);

      onShowToast(`Unduhan ${label} selesai! 💙`, 'success');
    } catch (err) {
      console.error(err);
      onShowToast(`Gagal mengunduh ${label}`, 'error');
    } finally {
      setTimeout(() => setDownloadingTarget(null), 1000);
    }
  };

  // Download All 3 media as ZIP
  const handleDownloadAllZip = async () => {
    if (downloadingZip) return;
    setDownloadingZip(true);
    onShowToast('Membuat arsip ZIP 3 media Persib...', 'info');

    try {
      await trackDownload(clip.clipId, 'zip_all');

      const items = [
        {
          url: clip.primaryMediaUrl,
          filename: `1_media_utama_${clip.slug}.${clip.primaryMediaType === 'video' ? 'mp4' : 'jpg'}`,
        },
        {
          url: clip.photoOneUrl,
          filename: `2_foto_pendukung_1_${clip.slug}.jpg`,
        },
        {
          url: clip.photoTwoUrl,
          filename: `3_foto_pendukung_2_${clip.slug}.jpg`,
        },
      ];

      const resp = await fetch('/api/download-zip', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: clip.slug || 'FREE_CLIPS_PERSIB',
          items,
        }),
      });

      if (!resp.ok) {
        throw new Error('Gagal membuat ZIP di server');
      }

      const blob = await resp.blob();
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = `FREE-CLIPS-PERSIB-${clip.slug}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(blobUrl);

      onShowToast('Download ZIP 3 media berhasil! 💙⚽', 'success');
    } catch (err) {
      console.error('ZIP download error, falling back to sequential download:', err);
      // Fallback: download each individually
      await handleDownloadSingle(clip.primaryMediaUrl, 'Media Utama', clip.primaryMediaType);
      setTimeout(() => handleDownloadSingle(clip.photoOneUrl, 'Foto 1', 'photo'), 1000);
      setTimeout(() => handleDownloadSingle(clip.photoTwoUrl, 'Foto 2', 'photo'), 2000);
    } finally {
      setDownloadingZip(false);
    }
  };

  // Related clips (exclude current)
  const relatedClips = clips
    .filter((c) => c.clipId !== clip.clipId && c.published)
    .slice(0, 4);

  return (
    <div className="space-y-8">
      {/* Top back & navigation */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => onNavigate('/clips')}
          className="inline-flex items-center gap-2 text-xs font-bold text-blue-700 hover:text-blue-900 transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Kembali ke Semua Clips</span>
        </button>

        <div className="flex items-center gap-2">
          {/* Real-time Like Button */}
          <button
            onClick={handleToggleLike}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all active:scale-95 shadow-xs ${
              isLiked
                ? 'bg-rose-500 text-white'
                : 'neu-button-secondary text-rose-600 hover:bg-rose-50'
            } ${animateHeart ? 'animate-heart-pop' : ''}`}
            title={isLiked ? 'Batal Suka' : 'Suka Clip Ini'}
          >
            <Heart className={`w-3.5 h-3.5 ${isLiked ? 'fill-current' : ''}`} />
            <span>{isLiked ? 'Disukai' : 'Suka'}</span>
            <span className="tabular-nums font-extrabold ml-0.5">({localLikes})</span>
          </button>

          <button
            onClick={handleCopyLink}
            className="neu-button-secondary px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
            <span className="hidden sm:inline">{copied ? 'Link Tersalin' : 'Salin Link'}</span>
          </button>

          <button
            onClick={() => setShareModalOpen(true)}
            className="neu-button px-3.5 py-1.5 rounded-xl text-xs font-bold text-white flex items-center gap-1.5 cursor-pointer shadow-xs"
          >
            <Share2 className="w-3.5 h-3.5" />
            <span>Bagikan</span>
          </button>
        </div>
      </div>

      {/* Main Container */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        {/* Left Column (2 cols): Media Display */}
        <div className="lg:col-span-2 space-y-6">
          {/* 1. Primary Media Player / Viewer */}
          <div className="neu-card p-3 sm:p-4 bg-white">
            <div className="flex items-center justify-between pb-3 px-1 text-xs font-bold text-slate-500">
              <span className="flex items-center gap-1.5 text-blue-800">
                {clip.primaryMediaType === 'video' ? <Film className="w-4 h-4" /> : <ImageIcon className="w-4 h-4" />}
                <span>Media Utama: {clip.primaryMediaType === 'video' ? 'Video Player Full HD' : 'Foto Utama'}</span>
              </span>
              <button
                onClick={() =>
                  clip.primaryMediaType === 'photo'
                    ? setLightboxData({ url: clip.primaryMediaUrl, label: 'Foto Utama' })
                    : null
                }
                className="text-blue-600 hover:underline cursor-pointer text-[11px]"
              >
                {clip.primaryMediaType === 'photo' && 'Perbesar Foto'}
              </button>
            </div>

            {clip.primaryMediaType === 'video' ? (
              <VideoPlayer
                src={clip.primaryMediaUrl}
                poster={clip.photoOneUrl}
                title={clip.title}
              />
            ) : (
              <div
                onClick={() => setLightboxData({ url: clip.primaryMediaUrl, label: 'Foto Utama' })}
                className="relative aspect-video w-full rounded-2xl overflow-hidden bg-slate-950 cursor-pointer group"
              >
                <img
                  src={clip.primaryMediaUrl}
                  alt={clip.title}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-102"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute inset-0 bg-black/20 group-hover:bg-black/10 transition-colors flex items-center justify-center">
                  <div className="p-3 rounded-full bg-black/60 text-white backdrop-blur-xs opacity-0 group-hover:opacity-100 transition-opacity">
                    <Maximize2 className="w-5 h-5" />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* 2. Supporting Photos (Photo 1 & Photo 2) */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-extrabold text-sm sm:text-base text-slate-800 flex items-center gap-2">
                <ImageIcon className="w-4 h-4 text-blue-600" />
                <span>2 Foto Pendukung Berkualitas Tinggi</span>
              </h3>
              <span className="text-xs text-slate-400">Klik untuk melihat resolusi penuh</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Photo One */}
              <div
                onClick={() => setLightboxData({ url: clip.photoOneUrl, label: 'Foto Pendukung 1' })}
                className="neu-card p-2.5 bg-white group cursor-pointer"
              >
                <div className="relative aspect-4/3 w-full rounded-xl overflow-hidden bg-slate-950">
                  <img
                    src={clip.photoOneUrl}
                    alt={`${clip.title} - Foto 1`}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute top-2 left-2 px-2 py-0.5 rounded-md bg-black/60 text-white text-[10px] font-bold backdrop-blur-xs">
                    Foto 1
                  </div>
                  <div className="absolute bottom-2 right-2 p-1.5 rounded-lg bg-black/60 text-white backdrop-blur-xs opacity-80 group-hover:opacity-100">
                    <Maximize2 className="w-3.5 h-3.5" />
                  </div>
                </div>
                <div className="pt-2 px-1 flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-700">Foto Pendukung 1</span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDownloadSingle(clip.photoOneUrl, 'Foto 1', 'photo');
                    }}
                    disabled={downloadingTarget === 'Foto 1'}
                    className="text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1 cursor-pointer"
                  >
                    <Download className="w-3 h-3" />
                    <span>Download</span>
                  </button>
                </div>
              </div>

              {/* Photo Two */}
              <div
                onClick={() => setLightboxData({ url: clip.photoTwoUrl, label: 'Foto Pendukung 2' })}
                className="neu-card p-2.5 bg-white group cursor-pointer"
              >
                <div className="relative aspect-4/3 w-full rounded-xl overflow-hidden bg-slate-950">
                  <img
                    src={clip.photoTwoUrl}
                    alt={`${clip.title} - Foto 2`}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute top-2 left-2 px-2 py-0.5 rounded-md bg-black/60 text-white text-[10px] font-bold backdrop-blur-xs">
                    Foto 2
                  </div>
                  <div className="absolute bottom-2 right-2 p-1.5 rounded-lg bg-black/60 text-white backdrop-blur-xs opacity-80 group-hover:opacity-100">
                    <Maximize2 className="w-3.5 h-3.5" />
                  </div>
                </div>
                <div className="pt-2 px-1 flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-700">Foto Pendukung 2</span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDownloadSingle(clip.photoTwoUrl, 'Foto 2', 'photo');
                    }}
                    disabled={downloadingTarget === 'Foto 2'}
                    className="text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1 cursor-pointer"
                  >
                    <Download className="w-3 h-3" />
                    <span>Download</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column (1 col): Metadata & Download Actions */}
        <div className="space-y-6">
          {/* Metadata Card */}
          <div className="neu-card p-6 bg-white space-y-5">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="px-2.5 py-0.5 rounded-md text-[10px] font-extrabold uppercase bg-blue-100 text-blue-800">
                  {clip.primaryMediaType === 'video' ? 'Video Clip' : 'Foto Series'}
                </span>
                <span className="text-xs text-slate-400 font-mono">
                  ID: {clip.slug}
                </span>
              </div>
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 leading-snug">
                {clip.title}
              </h1>
            </div>

            {/* Creator & Uploader Info */}
            <div className="space-y-2 py-3 border-y border-slate-100 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-400 font-medium">Pembuat Clips:</span>
                <span className="font-bold text-slate-800">{clip.creatorName}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400 font-medium">Pengunggah (Admin):</span>
                <button
                  onClick={() => onNavigate(`/admin/${clip.uploaderUid}`)}
                  className="font-bold text-blue-700 hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <User className="w-3 h-3" />
                  <span>{clip.uploaderNameSnapshot}</span>
                </button>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400 font-medium">Tanggal Rilis:</span>
                <span className="font-medium text-slate-600 flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  <span>{new Date(clip.createdAt).toLocaleDateString('id-ID', { dateStyle: 'medium' })}</span>
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400 font-medium">Total Diunduh Bobotoh:</span>
                <span className="font-black text-blue-700 tabular-nums">
                  {clip.downloadCount.toLocaleString()} Kali
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400 font-medium">Total Disukai Bobotoh:</span>
                <span className="font-black text-rose-600 tabular-nums flex items-center gap-1.5">
                  <Heart className="w-3.5 h-3.5 fill-current" />
                  {localLikes.toLocaleString()} Suka
                </span>
              </div>
            </div>

            {/* Description */}
            {clip.description && (
              <div className="space-y-1">
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Deskripsi Clips
                </h4>
                <p className="text-xs text-slate-600 leading-relaxed bg-slate-50 p-3 rounded-xl border border-slate-100">
                  {clip.description}
                </p>
              </div>
            )}

            {/* Download Hub */}
            <div className="space-y-2.5 pt-2">
              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Pusat Download (Gratis)
              </h4>

              {/* 1. Download Primary Media */}
              <button
                onClick={() =>
                  handleDownloadSingle(
                    clip.primaryMediaUrl,
                    clip.primaryMediaType === 'video' ? 'Video Utama' : 'Foto Utama',
                    clip.primaryMediaType
                  )
                }
                disabled={downloadingTarget !== null}
                className="w-full neu-button text-white py-3 px-4 rounded-xl text-xs sm:text-sm font-extrabold flex items-center justify-center gap-2 cursor-pointer shadow-md disabled:opacity-60"
              >
                <Download className="w-4 h-4" />
                <span>
                  {downloadingTarget === 'Video Utama' || downloadingTarget === 'Foto Utama'
                    ? 'Memproses Unduhan...'
                    : `Download ${clip.primaryMediaType === 'video' ? 'Video Utama (MP4)' : 'Foto Utama (HD)'}`}
                </span>
              </button>

              {/* 2. Download Photo 1 */}
              <button
                onClick={() => handleDownloadSingle(clip.photoOneUrl, 'Foto 1', 'photo')}
                disabled={downloadingTarget !== null}
                className="w-full neu-button-secondary py-2.5 px-4 rounded-xl text-xs font-bold flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
              >
                <ImageIcon className="w-3.5 h-3.5" />
                <span>
                  {downloadingTarget === 'Foto 1' ? 'Mengunduh Foto 1...' : 'Download Foto Pendukung 1'}
                </span>
              </button>

              {/* 3. Download Photo 2 */}
              <button
                onClick={() => handleDownloadSingle(clip.photoTwoUrl, 'Foto 2', 'photo')}
                disabled={downloadingTarget !== null}
                className="w-full neu-button-secondary py-2.5 px-4 rounded-xl text-xs font-bold flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
              >
                <ImageIcon className="w-3.5 h-3.5" />
                <span>
                  {downloadingTarget === 'Foto 2' ? 'Mengunduh Foto 2...' : 'Download Foto Pendukung 2'}
                </span>
              </button>

              {/* 4. Download ALL as ZIP */}
              <button
                onClick={handleDownloadAllZip}
                disabled={downloadingZip}
                className="w-full py-3 px-4 rounded-xl text-xs sm:text-sm font-extrabold bg-gradient-to-r from-amber-500 to-amber-600 text-white flex items-center justify-center gap-2 shadow-md hover:from-amber-600 hover:to-amber-700 transition-all cursor-pointer disabled:opacity-60"
              >
                <FileArchive className="w-4 h-4" />
                <span>
                  {downloadingZip ? 'Mengompres Semua Media (ZIP)...' : 'Download Semua 3 Media (ZIP)'}
                </span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Recommended Clips */}
      {relatedClips.length > 0 && (
        <div className="space-y-4 pt-6 border-t border-slate-200">
          <h2 className="text-lg sm:text-xl font-extrabold text-slate-900">
            Rekomendasi Clips Lainnya
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-5">
            {relatedClips.map((item) => (
              <ClipCard
                key={item.clipId}
                clip={item}
                onNavigate={onNavigate}
                onShowToast={onShowToast}
              />
            ))}
          </div>
        </div>
      )}

      {/* Lightbox for zooming photos */}
      {lightboxData && (
        <ImageLightbox
          isOpen={true}
          imageUrl={lightboxData.url}
          label={lightboxData.label}
          title={clip.title}
          onClose={() => setLightboxData(null)}
          onDownload={() =>
            handleDownloadSingle(lightboxData.url, lightboxData.label, 'photo')
          }
        />
      )}

      {/* Share Modal */}
      <ShareModal
        isOpen={shareModalOpen}
        clip={clip}
        onClose={() => setShareModalOpen(false)}
        onShowToast={onShowToast}
      />
    </div>
  );
};
