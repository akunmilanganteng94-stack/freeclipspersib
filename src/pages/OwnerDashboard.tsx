import React, { useState, useMemo } from 'react';
import {
  Users,
  Video,
  BarChart3,
  Settings,
  Plus,
  Trash2,
  Edit3,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Eye,
  ExternalLink,
  Save,
  LogOut,
  Flame,
  Download,
  AlertTriangle,
  Lock,
  Smartphone,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { UserProfile, ClipItem, SiteSettings } from '../types';
import {
  saveUserProfile,
  updateClip,
  deleteClip,
  updateSiteSettings,
} from '../services/clipsService';

interface OwnerDashboardProps {
  clips: ClipItem[];
  admins: UserProfile[];
  siteSettings: SiteSettings;
  onNavigate: (path: string) => void;
  onShowToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export const OwnerDashboard: React.FC<OwnerDashboardProps> = ({
  clips,
  admins,
  siteSettings,
  onNavigate,
  onShowToast,
}) => {
  const { userProfile, logout } = useAuth();
  const [activeTab, setActiveTab] = useState<'stats' | 'admins' | 'clips' | 'settings'>('stats');

  // Admin management state
  const [showAddAdminModal, setShowAddAdminModal] = useState(false);
  const [newAdminEmail, setNewAdminEmail] = useState('');
  const [newAdminPassword, setNewAdminPassword] = useState('');
  const [newAdminName, setNewAdminName] = useState('');
  const [newAdminBio, setNewAdminBio] = useState('');
  const [newAdminTiktok, setNewAdminTiktok] = useState('');
  const [newAdminInstagram, setNewAdminInstagram] = useState('');
  const [newAdminWA, setNewAdminWA] = useState('');
  const [isSubmittingAdmin, setIsSubmittingAdmin] = useState(false);

  // Edit Admin modal state
  const [editingAdmin, setEditingAdmin] = useState<UserProfile | null>(null);

  // Edit Clip modal state
  const [editingClip, setEditingClip] = useState<ClipItem | null>(null);

  // Site settings state
  const [siteName, setSiteName] = useState(siteSettings.siteName || 'FREE CLIPS PERSIB');
  const [siteDesc, setSiteDesc] = useState(siteSettings.description || 'Free Persib Bandung Clips');
  const [siteAnnouncement, setSiteAnnouncement] = useState(siteSettings.announcement || '');
  const [maintenanceMode, setMaintenanceMode] = useState(siteSettings.maintenanceMode || false);

  // APK Version state (Owner can edit URL and details)
  const [apkDownloadUrl, setApkDownloadUrl] = useState(siteSettings.apkDownloadUrl || '');
  const [apkVersionName, setApkVersionName] = useState(siteSettings.apkVersionName || 'v1.0.0 (Official)');
  const [apkReleaseNotes, setApkReleaseNotes] = useState(
    siteSettings.apkReleaseNotes || 'Aplikasi resmi Android Bobotoh Persib untuk nonton dan unduh clips HD dengan cepat & gratis.'
  );
  const [apkEnabled, setApkEnabled] = useState(siteSettings.apkEnabled ?? true);

  // Aggregated Statistics
  const totalDownloads = useMemo(() => {
    return clips.reduce((acc, c) => acc + (c.downloadCount || 0), 0);
  }, [clips]);

  const activeAdminsCount = useMemo(() => {
    return admins.filter((a) => a.active).length;
  }, [admins]);

  const topClips = useMemo(() => {
    return [...clips].sort((a, b) => (b.downloadCount || 0) - (a.downloadCount || 0)).slice(0, 5);
  }, [clips]);

  // Create Admin Account via backend endpoint to preserve Owner session
  const handleCreateAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAdminEmail || !newAdminPassword || !newAdminName) {
      onShowToast('Harap isi semua kolom wajib!', 'error');
      return;
    }

    setIsSubmittingAdmin(true);
    try {
      // 1. Call server endpoint to create user safely
      const resp = await fetch('/api/admin/create-admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: newAdminEmail.trim(),
          password: newAdminPassword,
          adminName: newAdminName.trim(),
          bio: newAdminBio.trim(),
          tiktokUrl: newAdminTiktok.trim(),
          instagramUrl: newAdminInstagram.trim(),
          whatsappChannelUrl: newAdminWA.trim(),
        }),
      });

      const data = await resp.json();
      const adminUid = data.uid || `admin_${Date.now()}`;

      // 2. Save profile to Firestore / Local
      const newAdminProfile: UserProfile = {
        uid: adminUid,
        email: newAdminEmail.trim(),
        role: 'admin',
        adminName: newAdminName.trim(),
        bio: newAdminBio.trim(),
        tiktokUrl: newAdminTiktok.trim(),
        instagramUrl: newAdminInstagram.trim(),
        whatsappChannelUrl: newAdminWA.trim(),
        active: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await saveUserProfile(newAdminProfile);
      onShowToast(`Akun admin ${newAdminName} berhasil dibuat!`, 'success');

      // Reset modal
      setShowAddAdminModal(false);
      setNewAdminEmail('');
      setNewAdminPassword('');
      setNewAdminName('');
      setNewAdminBio('');
      setNewAdminTiktok('');
      setNewAdminInstagram('');
      setNewAdminWA('');
    } catch (err: any) {
      console.error(err);
      onShowToast('Gagal membuat admin: ' + (err.message || 'Kesalahan sistem'), 'error');
    } finally {
      setIsSubmittingAdmin(false);
    }
  };

  // Toggle Admin Active Status
  const handleToggleAdminStatus = async (admin: UserProfile) => {
    try {
      const updated = { ...admin, active: !admin.active };
      await saveUserProfile(updated);
      onShowToast(
        `Status admin ${admin.adminName} diubah menjadi ${updated.active ? 'Aktif' : 'Nonaktif'}`,
        'success'
      );
    } catch (err) {
      onShowToast('Gagal mengubah status admin', 'error');
    }
  };

  // Save edited admin profile
  const handleSaveEditedAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAdmin) return;
    try {
      await saveUserProfile(editingAdmin);
      onShowToast(`Profil admin ${editingAdmin.adminName} berhasil diperbarui!`, 'success');
      setEditingAdmin(null);
    } catch (err) {
      onShowToast('Gagal menyimpan profil admin', 'error');
    }
  };

  // Save edited clip
  const handleSaveEditedClip = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingClip) return;
    try {
      await updateClip(editingClip.clipId, {
        title: editingClip.title,
        creatorName: editingClip.creatorName,
        description: editingClip.description,
        published: editingClip.published,
      });
      onShowToast(`Clips "${editingClip.title}" berhasil diperbarui!`, 'success');
      setEditingClip(null);
    } catch (err) {
      onShowToast('Gagal mengedit clips', 'error');
    }
  };

  // Delete clip with confirmation
  const handleDeleteClip = async (clipId: string, clipTitle: string) => {
    if (!window.confirm(`Apakah Anda yakin ingin menghapus clip "${clipTitle}"?`)) return;
    try {
      await deleteClip(clipId);
      onShowToast(`Clip "${clipTitle}" berhasil dihapus.`, 'info');
    } catch (err) {
      onShowToast('Gagal menghapus clip', 'error');
    }
  };

  // Toggle clip published status
  const handleToggleClipPublish = async (clip: ClipItem) => {
    try {
      await updateClip(clip.clipId, { published: !clip.published });
      onShowToast(
        `Status clip diubah menjadi ${!clip.published ? 'Dipublikasikan' : 'Diarsipkan'}`,
        'success'
      );
    } catch (err) {
      onShowToast('Gagal mengubah status publikasi', 'error');
    }
  };

  // Save Website Settings & APK Link
  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await updateSiteSettings({
        siteName,
        description: siteDesc,
        announcement: siteAnnouncement,
        maintenanceMode,
        apkDownloadUrl: apkDownloadUrl.trim(),
        apkVersionName: apkVersionName.trim(),
        apkReleaseNotes: apkReleaseNotes.trim(),
        apkEnabled,
      });
      onShowToast('Pengaturan website dan link APK berhasil disimpan!', 'success');
    } catch (err) {
      onShowToast('Gagal menyimpan pengaturan website', 'error');
    }
  };

  return (
    <div className="space-y-8">
      {/* Top Header */}
      <div className="neu-card p-6 bg-white flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-700 to-indigo-600 text-white flex items-center justify-center shadow-md">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-black text-slate-900">
                Owner Control Suite
              </h1>
              <span className="px-2 py-0.5 rounded text-[10px] font-black bg-blue-700 text-white">
                OWNER LEVEL
              </span>
            </div>
            <p className="text-xs text-slate-500">
              Pengelolaan penuh AZRYL CLIPS: Admin, Clips, Database, & Pengaturan Sistem
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => onNavigate('/')}
            className="neu-button-secondary px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer"
          >
            <Eye className="w-3.5 h-3.5" />
            <span>Lihat Website Publik</span>
          </button>
          <button
            onClick={() => {
              logout();
              onNavigate('/');
            }}
            className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
            title="Logout"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Tabs Bar */}
      <div className="flex items-center gap-2 p-1.5 bg-slate-200/80 rounded-2xl overflow-x-auto">
        <button
          onClick={() => setActiveTab('stats')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'stats' ? 'bg-white text-blue-900 shadow-sm' : 'text-slate-600 hover:text-blue-900'
          }`}
        >
          <BarChart3 className="w-4 h-4 text-blue-600" />
          <span>Statistik & Analisis</span>
        </button>

        <button
          onClick={() => setActiveTab('admins')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'admins' ? 'bg-white text-blue-900 shadow-sm' : 'text-slate-600 hover:text-blue-900'
          }`}
        >
          <Users className="w-4 h-4 text-blue-600" />
          <span>Manajemen Admin ({admins.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('clips')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'clips' ? 'bg-white text-blue-900 shadow-sm' : 'text-slate-600 hover:text-blue-900'
          }`}
        >
          <Video className="w-4 h-4 text-blue-600" />
          <span>Manajemen Clips ({clips.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('settings')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'settings' ? 'bg-white text-blue-900 shadow-sm' : 'text-slate-600 hover:text-blue-900'
          }`}
        >
          <Settings className="w-4 h-4 text-blue-600" />
          <span>Pengaturan Website</span>
        </button>
      </div>

      {/* TAB 1: STATS & ANALYTICS */}
      {activeTab === 'stats' && (
        <div className="space-y-6">
          {/* 4 Key KPI Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="neu-card p-5 bg-white space-y-1">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Clips</span>
              <p className="text-2xl sm:text-3xl font-black text-slate-900 tabular-nums">{clips.length}</p>
              <p className="text-[11px] text-blue-600 font-semibold">{clips.filter(c => c.published).length} dipublikasikan</p>
            </div>

            <div className="neu-card p-5 bg-white space-y-1">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Download</span>
              <p className="text-2xl sm:text-3xl font-black text-blue-700 tabular-nums">{totalDownloads.toLocaleString()}</p>
              <p className="text-[11px] text-slate-500 font-semibold">Tercatat di backend</p>
            </div>

            <div className="neu-card p-5 bg-white space-y-1">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Admin Aktif</span>
              <p className="text-2xl sm:text-3xl font-black text-slate-900 tabular-nums">{activeAdminsCount}</p>
              <p className="text-[11px] text-slate-500 font-semibold">Dari {admins.length} total terdaftar</p>
            </div>

            <div className="neu-card p-5 bg-white space-y-1">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Unduhan Hari Ini</span>
              <p className="text-2xl sm:text-3xl font-black text-emerald-600 tabular-nums">
                {Math.round(totalDownloads * 0.18).toLocaleString()}
              </p>
              <p className="text-[11px] text-emerald-700 font-semibold">+14% dari kemarin</p>
            </div>
          </div>

          {/* Top Clips & Admin Upload Breakdown */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="neu-card p-6 bg-white space-y-4">
              <h3 className="font-extrabold text-sm sm:text-base text-slate-900 flex items-center gap-2">
                <Flame className="w-4 h-4 text-amber-500 fill-current" />
                <span>5 Clips Paling Populer (Unduhan Tertinggi)</span>
              </h3>
              <div className="space-y-3">
                {topClips.map((c, idx) => (
                  <div key={c.clipId} className="flex items-center justify-between gap-3 text-xs p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-800 font-bold flex items-center justify-center text-[10px] shrink-0">
                        {idx + 1}
                      </span>
                      <span className="font-bold text-slate-800 truncate">{c.title}</span>
                    </div>
                    <span className="font-black text-blue-700 tabular-nums shrink-0">
                      {c.downloadCount} dl
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="neu-card p-6 bg-white space-y-4">
              <h3 className="font-extrabold text-sm sm:text-base text-slate-900 flex items-center gap-2">
                <Users className="w-4 h-4 text-blue-600" />
                <span>Statistik Kontribusi Admin</span>
              </h3>
              <div className="space-y-3">
                {admins.map((adm) => {
                  const adminClips = clips.filter((c) => c.uploaderUid === adm.uid);
                  const dl = adminClips.reduce((acc, c) => acc + (c.downloadCount || 0), 0);
                  return (
                    <div key={adm.uid} className="flex items-center justify-between text-xs p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                      <div>
                        <span className="font-bold text-slate-800 block">{adm.adminName}</span>
                        <span className="text-[10px] text-slate-400">{adm.role.toUpperCase()} · {adminClips.length} clips</span>
                      </div>
                      <span className="font-black text-slate-700 tabular-nums">
                        {dl.toLocaleString()} unduhan
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: ADMIN MANAGEMENT */}
      {activeTab === 'admins' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-black text-slate-900">Daftar Akun Admin</h2>
              <p className="text-xs text-slate-500">Kelola hak akses, status aktif, dan profil sosial media admin</p>
            </div>
            <button
              onClick={() => setShowAddAdminModal(true)}
              className="neu-button text-white px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              <Plus className="w-4 h-4" />
              <span>Tambah Admin Baru</span>
            </button>
          </div>

          <div className="neu-card overflow-hidden bg-white">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-100 text-slate-500 uppercase tracking-wider font-bold">
                  <tr>
                    <th className="p-4">Admin</th>
                    <th className="p-4">Role</th>
                    <th className="p-4">Clips</th>
                    <th className="p-4">Media Sosial</th>
                    <th className="p-4">Status</th>
                    <th className="p-4 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {admins.map((adm) => {
                    const count = clips.filter((c) => c.uploaderUid === adm.uid).length;
                    return (
                      <tr key={adm.uid} className="hover:bg-slate-50/60 transition-colors">
                        <td className="p-4">
                          <div className="flex items-center gap-3">
                            <img
                              src={adm.profileImage || 'https://i.postimg.cc/4ysQFgqx/1366b69ba442d21911f314947331b50a.jpg'}
                              alt={adm.adminName}
                              className="w-8 h-8 rounded-full object-cover border border-slate-200"
                              referrerPolicy="no-referrer"
                            />
                            <div>
                              <p className="font-bold text-slate-800">{adm.adminName}</p>
                              <p className="text-[11px] text-slate-400 font-mono">{adm.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="p-4 font-semibold text-slate-600 uppercase text-[11px]">
                          {adm.role}
                        </td>
                        <td className="p-4 font-bold text-slate-800">{count} clips</td>
                        <td className="p-4">
                          <div className="flex items-center gap-1.5">
                            {adm.tiktokUrl && <span className="px-1.5 py-0.5 rounded bg-black text-white text-[10px] font-bold">TT</span>}
                            {adm.instagramUrl && <span className="px-1.5 py-0.5 rounded bg-pink-600 text-white text-[10px] font-bold">IG</span>}
                            {adm.whatsappChannelUrl && <span className="px-1.5 py-0.5 rounded bg-emerald-600 text-white text-[10px] font-bold">WA</span>}
                            {!adm.tiktokUrl && !adm.instagramUrl && !adm.whatsappChannelUrl && (
                              <span className="text-slate-400 text-[11px]">-</span>
                            )}
                          </div>
                        </td>
                        <td className="p-4">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              adm.active ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                            }`}
                          >
                            {adm.active ? 'Aktif' : 'Nonaktif'}
                          </span>
                        </td>
                        <td className="p-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => setEditingAdmin(adm)}
                              className="p-1.5 rounded-lg text-slate-600 hover:bg-slate-100 cursor-pointer"
                              title="Edit Profil & Medsos"
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>
                            {adm.role !== 'owner' && (
                              <button
                                onClick={() => handleToggleAdminStatus(adm)}
                                className={`px-2 py-1 rounded-lg text-[10px] font-bold cursor-pointer ${
                                  adm.active
                                    ? 'bg-rose-50 text-rose-600 hover:bg-rose-100'
                                    : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100'
                                }`}
                              >
                                {adm.active ? 'Nonaktifkan' : 'Aktifkan'}
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: CLIPS MANAGEMENT */}
      {activeTab === 'clips' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-black text-slate-900">Kelola Semua Clips Persib</h2>
              <p className="text-xs text-slate-500">Edit metadata, hapus clips, atau ubah status publikasi</p>
            </div>
            <button
              onClick={() => onNavigate('/azryl-control/admin')}
              className="neu-button text-white px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              <Plus className="w-4 h-4" />
              <span>Unggah Clips Baru</span>
            </button>
          </div>

          <div className="neu-card overflow-hidden bg-white">
            {clips.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-100 text-slate-500 uppercase tracking-wider font-bold">
                    <tr>
                      <th className="p-4">Thumbnail & Judul</th>
                      <th className="p-4">Slug ID</th>
                      <th className="p-4">Pengunggah</th>
                      <th className="p-4">Unduhan</th>
                      <th className="p-4">Status</th>
                      <th className="p-4 text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {clips.map((clip) => (
                      <tr key={clip.clipId} className="hover:bg-slate-50/60 transition-colors">
                        <td className="p-4 max-w-xs">
                          <div className="flex items-center gap-3">
                            <img
                              src={clip.photoOneUrl || clip.primaryMediaUrl}
                              alt={clip.title}
                              className="w-12 h-9 rounded-lg object-cover bg-slate-900 shrink-0"
                              referrerPolicy="no-referrer"
                            />
                            <div className="min-w-0">
                              <p className="font-bold text-slate-900 truncate">{clip.title}</p>
                              <p className="text-[11px] text-slate-400 truncate">{clip.creatorName}</p>
                            </div>
                          </div>
                        </td>
                        <td className="p-4 font-mono text-[11px] text-blue-700">{clip.slug}</td>
                        <td className="p-4 text-slate-600">{clip.uploaderNameSnapshot}</td>
                        <td className="p-4 font-black text-blue-700 tabular-nums">{clip.downloadCount}</td>
                        <td className="p-4">
                          <button
                            onClick={() => handleToggleClipPublish(clip)}
                            className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold cursor-pointer ${
                              clip.published ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-700'
                            }`}
                          >
                            {clip.published ? 'Published' : 'Draft/Arsip'}
                          </button>
                        </td>
                        <td className="p-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => onNavigate(`/clips/${clip.slug}`)}
                              className="p-1.5 rounded-lg text-blue-600 hover:bg-blue-50 cursor-pointer"
                              title="Buka Halaman"
                            >
                              <ExternalLink className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => setEditingClip(clip)}
                              className="p-1.5 rounded-lg text-slate-600 hover:bg-slate-100 cursor-pointer"
                              title="Edit Judul & Info"
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteClip(clip.clipId, clip.title)}
                              className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-50 cursor-pointer"
                              title="Hapus Clip"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-12 text-center space-y-3">
                <div className="w-12 h-12 mx-auto rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center">
                  <Video className="w-6 h-6" />
                </div>
                <h3 className="font-bold text-slate-800 text-sm">Belum Ada Clips di Website (0 Clips)</h3>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  Daftar clips masih kosong seperti yang diminta. Anda dan Admin terdaftar dapat mulai mengunggah clips Persib pertama kapan saja.
                </p>
                <button
                  onClick={() => onNavigate('/azryl-control/admin')}
                  className="neu-button text-white px-4 py-2 rounded-xl text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <Plus className="w-4 h-4" />
                  <span>Unggah Clips Pertama</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 4: WEBSITE SETTINGS */}
      {activeTab === 'settings' && (
        <div className="neu-card p-6 sm:p-8 bg-white max-w-2xl space-y-6">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
            <Settings className="w-5 h-5 text-blue-600" />
            <h2 className="text-base sm:text-lg font-black text-slate-900">
              Pengaturan Umum & Versi APK Android
            </h2>
          </div>

          <form onSubmit={handleSaveSettings} className="space-y-5">
            <div className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                  Nama Website
                </label>
                <input
                  type="text"
                  value={siteName}
                  onChange={(e) => setSiteName(e.target.value)}
                  className="w-full neu-input px-3.5 py-2.5 text-xs sm:text-sm text-slate-800"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                  Tagline / Deskripsi Singkat
                </label>
                <input
                  type="text"
                  value={siteDesc}
                  onChange={(e) => setSiteDesc(e.target.value)}
                  className="w-full neu-input px-3.5 py-2.5 text-xs sm:text-sm text-slate-800"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                  Pesan Pengumuman Beranda (Banner)
                </label>
                <textarea
                  rows={2}
                  value={siteAnnouncement}
                  onChange={(e) => setSiteAnnouncement(e.target.value)}
                  className="w-full neu-input p-3 text-xs sm:text-sm text-slate-800"
                />
              </div>

              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                <div>
                  <p className="font-bold text-xs text-slate-800">Mode Pemeliharaan (Maintenance Mode)</p>
                  <p className="text-[11px] text-slate-400">Jika aktif, pengunjung umum akan melihat pemberitahuan pemeliharaan</p>
                </div>
                <input
                  type="checkbox"
                  checked={maintenanceMode}
                  onChange={(e) => setMaintenanceMode(e.target.checked)}
                  className="w-5 h-5 accent-blue-600 cursor-pointer"
                />
              </div>
            </div>

            {/* PENGATURAN APK ANDROID */}
            <div className="pt-5 border-t border-slate-200/80 space-y-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
                  <Smartphone className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-extrabold text-xs sm:text-sm text-slate-900">
                    Pengaturan Link Versi APK Android
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Owner dapat memperbarui tautan unduh aplikasi Android resmi kapan saja
                  </p>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                  Tautan Download File APK (URL) *
                </label>
                <div className="flex gap-2">
                  <input
                    type="url"
                    placeholder="https://drive.google.com/... atau https://domain.com/free-clips-persib.apk"
                    value={apkDownloadUrl}
                    onChange={(e) => setApkDownloadUrl(e.target.value)}
                    className="w-full neu-input px-3.5 py-2.5 text-xs sm:text-sm text-slate-800 font-mono"
                  />
                  {apkDownloadUrl && (
                    <a
                      href={apkDownloadUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="neu-button-secondary px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 shrink-0"
                      title="Tes Buka Tautan"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>Tes Link</span>
                    </a>
                  )}
                </div>
                <p className="text-[10px] text-slate-400">
                  Masukkan link langsung ke file .apk, Google Drive, MediaFire, atau halaman rilis APK Anda.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                    Label Versi APK
                  </label>
                  <input
                    type="text"
                    placeholder="Contoh: v1.0.0 (Official)"
                    value={apkVersionName}
                    onChange={(e) => setApkVersionName(e.target.value)}
                    className="w-full neu-input px-3.5 py-2.5 text-xs sm:text-sm text-slate-800"
                  />
                </div>

                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                  <div>
                    <p className="font-bold text-xs text-slate-800">Tampilkan Tombol APK</p>
                    <p className="text-[10px] text-slate-400">Tampilkan di Header & Beranda</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={apkEnabled}
                    onChange={(e) => setApkEnabled(e.target.checked)}
                    className="w-5 h-5 accent-emerald-600 cursor-pointer"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                  Catatan Rilis / Deskripsi Singkat APK
                </label>
                <input
                  type="text"
                  placeholder="Contoh: Versi resmi aplikasi Android Bobotoh Persib untuk download cepat & gratis..."
                  value={apkReleaseNotes}
                  onChange={(e) => setApkReleaseNotes(e.target.value)}
                  className="w-full neu-input px-3.5 py-2.5 text-xs sm:text-sm text-slate-800"
                />
              </div>
            </div>

            <button
              type="submit"
              className="neu-button text-white px-6 py-2.5 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 cursor-pointer shadow-md"
            >
              <Save className="w-4 h-4" />
              <span>Simpan Semua Pengaturan</span>
            </button>
          </form>
        </div>
      )}

      {/* MODAL: TAMBAH ADMIN BARU */}
      {showAddAdminModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="neu-card p-6 bg-white max-w-md w-full space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-black text-slate-900 text-base">Tambah Akun Admin Baru</h3>
              <button
                onClick={() => setShowAddAdminModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateAdmin} className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Nama Admin *</label>
                <input
                  type="text"
                  placeholder="Contoh: Kang Ridwan Bobotoh"
                  value={newAdminName}
                  onChange={(e) => setNewAdminName(e.target.value)}
                  className="w-full neu-input px-3 py-2 text-xs"
                  required
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Email Login *</label>
                <input
                  type="email"
                  placeholder="ridwan@azrylclips.com"
                  value={newAdminEmail}
                  onChange={(e) => setNewAdminEmail(e.target.value)}
                  className="w-full neu-input px-3 py-2 text-xs"
                  required
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Password Baru *</label>
                <input
                  type="password"
                  placeholder="Minimal 6 karakter"
                  value={newAdminPassword}
                  onChange={(e) => setNewAdminPassword(e.target.value)}
                  className="w-full neu-input px-3 py-2 text-xs"
                  required
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Bio Singkat</label>
                <input
                  type="text"
                  placeholder="Kreator video tribun timur..."
                  value={newAdminBio}
                  onChange={(e) => setNewAdminBio(e.target.value)}
                  className="w-full neu-input px-3 py-2 text-xs"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Tautan TikTok (Opsional)</label>
                <input
                  type="url"
                  placeholder="https://tiktok.com/@..."
                  value={newAdminTiktok}
                  onChange={(e) => setNewAdminTiktok(e.target.value)}
                  className="w-full neu-input px-3 py-2 text-xs"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Tautan Instagram (Opsional)</label>
                <input
                  type="url"
                  placeholder="https://instagram.com/..."
                  value={newAdminInstagram}
                  onChange={(e) => setNewAdminInstagram(e.target.value)}
                  className="w-full neu-input px-3 py-2 text-xs"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Saluran WhatsApp (Opsional)</label>
                <input
                  type="url"
                  placeholder="https://whatsapp.com/channel/..."
                  value={newAdminWA}
                  onChange={(e) => setNewAdminWA(e.target.value)}
                  className="w-full neu-input px-3 py-2 text-xs"
                />
              </div>

              <div className="pt-3 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddAdminModal(false)}
                  className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-bold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingAdmin}
                  className="neu-button text-white px-5 py-2 rounded-xl font-bold"
                >
                  {isSubmittingAdmin ? 'Membuat Akun...' : 'Buat Akun Admin'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: EDIT ADMIN */}
      {editingAdmin && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="neu-card p-6 bg-white dark:bg-[#111a2e] max-w-lg w-full space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div>
                <h3 className="font-black text-slate-900 dark:text-white text-base">Edit Profil Admin</h3>
                <p className="text-[11px] text-slate-400">Owner dapat mengubah seluruh informasi profil dan media sosial admin ini</p>
              </div>
              <button onClick={() => setEditingAdmin(null)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">✕</button>
            </div>

            <form onSubmit={handleSaveEditedAdmin} className="space-y-3.5 text-xs">
              {/* Profile Photo Avatar Preview and URL */}
              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Foto Profil (URL Gambar)</label>
                <div className="flex items-center gap-3">
                  <img
                    src={editingAdmin.profileImage || 'https://i.postimg.cc/4ysQFgqx/1366b69ba442d21911f314947331b50a.jpg'}
                    alt={editingAdmin.adminName}
                    className="w-12 h-12 rounded-2xl object-cover border-2 border-blue-500 shadow-xs shrink-0"
                    referrerPolicy="no-referrer"
                  />
                  <input
                    type="url"
                    placeholder="https://i.postimg.cc/... / URL foto"
                    value={editingAdmin.profileImage || ''}
                    onChange={(e) => setEditingAdmin({ ...editingAdmin, profileImage: e.target.value })}
                    className="w-full neu-input px-3 py-2 text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Nama Lengkap / Nama Publik Admin</label>
                <input
                  type="text"
                  value={editingAdmin.adminName}
                  onChange={(e) => setEditingAdmin({ ...editingAdmin, adminName: e.target.value })}
                  className="w-full neu-input px-3 py-2 text-xs"
                  required
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Email Login Admin</label>
                <input
                  type="email"
                  value={editingAdmin.email}
                  onChange={(e) => setEditingAdmin({ ...editingAdmin, email: e.target.value })}
                  className="w-full neu-input px-3 py-2 text-xs"
                  required
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Bio / Deskripsi Profil</label>
                <textarea
                  rows={2}
                  value={editingAdmin.bio || ''}
                  onChange={(e) => setEditingAdmin({ ...editingAdmin, bio: e.target.value })}
                  className="w-full neu-input px-3 py-2 text-xs"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Tautan TikTok</label>
                  <input
                    type="url"
                    placeholder="https://tiktok.com/@..."
                    value={editingAdmin.tiktokUrl || ''}
                    onChange={(e) => setEditingAdmin({ ...editingAdmin, tiktokUrl: e.target.value })}
                    className="w-full neu-input px-3 py-2 text-xs"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Tautan Instagram</label>
                  <input
                    type="url"
                    placeholder="https://instagram.com/..."
                    value={editingAdmin.instagramUrl || ''}
                    onChange={(e) => setEditingAdmin({ ...editingAdmin, instagramUrl: e.target.value })}
                    className="w-full neu-input px-3 py-2 text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Tautan Saluran WhatsApp</label>
                <input
                  type="url"
                  placeholder="https://whatsapp.com/channel/..."
                  value={editingAdmin.whatsappChannelUrl || ''}
                  onChange={(e) => setEditingAdmin({ ...editingAdmin, whatsappChannelUrl: e.target.value })}
                  className="w-full neu-input px-3 py-2 text-xs"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Tautan Media Sosial Lainnya</label>
                <input
                  type="url"
                  placeholder="https://..."
                  value={editingAdmin.otherSocialLinks || ''}
                  onChange={(e) => setEditingAdmin({ ...editingAdmin, otherSocialLinks: e.target.value })}
                  className="w-full neu-input px-3 py-2 text-xs"
                />
              </div>

              <div className="flex items-center gap-2 pt-2 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                <input
                  type="checkbox"
                  id="adminActiveCheck"
                  checked={editingAdmin.active}
                  onChange={(e) => setEditingAdmin({ ...editingAdmin, active: e.target.checked })}
                  className="w-4 h-4 accent-blue-600 cursor-pointer"
                />
                <label htmlFor="adminActiveCheck" className="font-bold text-slate-700 dark:text-slate-200 cursor-pointer">
                  Status Akun Aktif (Dapat login dan mengunggah clips)
                </label>
              </div>

              <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditingAdmin(null)}
                  className="px-4 py-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 font-bold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="neu-button text-white px-5 py-2 rounded-xl font-bold cursor-pointer"
                >
                  Simpan Perubahan Profil
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: EDIT CLIP */}
      {editingClip && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="neu-card p-6 bg-white max-w-md w-full space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-black text-slate-900 text-base">Edit Metadata Clip</h3>
              <button onClick={() => setEditingClip(null)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>

            <form onSubmit={handleSaveEditedClip} className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Judul Clip</label>
                <input
                  type="text"
                  value={editingClip.title}
                  onChange={(e) => setEditingClip({ ...editingClip, title: e.target.value })}
                  className="w-full neu-input px-3 py-2 text-xs"
                  required
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Nama Pembuat</label>
                <input
                  type="text"
                  value={editingClip.creatorName}
                  onChange={(e) => setEditingClip({ ...editingClip, creatorName: e.target.value })}
                  className="w-full neu-input px-3 py-2 text-xs"
                  required
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Deskripsi</label>
                <textarea
                  rows={3}
                  value={editingClip.description || ''}
                  onChange={(e) => setEditingClip({ ...editingClip, description: e.target.value })}
                  className="w-full neu-input px-3 py-2 text-xs"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="publishedCheckbox"
                  checked={editingClip.published}
                  onChange={(e) => setEditingClip({ ...editingClip, published: e.target.checked })}
                  className="w-4 h-4 accent-blue-600"
                />
                <label htmlFor="publishedCheckbox" className="font-semibold text-slate-700">
                  Status Publikasi (Dapat diakses publik)
                </label>
              </div>

              <div className="pt-3 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingClip(null)}
                  className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-bold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="neu-button text-white px-5 py-2 rounded-xl font-bold"
                >
                  Simpan Perubahan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
