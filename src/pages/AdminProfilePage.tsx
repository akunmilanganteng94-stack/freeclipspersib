import React from 'react';
import { ArrowLeft, Video, MessageCircle, ExternalLink, ShieldCheck, Download } from 'lucide-react';
import { UserProfile, ClipItem } from '../types';
import { ClipCard } from '../components/ClipCard';
import { getDeletedUserIds } from '../services/clipsService';

interface AdminProfilePageProps {
  adminId: string;
  admins: UserProfile[];
  clips: ClipItem[];
  onNavigate: (path: string) => void;
  onShowToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export const AdminProfilePage: React.FC<AdminProfilePageProps> = ({
  adminId,
  admins,
  clips,
  onNavigate,
  onShowToast,
}) => {
  // Find admin by uid (excluding deleted admins)
  const deletedIds = getDeletedUserIds();
  const validAdmins = admins.filter((a) => !deletedIds.has(a.uid));
  const admin = validAdmins.find((a) => a.uid === adminId) || validAdmins[0];
  const adminClips = clips.filter((c) => c.uploaderUid === admin?.uid && c.published);
  const totalDownloads = adminClips.reduce((acc, c) => acc + (c.downloadCount || 0), 0);

  if (!admin) {
    return (
      <div className="neu-card p-12 text-center bg-white space-y-4">
        <h2 className="text-xl font-bold text-slate-800">Admin tidak ditemukan</h2>
        <button
          onClick={() => onNavigate('/admin')}
          className="neu-button text-white px-5 py-2.5 rounded-xl text-xs font-bold"
        >
          Kembali ke Daftar Admin
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Back button */}
      <button
        onClick={() => onNavigate('/admin')}
        className="inline-flex items-center gap-2 text-xs font-bold text-blue-700 hover:text-blue-900 transition-colors cursor-pointer"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Kembali ke Semua Admin</span>
      </button>

      {/* Admin Hero Card */}
      <div className="neu-card p-6 sm:p-8 bg-white overflow-hidden relative">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
          <img
            src={admin.profileImage || 'https://i.postimg.cc/4ysQFgqx/1366b69ba442d21911f314947331b50a.jpg'}
            alt={admin.adminName}
            className="w-24 h-24 sm:w-28 sm:h-28 rounded-3xl object-cover border-4 border-blue-100 shadow-md"
            referrerPolicy="no-referrer"
            onError={(e) => {
              const target = e.currentTarget;
              if (!target.src.includes('1366b69ba442d21911f314947331b50a')) {
                target.src = 'https://i.postimg.cc/4ysQFgqx/1366b69ba442d21911f314947331b50a.jpg';
              }
            }}
          />

          <div className="space-y-2 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl sm:text-3xl font-black text-slate-900">
                {admin.adminName}
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-extrabold uppercase tracking-wider bg-blue-100 text-blue-800">
                {admin.role === 'owner' ? 'Owner / Founder' : 'Admin Uploader'}
              </span>
            </div>

            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed max-w-2xl">
              {admin.bio || 'Bobotoh Persib Bandung sejati pengunggah clips resmi.'}
            </p>

            {/* Social Channels */}
            <div className="flex flex-wrap items-center gap-2 pt-2">
              {admin.tiktokUrl && (
                <a
                  href={admin.tiktokUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1.5 rounded-xl bg-slate-900 text-white hover:bg-slate-800 transition-all text-xs font-bold flex items-center gap-1.5"
                >
                  <span>TikTok</span>
                  <ExternalLink className="w-3 h-3 opacity-60" />
                </a>
              )}
              {admin.instagramUrl && (
                <a
                  href={admin.instagramUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1.5 rounded-xl bg-pink-600 text-white hover:bg-pink-700 transition-all text-xs font-bold flex items-center gap-1.5"
                >
                  <span>Instagram</span>
                  <ExternalLink className="w-3 h-3 opacity-60" />
                </a>
              )}
              {admin.whatsappChannelUrl && (
                <a
                  href={admin.whatsappChannelUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1.5 rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 transition-all text-xs font-bold flex items-center gap-1.5"
                >
                  <MessageCircle className="w-3.5 h-3.5" />
                  <span>Saluran WhatsApp</span>
                </a>
              )}
            </div>
          </div>

          {/* Quick Metrics */}
          <div className="flex sm:flex-col items-center sm:items-end justify-between w-full sm:w-auto pt-4 sm:pt-0 border-t sm:border-t-0 border-slate-100 gap-4">
            <div className="text-left sm:text-right">
              <p className="text-2xl font-black text-blue-700 tabular-nums">
                {adminClips.length}
              </p>
              <p className="text-[11px] text-slate-400 font-semibold">Total Clips Diunggah</p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-black text-slate-800 tabular-nums">
                {totalDownloads.toLocaleString()}
              </p>
              <p className="text-[11px] text-slate-400 font-semibold">Total Unduhan Bobotoh</p>
            </div>
          </div>
        </div>
      </div>

      {/* Admin's Uploaded Clips */}
      <div className="space-y-4">
        <h2 className="text-xl font-extrabold text-slate-900">
          Koleksi Clips oleh {admin.adminName}
        </h2>

        {adminClips.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-5">
            {adminClips.map((clip) => (
              <ClipCard
                key={clip.clipId}
                clip={clip}
                onNavigate={onNavigate}
                onShowToast={onShowToast}
              />
            ))}
          </div>
        ) : (
          <div className="neu-card p-10 text-center bg-white">
            <p className="text-slate-500 text-xs">Belum ada clips yang diunggah oleh admin ini.</p>
          </div>
        )}
      </div>
    </div>
  );
};
