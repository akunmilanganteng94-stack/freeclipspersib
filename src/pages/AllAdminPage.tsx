import React from 'react';
import { Users, Video, MessageCircle, ExternalLink, ShieldCheck } from 'lucide-react';
import { UserProfile, ClipItem } from '../types';

interface AllAdminPageProps {
  admins: UserProfile[];
  clips: ClipItem[];
  onNavigate: (path: string) => void;
}

export const AllAdminPage: React.FC<AllAdminPageProps> = ({ admins, clips, onNavigate }) => {
  const activeAdmins = admins.filter((a) => a.active);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="neu-card p-6 sm:p-8 bg-white/90">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-xs">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
              Kreator & Admin FREE CLIPS PERSIB
            </h1>
            <p className="text-xs sm:text-sm text-slate-500">
              Profil resmi para Bobotoh yang mengabadikan dan mengunggah clips Persib Bandung
            </p>
          </div>
        </div>
      </div>

      {/* Admins Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {activeAdmins.map((admin) => {
          const adminClips = clips.filter((c) => c.uploaderUid === admin.uid && c.published);
          const totalDownloads = adminClips.reduce((acc, c) => acc + (c.downloadCount || 0), 0);

          return (
            <div
              key={admin.uid}
              className="neu-card p-6 flex flex-col justify-between bg-white relative overflow-hidden group"
            >
              {/* Badge Owner / Admin */}
              <div className="flex items-center justify-between mb-4">
                <span
                  className={`text-[10px] font-extrabold uppercase px-2.5 py-1 rounded-full tracking-wider ${
                    admin.role === 'owner'
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'bg-blue-50 text-blue-800 border border-blue-200'
                  }`}
                >
                  {admin.role === 'owner' ? 'Founder & Owner' : 'Official Admin'}
                </span>
                <span className="text-xs font-semibold text-slate-400">
                  {adminClips.length} Clips
                </span>
              </div>

              {/* Profile Avatar & Info */}
              <div className="flex items-center gap-4 mb-4">
                <img
                  src={admin.profileImage || 'https://i.postimg.cc/4ysQFgqx/1366b69ba442d21911f314947331b50a.jpg'}
                  alt={admin.adminName}
                  className="w-16 h-16 rounded-2xl object-cover border-2 border-blue-200 shadow-xs"
                  referrerPolicy="no-referrer"
                />
                <div className="min-w-0 flex-1">
                  <h3
                    onClick={() => onNavigate(`/admin/${admin.uid}`)}
                    className="font-extrabold text-base text-slate-900 group-hover:text-blue-700 transition-colors cursor-pointer truncate"
                  >
                    {admin.adminName}
                  </h3>
                  <p className="text-xs text-slate-500 font-medium truncate">
                    {admin.email}
                  </p>
                  <p className="text-[11px] text-blue-600 font-bold mt-1">
                    {totalDownloads.toLocaleString()} total unduhan
                  </p>
                </div>
              </div>

              {/* Bio */}
              <p className="text-xs text-slate-600 line-clamp-3 mb-5 leading-relaxed bg-slate-50/80 p-3 rounded-xl border border-slate-100">
                {admin.bio || 'Bobotoh Persib Bandung sejati yang aktif membagikan momen-momen emas Pangeran Biru.'}
              </p>

              {/* Social Media Links (Rendered only if filled) */}
              <div className="space-y-3 pt-2 border-t border-slate-100">
                <div className="flex flex-wrap items-center gap-2">
                  {admin.tiktokUrl && (
                    <a
                      href={admin.tiktokUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-2.5 py-1.5 rounded-xl bg-slate-100 text-slate-800 hover:bg-black hover:text-white transition-all text-xs font-bold flex items-center gap-1.5"
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
                      className="px-2.5 py-1.5 rounded-xl bg-pink-50 text-pink-700 hover:bg-pink-600 hover:text-white transition-all text-xs font-bold flex items-center gap-1.5 border border-pink-100"
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
                      className="px-2.5 py-1.5 rounded-xl bg-emerald-50 text-emerald-700 hover:bg-emerald-600 hover:text-white transition-all text-xs font-bold flex items-center gap-1.5 border border-emerald-100"
                    >
                      <MessageCircle className="w-3 h-3" />
                      <span>Saluran WA</span>
                    </a>
                  )}
                </div>

                <button
                  onClick={() => onNavigate(`/admin/${admin.uid}`)}
                  className="w-full neu-button-secondary py-2.5 rounded-xl text-xs font-extrabold cursor-pointer"
                >
                  Lihat Profil & Koleksi Clips
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
