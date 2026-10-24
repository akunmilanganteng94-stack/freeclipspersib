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
  Eye,
  ExternalLink,
  Save,
  LogOut,
  Flame,
  Download,
  AlertTriangle,
  Lock,
  Smartphone,
  UploadCloud,
  Film,
  Image as ImageIcon,
  X,
  Search,
  User,
  Heart,
  MessageCircle,
  Camera,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { UserProfile, ClipItem, SiteSettings } from '../types';
import {
  saveUserProfile,
  deleteUserProfile,
  updateClip,
  deleteClip,
  updateSiteSettings,
  uploadMediaFile,
  createNewClip,
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

  // Tab State: 'clips' | 'upload' | 'admins' | 'settings'
  const [activeTab, setActiveTab] = useState<'clips' | 'upload' | 'admins' | 'settings'>('clips');

  // Search & Filter for All Clips
  const [clipSearchQuery, setClipSearchQuery] = useState('');
  const [clipMediaFilter, setClipMediaFilter] = useState<'all' | 'video' | 'photo'>('all');

  // Admin management state
  const [showAddAdminModal, setShowAddAdminModal] = useState(false);
  const [newAdminEmail, setNewAdminEmail] = useState('');
  const [newAdminPassword, setNewAdminPassword] = useState('');
  const [newAdminName, setNewAdminName] = useState('');
  const [newAdminBio, setNewAdminBio] = useState('');
  const [newAdminProfileImage, setNewAdminProfileImage] = useState('');
  const [newAdminTiktok, setNewAdminTiktok] = useState('');
  const [newAdminInstagram, setNewAdminInstagram] = useState('');
  const [newAdminWA, setNewAdminWA] = useState('');
  const [isSubmittingAdmin, setIsSubmittingAdmin] = useState(false);

  // Edit Admin modal state
  const [editingAdmin, setEditingAdmin] = useState<UserProfile | null>(null);

  // Edit Clip modal state
  const [editingClip, setEditingClip] = useState<ClipItem | null>(null);

  // Upload Form states (Owner direct upload)
  const [creatorName, setCreatorName] = useState(userProfile?.adminName || 'Azryl (Owner)');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [primaryMediaType, setPrimaryMediaType] = useState<'video' | 'photo'>('video');
  const [primaryFile, setPrimaryFile] = useState<File | null>(null);
  const [primaryPreview, setPrimaryPreview] = useState<string | null>(null);
  const [photoOneFile, setPhotoOneFile] = useState<File | null>(null);
  const [photoOnePreview, setPhotoOnePreview] = useState<string | null>(null);
  const [photoTwoFile, setPhotoTwoFile] = useState<File | null>(null);
  const [photoTwoPreview, setPhotoTwoPreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  // Owner Self Profile Edit states
  const [ownerName, setOwnerName] = useState(userProfile?.adminName || 'Azryl (Owner)');
  const [ownerAvatar, setOwnerAvatar] = useState(userProfile?.profileImage || '');
  const [ownerBio, setOwnerBio] = useState(userProfile?.bio || '');
  const [ownerTiktok, setOwnerTiktok] = useState(userProfile?.tiktokUrl || '');
  const [ownerInstagram, setOwnerInstagram] = useState(userProfile?.instagramUrl || '');
  const [ownerWA, setOwnerWA] = useState(userProfile?.whatsappChannelUrl || '');
  const [isSavingOwnerProfile, setIsSavingOwnerProfile] = useState(false);

  // Site settings state
  const [siteName, setSiteName] = useState(siteSettings.siteName || 'FREE CLIPS PERSIB');
  const [siteDesc, setSiteDesc] = useState(siteSettings.description || 'Free Persib Bandung Clips');
  const [siteAnnouncement, setSiteAnnouncement] = useState(siteSettings.announcement || '');
  const [maintenanceMode, setMaintenanceMode] = useState(siteSettings.maintenanceMode || false);

  // APK Version state
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

  // Filtered Clips for Tab All Clips
  const filteredClips = useMemo(() => {
    return clips.filter((c) => {
      const matchSearch =
        !clipSearchQuery.trim() ||
        c.title.toLowerCase().includes(clipSearchQuery.toLowerCase()) ||
        c.creatorName.toLowerCase().includes(clipSearchQuery.toLowerCase()) ||
        c.uploaderNameSnapshot.toLowerCase().includes(clipSearchQuery.toLowerCase());
      const matchMedia = clipMediaFilter === 'all' || c.primaryMediaType === clipMediaFilter;
      return matchSearch && matchMedia;
    });
  }, [clips, clipSearchQuery, clipMediaFilter]);

  // Upload avatar helper (for Owner or Admin avatar file upload)
  const uploadAvatarFile = async (file: File): Promise<string> => {
    if (!file.type.startsWith('image/')) {
      throw new Error('File harus berupa foto/gambar!');
    }
    const avatarPath = `avatars/admin_${Date.now()}_${file.name}`;
    try {
      const url = await uploadMediaFile(file, avatarPath);
      return url;
    } catch {
      return URL.createObjectURL(file);
    }
  };

  // Create Admin Account
  const handleCreateAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAdminEmail || !newAdminPassword || !newAdminName) {
      onShowToast('Harap isi semua kolom wajib!', 'error');
      return;
    }

    setIsSubmittingAdmin(true);
    try {
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

      const newAdminProfile: UserProfile = {
        uid: adminUid,
        email: newAdminEmail.trim(),
        role: 'admin',
        adminName: newAdminName.trim(),
        profileImage: newAdminProfileImage.trim() || 'https://i.postimg.cc/4ysQFgqx/1366b69ba442d21911f314947331b50a.jpg',
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

      setShowAddAdminModal(false);
      setNewAdminEmail('');
      setNewAdminPassword('');
      setNewAdminName('');
      setNewAdminBio('');
      setNewAdminProfileImage('');
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

  // DELETE Admin (Owner action)
  const handleDeleteAdmin = async (admin: UserProfile) => {
    if (admin.role === 'owner') {
      onShowToast('Akun Founder / Owner tidak dapat dihapus!', 'error');
      return;
    }
    if (!window.confirm(`Hapus permanen akun admin "${admin.adminName}" (${admin.email})?\nTindakan ini tidak dapat dibatalkan.`)) {
      return;
    }
    try {
      await deleteUserProfile(admin.uid);
      onShowToast(`Akun admin ${admin.adminName} berhasil dihapus!`, 'success');
    } catch (err: any) {
      onShowToast('Gagal menghapus admin: ' + (err.message || 'Kesalahan sistem'), 'error');
    }
  };

  // Save edited admin profile (Owner action)
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

  // Save Owner Self Profile
  const handleSaveOwnerProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userProfile) return;
    setIsSavingOwnerProfile(true);
    try {
      const updatedOwner: UserProfile = {
        ...userProfile,
        adminName: ownerName.trim(),
        profileImage: ownerAvatar.trim() || 'https://i.postimg.cc/4ysQFgqx/1366b69ba442d21911f314947331b50a.jpg',
        bio: ownerBio.trim(),
        tiktokUrl: ownerTiktok.trim(),
        instagramUrl: ownerInstagram.trim(),
        whatsappChannelUrl: ownerWA.trim(),
        updatedAt: new Date().toISOString(),
      };
      await saveUserProfile(updatedOwner);
      onShowToast('Profil Owner berhasil disimpan!', 'success');
    } catch (err: any) {
      onShowToast('Gagal menyimpan profil: ' + (err.message || 'Terjadi kesalahan'), 'error');
    } finally {
      setIsSavingOwnerProfile(false);
    }
  };

  // Upload Clips by Owner
  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!creatorName.trim() || !title.trim() || !primaryFile || !photoOneFile || !photoTwoFile) {
      onShowToast('Harap lengkapi semua kolom wajib dan file!', 'error');
      return;
    }
    setIsUploading(true);
    setUploadProgress(15);
    onShowToast('Memulai upload 3 media clips...', 'info');

    try {
      const prefix = 'owner';
      const randomCode = Math.floor(100 + Math.random() * 900);
      const generatedSlug = `${prefix}-${randomCode}`;

      setUploadProgress(30);
      const primaryPath = `clips/${userProfile?.uid || 'owner'}/${generatedSlug}/primary_${primaryFile.name}`;
      const primaryUrl = await uploadMediaFile(primaryFile, primaryPath, (pct) => {
        setUploadProgress(30 + Math.floor(pct * 0.25));
      });

      setUploadProgress(60);
      const photoOnePath = `clips/${userProfile?.uid || 'owner'}/${generatedSlug}/photo1_${photoOneFile.name}`;
      const photoOneUrl = await uploadMediaFile(photoOneFile, photoOnePath, (pct) => {
        setUploadProgress(60 + Math.floor(pct * 0.2));
      });

      setUploadProgress(80);
      const photoTwoPath = `clips/${userProfile?.uid || 'owner'}/${generatedSlug}/photo2_${photoTwoFile.name}`;
      const photoTwoUrl = await uploadMediaFile(photoTwoFile, photoTwoPath, (pct) => {
        setUploadProgress(80 + Math.floor(pct * 0.2));
      });

      setUploadProgress(95);
      await createNewClip({
        slug: generatedSlug,
        title: title.trim(),
        creatorName: creatorName.trim(),
        description: description.trim(),
        uploaderUid: userProfile?.uid || 'owner-uid',
        uploaderNameSnapshot: userProfile?.adminName || 'Azryl (Owner)',
        primaryMediaType,
        primaryMediaUrl: primaryUrl,
        primaryMediaPath: primaryPath,
        photoOneUrl,
        photoOnePath,
        photoTwoUrl,
        photoTwoPath,
        published: true,
      });

      setUploadProgress(100);
      onShowToast(`Clips "${title}" berhasil diunggah dan langsung tayang!`, 'success');

      setTitle('');
      setDescription('');
      setPrimaryFile(null);
      setPrimaryPreview(null);
      setPhotoOneFile(null);
      setPhotoOnePreview(null);
      setPhotoTwoFile(null);
      setPhotoTwoPreview(null);

      setActiveTab('clips');
    } catch (err: any) {
      onShowToast(`Upload gagal: ${err.message || 'Terjadi kesalahan'}`, 'error');
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
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
    if (!window.confirm(`Hapus permanen clip "${clipTitle}"?`)) return;
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
    <div className="space-y-4 pb-28 md:pb-12 max-w-7xl mx-auto w-full px-2 sm:px-4">
      {/* 1. Sleek Minimal Top Bar (Panel besar dihapus agar tidak terpotong di mobile) */}
      <div className="flex items-center justify-between gap-2 px-1 py-1">
        <div className="flex items-center gap-2 min-w-0">
          <span className="font-black text-sm sm:text-base text-slate-900 tracking-tight truncate">
            Owner Control Suite
          </span>
          <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-blue-700 text-white shrink-0">
            OWNER
          </span>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <button
            onClick={() => onNavigate('/')}
            className="p-1.5 rounded-xl text-slate-600 hover:text-blue-700 hover:bg-white transition-colors cursor-pointer"
            title="Lihat Website Publik"
          >
            <ExternalLink className="w-4 h-4" />
          </button>
          <button
            onClick={() => {
              logout();
              onNavigate('/');
            }}
            className="p-1.5 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
            title="Keluar"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 2. Desktop Navigation Pills */}
      <div className="hidden sm:flex items-center gap-1.5 p-1 bg-slate-200/80 rounded-2xl w-full">
        <button
          onClick={() => setActiveTab('clips')}
          className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs sm:text-sm font-extrabold transition-all cursor-pointer ${
            activeTab === 'clips' ? 'bg-white text-blue-900 shadow-sm' : 'text-slate-600 hover:text-blue-900'
          }`}
        >
          <Video className="w-4 h-4 text-blue-600" />
          <span>All Clips ({clips.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('upload')}
          className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs sm:text-sm font-extrabold transition-all cursor-pointer ${
            activeTab === 'upload' ? 'bg-white text-blue-900 shadow-sm' : 'text-slate-600 hover:text-blue-900'
          }`}
        >
          <Plus className="w-4 h-4 text-blue-600" />
          <span>Tambahkan Clips</span>
        </button>

        <button
          onClick={() => setActiveTab('admins')}
          className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs sm:text-sm font-extrabold transition-all cursor-pointer ${
            activeTab === 'admins' ? 'bg-white text-blue-900 shadow-sm' : 'text-slate-600 hover:text-blue-900'
          }`}
        >
          <Users className="w-4 h-4 text-blue-600" />
          <span>Kelola Akun ({admins.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('settings')}
          className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs sm:text-sm font-extrabold transition-all cursor-pointer ${
            activeTab === 'settings' ? 'bg-white text-blue-900 shadow-sm' : 'text-slate-600 hover:text-blue-900'
          }`}
        >
          <Settings className="w-4 h-4 text-blue-600" />
          <span>Pengaturan &amp; Statistik</span>
        </button>
      </div>

      {/* 3. TAB 1: ALL CLIPS */}
      {activeTab === 'clips' && (
        <section className="space-y-4">
          <div className="neu-card p-3 sm:p-4 bg-white space-y-3 border border-slate-100">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="relative w-full sm:flex-1">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Cari clips..."
                  value={clipSearchQuery}
                  onChange={(e) => setClipSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-blue-600 focus:bg-white transition-colors"
                />
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
                <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-xl">
                  <button
                    onClick={() => setClipMediaFilter('all')}
                    className={`px-2.5 py-1 text-xs font-bold rounded-lg cursor-pointer ${
                      clipMediaFilter === 'all' ? 'bg-blue-600 text-white' : 'text-slate-600'
                    }`}
                  >
                    Semua
                  </button>
                  <button
                    onClick={() => setClipMediaFilter('video')}
                    className={`px-2.5 py-1 text-xs font-bold rounded-lg cursor-pointer ${
                      clipMediaFilter === 'video' ? 'bg-blue-600 text-white' : 'text-slate-600'
                    }`}
                  >
                    Video
                  </button>
                  <button
                    onClick={() => setClipMediaFilter('photo')}
                    className={`px-2.5 py-1 text-xs font-bold rounded-lg cursor-pointer ${
                      clipMediaFilter === 'photo' ? 'bg-blue-600 text-white' : 'text-slate-600'
                    }`}
                  >
                    Foto
                  </button>
                </div>

                <button
                  onClick={() => setActiveTab('upload')}
                  className="neu-button text-white px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1 shrink-0"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Tambah</span>
                </button>
              </div>
            </div>
          </div>

          {/* Clips Table / Cards List */}
          <div className="neu-card overflow-hidden bg-white border border-slate-100">
            {filteredClips.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs min-w-[620px]">
                  <thead className="bg-slate-50 border-b border-slate-100 text-slate-500 uppercase tracking-wider font-bold">
                    <tr>
                      <th className="p-3.5">Thumbnail &amp; Judul</th>
                      <th className="p-3.5">Slug ID</th>
                      <th className="p-3.5">Pengunggah</th>
                      <th className="p-3.5">Unduhan</th>
                      <th className="p-3.5">Status</th>
                      <th className="p-3.5 text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredClips.map((clip) => (
                      <tr key={clip.clipId} className="hover:bg-slate-50/70 transition-colors">
                        <td className="p-3.5 max-w-xs">
                          <div className="flex items-center gap-3">
                            <img
                              src={clip.photoOneUrl || clip.primaryMediaUrl}
                              alt={clip.title}
                              className="w-12 h-9 rounded-lg object-cover bg-slate-900 shrink-0"
                              referrerPolicy="no-referrer"
                            />
                            <div className="min-w-0">
                              <p className="font-bold text-slate-900 truncate">{clip.title}</p>
                              <p className="text-[10px] text-slate-400 truncate">{clip.creatorName}</p>
                            </div>
                          </div>
                        </td>
                        <td className="p-3.5 font-mono text-[11px] text-blue-700">{clip.slug}</td>
                        <td className="p-3.5 text-slate-700 font-semibold">{clip.uploaderNameSnapshot}</td>
                        <td className="p-3.5 font-black text-blue-700 tabular-nums">{clip.downloadCount} dl</td>
                        <td className="p-3.5">
                          <button
                            onClick={() => handleToggleClipPublish(clip)}
                            className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold cursor-pointer transition-transform active:scale-95 ${
                              clip.published
                                ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                                : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                            }`}
                            title="Klik untuk ubah status publikasi"
                          >
                            {clip.published ? 'Published' : 'Draft'}
                          </button>
                        </td>
                        <td className="p-3.5 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => onNavigate(`/clips/${clip.slug}`)}
                              className="p-1.5 rounded-lg text-blue-600 hover:bg-blue-50 cursor-pointer"
                              title="Buka Halaman Publik"
                            >
                              <ExternalLink className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => setEditingClip(clip)}
                              className="p-1.5 rounded-lg text-slate-600 hover:bg-slate-100 cursor-pointer"
                              title="Edit Info Clip"
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
              <div className="p-10 text-center space-y-3">
                <Video className="w-10 h-10 text-blue-500 mx-auto" />
                <h3 className="font-bold text-sm text-slate-800">Tidak ada clips ditemukan</h3>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  Belum ada clips yang cocok dengan filter atau kata kunci pencarian.
                </p>
              </div>
            )}
          </div>
        </section>
      )}

      {/* 4. TAB 2: TAMBAHKAN CLIPS (Upload Langsung dari Owner) */}
      {activeTab === 'upload' && (
        <section className="neu-card p-4 sm:p-6 bg-white space-y-5 max-w-3xl mx-auto border border-blue-100">
          <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
            <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-xs">
              <UploadCloud className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-black text-slate-900">
                Tambahkan Item Clips (Owner Upload)
              </h2>
              <p className="text-[11px] text-slate-400">
                Unggah video/foto aksi Persib Bandung lengkap dengan 2 foto pendukung
              </p>
            </div>
          </div>

          <form onSubmit={handleUploadSubmit} className="space-y-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                1. Nama Pembuat Clips *
              </label>
              <input
                type="text"
                value={creatorName}
                onChange={(e) => setCreatorName(e.target.value)}
                className="w-full neu-input px-3.5 py-2 text-xs sm:text-sm text-slate-800"
                required
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                2. Judul Clips *
              </label>
              <input
                type="text"
                placeholder="Contoh: Gol Menit Berdarah Persib Bandung vs Persija"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full neu-input px-3.5 py-2 text-xs sm:text-sm text-slate-800"
                required
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                3. Deskripsi Clips (Opsional)
              </label>
              <textarea
                rows={2}
                placeholder="Tuliskan keterangan momen pertandingan atau pesan..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full neu-input p-2.5 text-xs sm:text-sm text-slate-800"
              />
            </div>

            {/* Media Utama */}
            <div className="p-3.5 rounded-2xl bg-blue-50/50 border border-blue-100 space-y-2.5">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <label className="text-xs font-bold text-blue-950 flex items-center gap-1.5">
                  {primaryMediaType === 'video' ? <Film className="w-4 h-4 text-blue-600" /> : <ImageIcon className="w-4 h-4 text-blue-600" />}
                  <span>Media Utama ({primaryMediaType === 'video' ? 'Video' : 'Foto'}) *</span>
                </label>
                <div className="flex items-center gap-1 p-0.5 bg-white rounded-lg border border-blue-200">
                  <button
                    type="button"
                    onClick={() => {
                      setPrimaryMediaType('video');
                      setPrimaryFile(null);
                      setPrimaryPreview(null);
                    }}
                    className={`px-2.5 py-1 text-[11px] font-bold rounded cursor-pointer ${
                      primaryMediaType === 'video' ? 'bg-blue-600 text-white' : 'text-slate-600'
                    }`}
                  >
                    Video
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setPrimaryMediaType('photo');
                      setPrimaryFile(null);
                      setPrimaryPreview(null);
                    }}
                    className={`px-2.5 py-1 text-[11px] font-bold rounded cursor-pointer ${
                      primaryMediaType === 'photo' ? 'bg-blue-600 text-white' : 'text-slate-600'
                    }`}
                  >
                    Foto
                  </button>
                </div>
              </div>

              {!primaryPreview ? (
                <label className="flex flex-col items-center justify-center p-4 border-2 border-dashed border-blue-300 rounded-xl bg-white hover:bg-blue-50/50 transition-colors cursor-pointer">
                  <UploadCloud className="w-7 h-7 text-blue-500 mb-1" />
                  <span className="text-xs font-bold text-slate-700 text-center">
                    Pilih file {primaryMediaType === 'video' ? 'Video (MP4/WebM)' : 'Foto Utama (JPG/PNG)'}
                  </span>
                  <input
                    type="file"
                    accept={primaryMediaType === 'video' ? 'video/*' : 'image/*'}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      setPrimaryFile(file);
                      setPrimaryPreview(URL.createObjectURL(file));
                    }}
                    className="hidden"
                  />
                </label>
              ) : (
                <div className="relative rounded-xl overflow-hidden bg-slate-900 max-h-44 flex items-center justify-center">
                  {primaryMediaType === 'video' ? (
                    <video src={primaryPreview} controls className="max-h-44 w-full object-contain" />
                  ) : (
                    <img src={primaryPreview} alt="Preview" className="max-h-44 object-contain" />
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      setPrimaryFile(null);
                      setPrimaryPreview(null);
                    }}
                    className="absolute top-2 right-2 p-1.5 rounded-full bg-rose-600 text-white cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>

            {/* 2 Foto Pendukung */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2">
                <span className="text-xs font-bold text-slate-800 block">Foto Pendukung 1 *</span>
                {!photoOnePreview ? (
                  <label className="flex flex-col items-center justify-center p-3 border-2 border-dashed border-slate-300 rounded-xl bg-white cursor-pointer">
                    <span className="text-xs font-bold text-slate-600">Pilih Foto 1</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        setPhotoOneFile(file);
                        setPhotoOnePreview(URL.createObjectURL(file));
                      }}
                      className="hidden"
                    />
                  </label>
                ) : (
                  <div className="relative rounded-xl overflow-hidden bg-slate-900 max-h-32 flex items-center justify-center">
                    <img src={photoOnePreview} alt="Foto 1" className="max-h-32 object-contain" />
                    <button
                      type="button"
                      onClick={() => {
                        setPhotoOneFile(null);
                        setPhotoOnePreview(null);
                      }}
                      className="absolute top-1.5 right-1.5 p-1 rounded-full bg-rose-600 text-white cursor-pointer"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                )}
              </div>

              <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2">
                <span className="text-xs font-bold text-slate-800 block">Foto Pendukung 2 *</span>
                {!photoTwoPreview ? (
                  <label className="flex flex-col items-center justify-center p-3 border-2 border-dashed border-slate-300 rounded-xl bg-white cursor-pointer">
                    <span className="text-xs font-bold text-slate-600">Pilih Foto 2</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        setPhotoTwoFile(file);
                        setPhotoTwoPreview(URL.createObjectURL(file));
                      }}
                      className="hidden"
                    />
                  </label>
                ) : (
                  <div className="relative rounded-xl overflow-hidden bg-slate-900 max-h-32 flex items-center justify-center">
                    <img src={photoTwoPreview} alt="Foto 2" className="max-h-32 object-contain" />
                    <button
                      type="button"
                      onClick={() => {
                        setPhotoTwoFile(null);
                        setPhotoTwoPreview(null);
                      }}
                      className="absolute top-1.5 right-1.5 p-1 rounded-full bg-rose-600 text-white cursor-pointer"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                )}
              </div>
            </div>

            {isUploading && (
              <div className="space-y-1.5 p-3 rounded-xl bg-blue-50 border border-blue-200">
                <div className="flex justify-between text-xs font-bold text-blue-900">
                  <span>Mengunggah clips...</span>
                  <span>{uploadProgress}%</span>
                </div>
                <div className="w-full h-2 bg-blue-200 rounded-full overflow-hidden">
                  <div className="h-full bg-blue-600 transition-all duration-300" style={{ width: `${uploadProgress}%` }} />
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={isUploading}
              className="w-full neu-button text-white py-3 px-4 rounded-xl text-xs sm:text-sm font-black flex items-center justify-center gap-2 cursor-pointer shadow-md disabled:opacity-60"
            >
              <UploadCloud className="w-4 h-4" />
              <span>{isUploading ? `Mengunggah (${uploadProgress}%)...` : 'Publikasikan Clips Sekarang'}</span>
            </button>
          </form>
        </section>
      )}

      {/* 5. TAB 3: KELOLA AKUN (Owner Bisa Edit & Hapus Admin, dan Upload Foto Profil) */}
      {activeTab === 'admins' && (
        <section className="space-y-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-sm sm:text-base font-black text-slate-900">
                Daftar Akun Admin &amp; Pengelola
              </h2>
              <p className="text-xs text-slate-500">
                Owner dapat menambah, mengedit, mengganti foto profil, serta menghapus akun admin
              </p>
            </div>
            <button
              onClick={() => setShowAddAdminModal(true)}
              className="neu-button text-white px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              <Plus className="w-4 h-4" />
              <span>Tambah Admin Baru</span>
            </button>
          </div>

          {/* Table / Cards Admin */}
          <div className="neu-card overflow-hidden bg-white border border-slate-100">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs min-w-[620px]">
                <thead className="bg-slate-50 border-b border-slate-100 text-slate-500 uppercase tracking-wider font-bold">
                  <tr>
                    <th className="p-3.5">Admin</th>
                    <th className="p-3.5">Role</th>
                    <th className="p-3.5">Clips</th>
                    <th className="p-3.5">Media Sosial</th>
                    <th className="p-3.5">Status</th>
                    <th className="p-3.5 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {admins.map((adm) => {
                    const count = clips.filter((c) => c.uploaderUid === adm.uid).length;
                    const isOwnerAccount = adm.role === 'owner';
                    return (
                      <tr key={adm.uid} className="hover:bg-slate-50/60 transition-colors">
                        <td className="p-3.5">
                          <div className="flex items-center gap-3">
                            <img
                              src={adm.profileImage || 'https://i.postimg.cc/4ysQFgqx/1366b69ba442d21911f314947331b50a.jpg'}
                              alt={adm.adminName}
                              className="w-9 h-9 rounded-full object-cover border border-slate-200 shrink-0"
                              referrerPolicy="no-referrer"
                            />
                            <div className="min-w-0">
                              <p className="font-bold text-slate-800 truncate">{adm.adminName}</p>
                              <p className="text-[10px] text-slate-400 font-mono truncate">{adm.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="p-3.5 font-semibold text-slate-600 uppercase text-[10px]">
                          {adm.role}
                        </td>
                        <td className="p-3.5 font-bold text-slate-800">{count} clips</td>
                        <td className="p-3.5">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {adm.tiktokUrl && <span className="px-1.5 py-0.5 rounded bg-black text-white text-[9px] font-bold">TT</span>}
                            {adm.instagramUrl && <span className="px-1.5 py-0.5 rounded bg-pink-600 text-white text-[9px] font-bold">IG</span>}
                            {adm.whatsappChannelUrl && <span className="px-1.5 py-0.5 rounded bg-emerald-600 text-white text-[9px] font-bold">WA</span>}
                            {!adm.tiktokUrl && !adm.instagramUrl && !adm.whatsappChannelUrl && (
                              <span className="text-slate-400 text-[10px]">-</span>
                            )}
                          </div>
                        </td>
                        <td className="p-3.5">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              adm.active ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                            }`}
                          >
                            {adm.active ? 'Aktif' : 'Nonaktif'}
                          </span>
                        </td>
                        <td className="p-3.5 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {/* Tombol Edit Admin */}
                            <button
                              onClick={() => setEditingAdmin(adm)}
                              className="p-1.5 rounded-lg text-slate-600 hover:bg-slate-100 cursor-pointer"
                              title="Edit Info & Ganti Foto Profil"
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>

                            {/* Tombol Status Aktif/Nonaktif */}
                            {!isOwnerAccount && (
                              <button
                                onClick={() => handleToggleAdminStatus(adm)}
                                className={`px-2 py-1 rounded-lg text-[10px] font-bold cursor-pointer ${
                                  adm.active
                                    ? 'bg-amber-50 text-amber-700 hover:bg-amber-100'
                                    : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100'
                                }`}
                                title="Ubah status akses akun"
                              >
                                {adm.active ? 'Nonaktifkan' : 'Aktifkan'}
                              </button>
                            )}

                            {/* Tombol Hapus Admin (Khusus Owner) */}
                            {!isOwnerAccount && (
                              <button
                                onClick={() => handleDeleteAdmin(adm)}
                                className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-50 cursor-pointer"
                                title="Hapus Akun Admin Ini Secara Permanen"
                              >
                                <Trash2 className="w-4 h-4" />
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

          {/* Form Edit Profil Owner Sendiri (Upload & Ganti Foto Profil Owner) */}
          <div className="neu-card p-4 sm:p-6 bg-white space-y-4 max-w-2xl border border-blue-100">
            <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
              <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center">
                <User className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-black text-sm sm:text-base text-slate-900">
                  Profil Akun Owner (Founder)
                </h3>
                <p className="text-[11px] text-slate-400">
                  Owner dapat mengunggah foto profil baru dari perangkat atau menggunakan URL
                </p>
              </div>
            </div>

            <form onSubmit={handleSaveOwnerProfile} className="space-y-3.5 text-xs">
              {/* Foto Profil Owner */}
              <div className="space-y-2 p-3 rounded-2xl bg-slate-50 border border-slate-200">
                <label className="font-bold text-slate-800 block text-xs">Foto Profil Owner</label>
                <div className="flex items-center gap-3">
                  <img
                    src={ownerAvatar || 'https://i.postimg.cc/4ysQFgqx/1366b69ba442d21911f314947331b50a.jpg'}
                    alt="Owner Avatar"
                    className="w-12 h-12 rounded-2xl object-cover border-2 border-blue-500 shadow-xs shrink-0"
                    referrerPolicy="no-referrer"
                  />
                  <div className="flex-1 space-y-1.5">
                    <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-600 text-white text-xs font-bold hover:bg-blue-700 transition-colors cursor-pointer shadow-xs">
                      <Camera className="w-3.5 h-3.5" />
                      <span>Upload Foto Baru</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          onShowToast('Mengunggah foto profil Owner...', 'info');
                          try {
                            const url = await uploadAvatarFile(file);
                            setOwnerAvatar(url);
                            onShowToast('Foto profil Owner berhasil diunggah!', 'success');
                          } catch {
                            setOwnerAvatar(URL.createObjectURL(file));
                          }
                        }}
                        className="hidden"
                      />
                    </label>
                    <input
                      type="url"
                      placeholder="Atau tempel link URL foto..."
                      value={ownerAvatar}
                      onChange={(e) => setOwnerAvatar(e.target.value)}
                      className="w-full neu-input px-3 py-1.5 text-xs"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Nama Owner *</label>
                <input
                  type="text"
                  value={ownerName}
                  onChange={(e) => setOwnerName(e.target.value)}
                  className="w-full neu-input px-3 py-2 text-xs"
                  required
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Bio Singkat</label>
                <textarea
                  rows={2}
                  value={ownerBio}
                  onChange={(e) => setOwnerBio(e.target.value)}
                  className="w-full neu-input p-2.5 text-xs"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <input
                  type="url"
                  placeholder="TikTok (@...)"
                  value={ownerTiktok}
                  onChange={(e) => setOwnerTiktok(e.target.value)}
                  className="w-full neu-input px-3 py-1.5 text-xs"
                />
                <input
                  type="url"
                  placeholder="Instagram (@...)"
                  value={ownerInstagram}
                  onChange={(e) => setOwnerInstagram(e.target.value)}
                  className="w-full neu-input px-3 py-1.5 text-xs"
                />
                <input
                  type="url"
                  placeholder="Saluran WA"
                  value={ownerWA}
                  onChange={(e) => setOwnerWA(e.target.value)}
                  className="w-full neu-input px-3 py-1.5 text-xs"
                />
              </div>

              <button
                type="submit"
                disabled={isSavingOwnerProfile}
                className="neu-button text-white px-5 py-2.5 rounded-xl font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <Save className="w-3.5 h-3.5" />
                <span>{isSavingOwnerProfile ? 'Menyimpan...' : 'Simpan Profil Owner'}</span>
              </button>
            </form>
          </div>
        </section>
      )}

      {/* 6. TAB 4: PENGATURAN & STATISTIK */}
      {activeTab === 'settings' && (
        <section className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="neu-card p-4 sm:p-5 bg-white space-y-3 border border-slate-100">
              <h3 className="font-extrabold text-xs sm:text-sm text-slate-900 flex items-center gap-2">
                <Flame className="w-4 h-4 text-amber-500 fill-current" />
                <span>5 Clips Paling Banyak Diunduh Bobotoh</span>
              </h3>
              <div className="space-y-2">
                {topClips.map((c, idx) => (
                  <div key={c.clipId} className="flex items-center justify-between gap-3 text-xs p-2 rounded-xl bg-slate-50 border border-slate-100">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-800 font-bold flex items-center justify-center text-[10px] shrink-0">
                        {idx + 1}
                      </span>
                      <span className="font-bold text-slate-800 truncate">{c.title}</span>
                    </div>
                    <span className="font-black text-blue-700 tabular-nums shrink-0">{c.downloadCount} dl</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="neu-card p-4 sm:p-5 bg-white space-y-3 border border-slate-100">
              <h3 className="font-extrabold text-xs sm:text-sm text-slate-900 flex items-center gap-2">
                <Users className="w-4 h-4 text-blue-600" />
                <span>Kontribusi Unduhan per Admin</span>
              </h3>
              <div className="space-y-2">
                {admins.map((adm) => {
                  const adminClips = clips.filter((c) => c.uploaderUid === adm.uid);
                  const dl = adminClips.reduce((acc, c) => acc + (c.downloadCount || 0), 0);
                  return (
                    <div key={adm.uid} className="flex items-center justify-between text-xs p-2 rounded-xl bg-slate-50 border border-slate-100">
                      <div className="min-w-0">
                        <span className="font-bold text-slate-800 block truncate">{adm.adminName}</span>
                        <span className="text-[10px] text-slate-400">{adminClips.length} clips</span>
                      </div>
                      <span className="font-black text-slate-700 tabular-nums shrink-0">{dl.toLocaleString()} dl</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Pengaturan Website & APK */}
          <div className="neu-card p-4 sm:p-6 bg-white max-w-2xl mx-auto space-y-4 border border-slate-100">
            <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
              <Settings className="w-5 h-5 text-blue-600" />
              <h2 className="text-sm sm:text-base font-black text-slate-900">
                Pengaturan Umum &amp; Versi APK Android
              </h2>
            </div>

            <form onSubmit={handleSaveSettings} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                  Nama Website
                </label>
                <input
                  type="text"
                  value={siteName}
                  onChange={(e) => setSiteName(e.target.value)}
                  className="w-full neu-input px-3.5 py-2 text-xs sm:text-sm text-slate-800"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                  Tagline
                </label>
                <input
                  type="text"
                  value={siteDesc}
                  onChange={(e) => setSiteDesc(e.target.value)}
                  className="w-full neu-input px-3.5 py-2 text-xs sm:text-sm text-slate-800"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                  Pesan Pengumuman Beranda (Banner Atas)
                </label>
                <textarea
                  rows={2}
                  value={siteAnnouncement}
                  onChange={(e) => setSiteAnnouncement(e.target.value)}
                  className="w-full neu-input p-2.5 text-xs sm:text-sm text-slate-800"
                />
              </div>

              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                <div>
                  <p className="font-bold text-xs text-slate-800">Mode Pemeliharaan</p>
                  <p className="text-[10px] text-slate-400">Pengunjung biasa akan melihat layar pemeliharaan</p>
                </div>
                <input
                  type="checkbox"
                  checked={maintenanceMode}
                  onChange={(e) => setMaintenanceMode(e.target.checked)}
                  className="w-5 h-5 accent-blue-600 cursor-pointer"
                />
              </div>

              {/* APK Settings */}
              <div className="pt-3 border-t border-slate-100 space-y-2.5">
                <div className="flex items-center gap-2">
                  <Smartphone className="w-4 h-4 text-emerald-600" />
                  <h3 className="font-bold text-xs text-slate-900">
                    Pengaturan Link APK Android Bobotoh
                  </h3>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 block">Tautan Download APK (URL) *</label>
                  <input
                    type="url"
                    placeholder="https://..."
                    value={apkDownloadUrl}
                    onChange={(e) => setApkDownloadUrl(e.target.value)}
                    className="w-full neu-input px-3.5 py-2 text-xs font-mono"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">Versi APK</label>
                    <input
                      type="text"
                      value={apkVersionName}
                      onChange={(e) => setApkVersionName(e.target.value)}
                      className="w-full neu-input px-3 py-1.5 text-xs"
                    />
                  </div>
                  <div className="p-2 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                    <div>
                      <p className="font-bold text-xs text-slate-800">Tombol APK</p>
                      <p className="text-[9px] text-slate-400">Tampilkan di Header</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={apkEnabled}
                      onChange={(e) => setApkEnabled(e.target.checked)}
                      className="w-4 h-4 accent-emerald-600 cursor-pointer"
                    />
                  </div>
                </div>
              </div>

              <button
                type="submit"
                className="neu-button text-white px-5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 cursor-pointer shadow-md"
              >
                <Save className="w-4 h-4" />
                <span>Simpan Semua Pengaturan</span>
              </button>
            </form>
          </div>
        </section>
      )}

      {/* 7. MODAL: TAMBAH ADMIN BARU (Dengan Upload Foto Profil) */}
      {showAddAdminModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs">
          <div className="neu-card p-5 sm:p-6 bg-white max-w-md w-full space-y-4 max-h-[90vh] overflow-y-auto rounded-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-black text-slate-900 text-base">Tambah Akun Admin Baru</h3>
              <button onClick={() => setShowAddAdminModal(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleCreateAdmin} className="space-y-3 text-xs">
              {/* Foto Profil Admin Baru */}
              <div className="space-y-1.5 p-3 rounded-2xl bg-slate-50 border border-slate-200">
                <label className="font-bold text-slate-800 block">Foto Profil Admin Baru</label>
                <div className="flex items-center gap-3">
                  <img
                    src={newAdminProfileImage || 'https://i.postimg.cc/4ysQFgqx/1366b69ba442d21911f314947331b50a.jpg'}
                    alt="Preview"
                    className="w-10 h-10 rounded-full object-cover border border-slate-300 shrink-0"
                    referrerPolicy="no-referrer"
                  />
                  <div className="flex-1 space-y-1">
                    <label className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-600 text-white text-[11px] font-bold hover:bg-blue-700 cursor-pointer">
                      <Camera className="w-3 h-3" />
                      <span>Upload File</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          try {
                            const url = await uploadAvatarFile(file);
                            setNewAdminProfileImage(url);
                          } catch {
                            setNewAdminProfileImage(URL.createObjectURL(file));
                          }
                        }}
                        className="hidden"
                      />
                    </label>
                    <input
                      type="url"
                      placeholder="Atau link URL..."
                      value={newAdminProfileImage}
                      onChange={(e) => setNewAdminProfileImage(e.target.value)}
                      className="w-full neu-input px-2.5 py-1 text-xs"
                    />
                  </div>
                </div>
              </div>

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
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="url"
                  placeholder="Tautan TikTok"
                  value={newAdminTiktok}
                  onChange={(e) => setNewAdminTiktok(e.target.value)}
                  className="w-full neu-input px-2.5 py-1.5 text-xs"
                />
                <input
                  type="url"
                  placeholder="Tautan Instagram"
                  value={newAdminInstagram}
                  onChange={(e) => setNewAdminInstagram(e.target.value)}
                  className="w-full neu-input px-2.5 py-1.5 text-xs"
                />
              </div>
              <input
                type="url"
                placeholder="Tautan Saluran WA"
                value={newAdminWA}
                onChange={(e) => setNewAdminWA(e.target.value)}
                className="w-full neu-input px-3 py-1.5 text-xs"
              />
              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddAdminModal(false)}
                  className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-bold cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingAdmin}
                  className="neu-button text-white px-5 py-2 rounded-xl font-bold cursor-pointer"
                >
                  {isSubmittingAdmin ? 'Membuat Akun...' : 'Buat Akun Admin'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 8. MODAL: EDIT ADMIN (Dengan Upload/Ganti Foto Profil) */}
      {editingAdmin && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs">
          <div className="neu-card p-5 sm:p-6 bg-white max-w-lg w-full space-y-4 max-h-[90vh] overflow-y-auto rounded-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-black text-slate-900 text-base">Edit Profil Admin</h3>
              <button onClick={() => setEditingAdmin(null)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSaveEditedAdmin} className="space-y-3.5 text-xs">
              {/* Foto Profil Admin */}
              <div className="space-y-2 p-3 rounded-2xl bg-slate-50 border border-slate-200">
                <label className="font-bold text-slate-800 block text-xs">Foto Profil Admin</label>
                <div className="flex items-center gap-3">
                  <img
                    src={editingAdmin.profileImage || 'https://i.postimg.cc/4ysQFgqx/1366b69ba442d21911f314947331b50a.jpg'}
                    alt={editingAdmin.adminName}
                    className="w-12 h-12 rounded-2xl object-cover border-2 border-blue-500 shadow-xs shrink-0"
                    referrerPolicy="no-referrer"
                  />
                  <div className="flex-1 space-y-1.5">
                    <label className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-blue-600 text-white text-xs font-bold hover:bg-blue-700 cursor-pointer">
                      <Camera className="w-3.5 h-3.5" />
                      <span>Upload Foto Baru</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          onShowToast('Mengunggah foto profil admin...', 'info');
                          try {
                            const url = await uploadAvatarFile(file);
                            setEditingAdmin({ ...editingAdmin, profileImage: url });
                            onShowToast('Foto profil admin berhasil diunggah!', 'success');
                          } catch {
                            setEditingAdmin({ ...editingAdmin, profileImage: URL.createObjectURL(file) });
                          }
                        }}
                        className="hidden"
                      />
                    </label>
                    <input
                      type="url"
                      placeholder="Atau tautan URL foto..."
                      value={editingAdmin.profileImage || ''}
                      onChange={(e) => setEditingAdmin({ ...editingAdmin, profileImage: e.target.value })}
                      className="w-full neu-input px-3 py-1.5 text-xs"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Nama Admin</label>
                <input
                  type="text"
                  value={editingAdmin.adminName}
                  onChange={(e) => setEditingAdmin({ ...editingAdmin, adminName: e.target.value })}
                  className="w-full neu-input px-3 py-2 text-xs"
                  required
                />
              </div>
              <div>
                <label className="font-bold text-slate-700 block mb-1">Email</label>
                <input
                  type="email"
                  value={editingAdmin.email}
                  onChange={(e) => setEditingAdmin({ ...editingAdmin, email: e.target.value })}
                  className="w-full neu-input px-3 py-2 text-xs"
                  required
                />
              </div>
              <div>
                <label className="font-bold text-slate-700 block mb-1">Bio</label>
                <textarea
                  rows={2}
                  value={editingAdmin.bio || ''}
                  onChange={(e) => setEditingAdmin({ ...editingAdmin, bio: e.target.value })}
                  className="w-full neu-input px-3 py-2 text-xs"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="url"
                  placeholder="TikTok"
                  value={editingAdmin.tiktokUrl || ''}
                  onChange={(e) => setEditingAdmin({ ...editingAdmin, tiktokUrl: e.target.value })}
                  className="w-full neu-input px-3 py-1.5 text-xs"
                />
                <input
                  type="url"
                  placeholder="Instagram"
                  value={editingAdmin.instagramUrl || ''}
                  onChange={(e) => setEditingAdmin({ ...editingAdmin, instagramUrl: e.target.value })}
                  className="w-full neu-input px-3 py-1.5 text-xs"
                />
              </div>
              <input
                type="url"
                placeholder="Saluran WA"
                value={editingAdmin.whatsappChannelUrl || ''}
                onChange={(e) => setEditingAdmin({ ...editingAdmin, whatsappChannelUrl: e.target.value })}
                className="w-full neu-input px-3 py-1.5 text-xs"
              />
              <div className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                <input
                  type="checkbox"
                  id="adminActiveCheck"
                  checked={editingAdmin.active}
                  onChange={(e) => setEditingAdmin({ ...editingAdmin, active: e.target.checked })}
                  className="w-4 h-4 accent-blue-600 cursor-pointer"
                />
                <label htmlFor="adminActiveCheck" className="font-bold text-slate-700 cursor-pointer text-xs">
                  Status Akun Aktif (Bisa login &amp; unggah clips)
                </label>
              </div>
              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingAdmin(null)}
                  className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-bold"
                >
                  Batal
                </button>
                <button type="submit" className="neu-button text-white px-5 py-2 rounded-xl font-bold cursor-pointer">
                  Simpan Perubahan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 9. MODAL: EDIT CLIP */}
      {editingClip && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs">
          <div className="neu-card p-5 sm:p-6 bg-white max-w-md w-full space-y-4 max-h-[90vh] overflow-y-auto rounded-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-black text-slate-900 text-base">Edit Metadata Clip</h3>
              <button onClick={() => setEditingClip(null)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSaveEditedClip} className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Judul Clip *</label>
                <input
                  type="text"
                  value={editingClip.title}
                  onChange={(e) => setEditingClip({ ...editingClip, title: e.target.value })}
                  className="w-full neu-input px-3 py-2 text-xs"
                  required
                />
              </div>
              <div>
                <label className="font-bold text-slate-700 block mb-1">Nama Pembuat *</label>
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
                <label htmlFor="publishedCheckbox" className="font-semibold text-slate-700 cursor-pointer">
                  Status Publikasi (Bisa diakses publik Bobotoh)
                </label>
              </div>
              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingClip(null)}
                  className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-bold"
                >
                  Batal
                </button>
                <button type="submit" className="neu-button text-white px-5 py-2 rounded-xl font-bold">
                  Simpan Perubahan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 10. DOCK FITUR DI BAWAH (BOTTOM NAVIGATION BAR) */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-blue-200/80 shadow-[0_-4px_24px_rgba(0,43,102,0.1)] px-3 py-2">
        <div className="max-w-md mx-auto grid grid-cols-4 gap-1">
          <button
            onClick={() => setActiveTab('clips')}
            className={`flex flex-col items-center justify-center py-1.5 rounded-xl transition-all cursor-pointer select-none active:scale-95 ${
              activeTab === 'clips' ? 'text-blue-700 bg-blue-50/80 font-black' : 'text-slate-500 hover:text-blue-700 font-semibold'
            }`}
          >
            <div className="relative">
              <Video className={`w-5 h-5 ${activeTab === 'clips' ? 'stroke-[2.5px]' : 'stroke-2'}`} />
              <span className="absolute -top-1 -right-2 px-1 rounded-full text-[9px] font-bold bg-blue-600 text-white">
                {clips.length}
              </span>
            </div>
            <span className="text-[10px] mt-1">All Clips</span>
          </button>

          <button
            onClick={() => setActiveTab('upload')}
            className={`flex flex-col items-center justify-center py-1.5 rounded-xl transition-all cursor-pointer select-none active:scale-95 ${
              activeTab === 'upload' ? 'text-blue-700 bg-blue-50/80 font-black' : 'text-slate-500 hover:text-blue-700 font-semibold'
            }`}
          >
            <div className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center shadow-xs">
              <Plus className="w-3.5 h-3.5 stroke-[3px]" />
            </div>
            <span className="text-[10px] mt-1">Tambah</span>
          </button>

          <button
            onClick={() => setActiveTab('admins')}
            className={`flex flex-col items-center justify-center py-1.5 rounded-xl transition-all cursor-pointer select-none active:scale-95 ${
              activeTab === 'admins' ? 'text-blue-700 bg-blue-50/80 font-black' : 'text-slate-500 hover:text-blue-700 font-semibold'
            }`}
          >
            <Users className={`w-5 h-5 ${activeTab === 'admins' ? 'stroke-[2.5px]' : 'stroke-2'}`} />
            <span className="text-[10px] mt-1">Kelola Akun</span>
          </button>

          <button
            onClick={() => setActiveTab('settings')}
            className={`flex flex-col items-center justify-center py-1.5 rounded-xl transition-all cursor-pointer select-none active:scale-95 ${
              activeTab === 'settings' ? 'text-blue-700 bg-blue-50/80 font-black' : 'text-slate-500 hover:text-blue-700 font-semibold'
            }`}
          >
            <Settings className={`w-5 h-5 ${activeTab === 'settings' ? 'stroke-[2.5px]' : 'stroke-2'}`} />
            <span className="text-[10px] mt-1">Pengaturan</span>
          </button>
        </div>
      </nav>
    </div>
  );
};
