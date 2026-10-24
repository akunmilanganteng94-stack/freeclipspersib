import React, { useState, useMemo } from 'react';
import {
  UploadCloud,
  Film,
  Image as ImageIcon,
  X,
  ExternalLink,
  LogOut,
  User,
  Clock,
  Sparkles,
  Edit3,
  Trash2,
  Save,
  ShieldAlert,
  Video,
  Search,
  Filter,
  CheckCircle2,
  Heart,
  Download,
  Flame,
  MessageCircle,
  Plus,
  Eye,
  Shield,
  Camera,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { ClipItem, UserProfile } from '../types';
import {
  uploadMediaFile,
  createNewClip,
  updateClip,
  deleteClip,
  saveUserProfile,
} from '../services/clipsService';

interface AdminDashboardProps {
  clips: ClipItem[];
  onNavigate: (path: string) => void;
  onShowToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ clips, onNavigate, onShowToast }) => {
  const { userProfile, role, logout } = useAuth();

  // Navigation tab state: 'clips' | 'upload' | 'account'
  const [activeTab, setActiveTab] = useState<'clips' | 'upload' | 'account'>('clips');

  // All Clips filter states
  const [clipsScope, setClipsScope] = useState<'mine' | 'all'>('mine');
  const [searchQuery, setSearchQuery] = useState('');
  const [mediaFilter, setMediaFilter] = useState<'all' | 'video' | 'photo'>('all');

  // Edit clip state
  const [editingClip, setEditingClip] = useState<ClipItem | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editCreator, setEditCreator] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editPublished, setEditPublished] = useState(true);
  const [isUpdatingClip, setIsUpdatingClip] = useState(false);

  // Upload Form states
  const [creatorName, setCreatorName] = useState(userProfile?.adminName || '');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [primaryMediaType, setPrimaryMediaType] = useState<'video' | 'photo'>('video');

  // File states
  const [primaryFile, setPrimaryFile] = useState<File | null>(null);
  const [primaryPreview, setPrimaryPreview] = useState<string | null>(null);
  const [photoOneFile, setPhotoOneFile] = useState<File | null>(null);
  const [photoOnePreview, setPhotoOnePreview] = useState<string | null>(null);
  const [photoTwoFile, setPhotoTwoFile] = useState<File | null>(null);
  const [photoTwoPreview, setPhotoTwoPreview] = useState<string | null>(null);

  // Upload Progress
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  // Profile Edit states
  const [adminName, setAdminName] = useState(userProfile?.adminName || '');
  const [profileImage, setProfileImage] = useState(userProfile?.profileImage || '');
  const [bio, setBio] = useState(userProfile?.bio || '');
  const [tiktokUrl, setTiktokUrl] = useState(userProfile?.tiktokUrl || '');
  const [instagramUrl, setInstagramUrl] = useState(userProfile?.instagramUrl || '');
  const [whatsappChannelUrl, setWhatsappChannelUrl] = useState(userProfile?.whatsappChannelUrl || '');
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);

  // Filter clips for Admin
  const myClips = useMemo(() => {
    return clips.filter((c) => c.uploaderUid === userProfile?.uid);
  }, [clips, userProfile?.uid]);

  const filteredClips = useMemo(() => {
    const source = clipsScope === 'mine' ? myClips : clips;
    return source.filter((clip) => {
      const matchesSearch =
        !searchQuery.trim() ||
        clip.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        clip.creatorName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        clip.uploaderNameSnapshot.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesMedia = mediaFilter === 'all' || clip.primaryMediaType === mediaFilter;
      return matchesSearch && matchesMedia;
    });
  }, [clipsScope, myClips, clips, searchQuery, mediaFilter]);

  // File change handlers
  const handlePrimaryFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (primaryMediaType === 'video' && !file.type.startsWith('video/')) {
      onShowToast('Media utama harus berupa file video (MP4/WebM)!', 'error');
      return;
    }
    if (primaryMediaType === 'photo' && !file.type.startsWith('image/')) {
      onShowToast('Media utama harus berupa file foto/gambar!', 'error');
      return;
    }
    if (file.size > 100 * 1024 * 1024) {
      onShowToast('Ukuran file maksimal 100MB!', 'error');
      return;
    }

    setPrimaryFile(file);
    setPrimaryPreview(URL.createObjectURL(file));
  };

  const handlePhotoOneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      onShowToast('Foto pendukung pertama wajib berupa foto/gambar!', 'error');
      return;
    }
    setPhotoOneFile(file);
    setPhotoOnePreview(URL.createObjectURL(file));
  };

  const handlePhotoTwoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      onShowToast('Foto pendukung kedua wajib berupa foto/gambar!', 'error');
      return;
    }
    setPhotoTwoFile(file);
    setPhotoTwoPreview(URL.createObjectURL(file));
  };

  // Avatar file upload handler for Admin
  const handleAvatarFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      onShowToast('File harus berupa foto/gambar!', 'error');
      return;
    }
    setIsUploadingAvatar(true);
    onShowToast('Mengunggah foto profil baru...', 'info');
    try {
      const avatarPath = `avatars/${userProfile?.uid || 'admin'}/${Date.now()}_${file.name}`;
      const url = await uploadMediaFile(file, avatarPath);
      setProfileImage(url);
      onShowToast('Foto profil baru berhasil diunggah!', 'success');
    } catch {
      const localUrl = URL.createObjectURL(file);
      setProfileImage(localUrl);
      onShowToast('Foto profil dipilih!', 'success');
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  // Upload Submit
  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!creatorName.trim()) {
      onShowToast('Nama pembuat clips wajib diisi!', 'error');
      return;
    }
    if (!title.trim()) {
      onShowToast('Judul clips wajib diisi!', 'error');
      return;
    }
    if (!primaryFile) {
      onShowToast('Media utama (video/foto) wajib dipilih!', 'error');
      return;
    }
    if (!photoOneFile) {
      onShowToast('Foto pendukung 1 wajib dipilih!', 'error');
      return;
    }
    if (!photoTwoFile) {
      onShowToast('Foto pendukung 2 wajib dipilih!', 'error');
      return;
    }

    setIsUploading(true);
    setUploadProgress(10);
    onShowToast('Memulai upload 3 media clips Persib...', 'info');

    try {
      const adminPrefix = (userProfile?.adminName || 'admin')
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '')
        .substring(0, 10);
      const randomCode = Math.floor(100 + Math.random() * 900);
      const generatedSlug = `${adminPrefix}-${randomCode}`;

      // Upload all 3 media files simultaneously in parallel for lightning-fast publishing
      setUploadProgress(25);
      const primaryPath = `clips/${userProfile?.uid}/${generatedSlug}/primary_${primaryFile.name}`;
      const photoOnePath = `clips/${userProfile?.uid}/${generatedSlug}/photo1_${photoOneFile.name}`;
      const photoTwoPath = `clips/${userProfile?.uid}/${generatedSlug}/photo2_${photoTwoFile.name}`;

      const [primaryUrl, photoOneUrl, photoTwoUrl] = await Promise.all([
        uploadMediaFile(primaryFile, primaryPath, (pct) => setUploadProgress(25 + Math.floor(pct * 0.35))),
        uploadMediaFile(photoOneFile, photoOnePath, (pct) => setUploadProgress(40 + Math.floor(pct * 0.25))),
        uploadMediaFile(photoTwoFile, photoTwoPath, (pct) => setUploadProgress(50 + Math.floor(pct * 0.35))),
      ]);

      // Save Clip in Database
      setUploadProgress(95);
      await createNewClip({
        slug: generatedSlug,
        title: title.trim(),
        creatorName: creatorName.trim(),
        description: description.trim(),
        uploaderUid: userProfile?.uid || 'admin-uid',
        uploaderNameSnapshot: userProfile?.adminName || 'Admin Bobotoh',
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

      // Reset form
      setTitle('');
      setDescription('');
      setPrimaryFile(null);
      setPrimaryPreview(null);
      setPhotoOneFile(null);
      setPhotoOnePreview(null);
      setPhotoTwoFile(null);
      setPhotoTwoPreview(null);

      // Switch to All Clips tab
      setActiveTab('clips');
      setClipsScope('mine');
    } catch (err: any) {
      console.error('Upload failed:', err);
      onShowToast(`Upload gagal: ${err.message || 'Terjadi kesalahan'}`, 'error');
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  // Edit Clip Handlers
  const handleStartEdit = (clip: ClipItem) => {
    if (clip.uploaderUid !== userProfile?.uid && role !== 'owner') {
      onShowToast('Akses ditolak: Admin hanya dapat mengedit clips milik sendiri!', 'error');
      return;
    }
    setEditingClip(clip);
    setEditTitle(clip.title);
    setEditCreator(clip.creatorName);
    setEditDescription(clip.description || '');
    setEditPublished(clip.published);
  };

  const handleSaveClipEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingClip || !userProfile) return;
    setIsUpdatingClip(true);
    try {
      await updateClip(
        editingClip.clipId,
        {
          title: editTitle.trim(),
          creatorName: editCreator.trim(),
          description: editDescription.trim(),
          published: editPublished,
        },
        { uid: userProfile.uid, role: role || 'admin' }
      );
      onShowToast(`Clips "${editTitle}" berhasil diperbarui!`, 'success');
      setEditingClip(null);
    } catch (err: any) {
      onShowToast(err.message || 'Gagal memperbarui clips', 'error');
    } finally {
      setIsUpdatingClip(false);
    }
  };

  const handleDeleteMyClip = async (clip: ClipItem) => {
    if (!userProfile) return;
    if (clip.uploaderUid !== userProfile.uid && role !== 'owner') {
      onShowToast('Akses ditolak: Anda tidak dapat menghapus clips admin lain!', 'error');
      return;
    }
    if (!confirm(`Hapus permanen clips "${clip.title}"? Tindakan ini tidak dapat dibatalkan.`)) {
      return;
    }
    try {
      await deleteClip(clip.clipId, { uid: userProfile.uid, role: role || 'admin' });
      onShowToast(`Clips "${clip.title}" berhasil dihapus.`, 'success');
    } catch (err: any) {
      onShowToast(err.message || 'Gagal menghapus clips', 'error');
    }
  };

  // Save Admin Account Profile
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userProfile) return;
    if (!adminName.trim()) {
      onShowToast('Nama admin tidak boleh kosong!', 'error');
      return;
    }
    setIsSavingProfile(true);
    try {
      const updatedProfile: UserProfile = {
        ...userProfile,
        adminName: adminName.trim(),
        profileImage: profileImage.trim() || 'https://i.postimg.cc/4ysQFgqx/1366b69ba442d21911f314947331b50a.jpg',
        bio: bio.trim(),
        tiktokUrl: tiktokUrl.trim(),
        instagramUrl: instagramUrl.trim(),
        whatsappChannelUrl: whatsappChannelUrl.trim(),
        updatedAt: new Date().toISOString(),
      };
      await saveUserProfile(updatedProfile);
      onShowToast('Profil akun admin berhasil diperbarui!', 'success');
    } catch (err: any) {
      onShowToast('Gagal menyimpan profil: ' + (err.message || 'Terjadi kesalahan'), 'error');
    } finally {
      setIsSavingProfile(false);
    }
  };

  return (
    <div className="space-y-4 pb-28 md:pb-12 max-w-7xl mx-auto w-full px-2 sm:px-4">
      {/* 1. Sleek Minimal Top Bar (Panel besar dihapus agar tidak terpotong di mobile) */}
      <div className="flex items-center justify-between gap-2 px-1 py-1">
        <div className="flex items-center gap-2 min-w-0">
          <span className="font-black text-sm sm:text-base text-slate-900 tracking-tight truncate">
            Dashboard Admin
          </span>
          <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-blue-100 text-blue-800 shrink-0">
            {userProfile?.adminName || 'Admin'}
          </span>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {userProfile?.uid && (
            <button
              onClick={() => onNavigate(`/admin/${userProfile.uid}`)}
              className="p-1.5 rounded-xl text-slate-600 hover:text-blue-700 hover:bg-white transition-colors cursor-pointer"
              title="Lihat Profil Publik"
            >
              <Eye className="w-4 h-4" />
            </button>
          )}
          <button
            onClick={() => onNavigate('/')}
            className="p-1.5 rounded-xl text-slate-600 hover:text-blue-700 hover:bg-white transition-colors cursor-pointer"
            title="Ke Beranda"
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

      {/* 2. Desktop Navigation Pills (Keren & Elegan) */}
      <div className="hidden sm:flex items-center gap-2 p-1 bg-slate-200/80 rounded-2xl w-full">
        <button
          onClick={() => setActiveTab('clips')}
          className={`flex-1 flex items-center justify-center gap-2 py-2 px-4 rounded-xl text-xs sm:text-sm font-extrabold transition-all cursor-pointer ${
            activeTab === 'clips'
              ? 'bg-white text-blue-900 shadow-sm'
              : 'text-slate-600 hover:text-blue-900'
          }`}
        >
          <Video className="w-4 h-4 text-blue-600" />
          <span>All Clips ({clips.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('upload')}
          className={`flex-1 flex items-center justify-center gap-2 py-2 px-4 rounded-xl text-xs sm:text-sm font-extrabold transition-all cursor-pointer ${
            activeTab === 'upload'
              ? 'bg-white text-blue-900 shadow-sm'
              : 'text-slate-600 hover:text-blue-900'
          }`}
        >
          <Plus className="w-4 h-4 text-blue-600" />
          <span>Tambahkan Clips</span>
        </button>

        <button
          onClick={() => setActiveTab('account')}
          className={`flex-1 flex items-center justify-center gap-2 py-2 px-4 rounded-xl text-xs sm:text-sm font-extrabold transition-all cursor-pointer ${
            activeTab === 'account'
              ? 'bg-white text-blue-900 shadow-sm'
              : 'text-slate-600 hover:text-blue-900'
          }`}
        >
          <User className="w-4 h-4 text-blue-600" />
          <span>Kelola Akun</span>
        </button>
      </div>

      {/* 3. TAB 1: ALL CLIPS */}
      {activeTab === 'clips' && (
        <section className="space-y-4">
          {/* Filter Bar */}
          <div className="neu-card p-3 sm:p-4 bg-white space-y-3">
            <div className="flex flex-col md:flex-row items-center gap-2.5">
              {/* Scope Switcher: Clips Saya vs Semua Clips */}
              <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-xl w-full md:w-auto shrink-0 justify-center">
                <button
                  onClick={() => setClipsScope('mine')}
                  className={`px-3 py-1.5 text-xs font-extrabold rounded-lg transition-colors cursor-pointer ${
                    clipsScope === 'mine'
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'text-slate-600 hover:text-blue-700'
                  }`}
                >
                  Clips Saya ({myClips.length})
                </button>
                <button
                  onClick={() => setClipsScope('all')}
                  className={`px-3 py-1.5 text-xs font-extrabold rounded-lg transition-colors cursor-pointer ${
                    clipsScope === 'all'
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'text-slate-600 hover:text-blue-700'
                  }`}
                >
                  Semua Clips ({clips.length})
                </button>
              </div>

              {/* Search Field */}
              <div className="relative w-full flex-1">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Cari clips..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-blue-600 focus:bg-white transition-colors"
                />
              </div>

              {/* Media Type Filter */}
              <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-xl shrink-0 w-full md:w-auto justify-center">
                <button
                  onClick={() => setMediaFilter('all')}
                  className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
                    mediaFilter === 'all' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-600'
                  }`}
                >
                  Semua
                </button>
                <button
                  onClick={() => setMediaFilter('video')}
                  className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
                    mediaFilter === 'video' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-600'
                  }`}
                >
                  Video
                </button>
                <button
                  onClick={() => setMediaFilter('photo')}
                  className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
                    mediaFilter === 'photo' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-600'
                  }`}
                >
                  Foto
                </button>
              </div>
            </div>
          </div>

          {/* Clips List */}
          {filteredClips.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 sm:gap-4">
              {filteredClips.map((c) => {
                const isMine = c.uploaderUid === userProfile?.uid;
                return (
                  <div
                    key={c.clipId}
                    className="neu-card p-3.5 bg-white flex flex-col justify-between gap-3 border border-slate-100 hover:border-blue-200 transition-all shadow-xs"
                  >
                    <div className="flex gap-3">
                      <div className="relative w-24 h-20 rounded-xl overflow-hidden bg-slate-900 shrink-0">
                        <img
                          src={c.photoOneUrl || c.primaryMediaUrl}
                          alt={c.title}
                          className="w-full h-full object-cover"
                          referrerPolicy="no-referrer"
                        />
                        <span className="absolute bottom-1 left-1 px-1.5 py-0.5 rounded text-[9px] font-bold bg-black/70 text-white">
                          {c.primaryMediaType === 'video' ? 'Video' : 'Foto'}
                        </span>
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span
                            className={`text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-full ${
                              c.published ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-700'
                            }`}
                          >
                            {c.published ? 'Tayang' : 'Draft'}
                          </span>
                          {isMine && (
                            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-blue-100 text-blue-800">
                              Milik Anda
                            </span>
                          )}
                        </div>
                        <h3 className="font-bold text-xs sm:text-sm text-slate-900 line-clamp-2 mt-1 leading-snug">
                          {c.title}
                        </h3>
                        <p className="text-[10px] text-slate-400 mt-0.5 truncate">
                          Oleh: <span className="font-semibold text-slate-600">{c.creatorName}</span>
                        </p>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2 text-[11px] text-slate-500 font-medium">
                        <span className="flex items-center gap-1 font-bold text-blue-700">
                          <Download className="w-3 h-3" />
                          <span>{c.downloadCount || 0}</span>
                        </span>
                        <span className="flex items-center gap-1 font-bold text-rose-600">
                          <Heart className="w-3 h-3 fill-current" />
                          <span>{c.likeCount || 0}</span>
                        </span>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => onNavigate(`/clips/${c.slug}`)}
                          className="p-1.5 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors"
                          title="Buka Halaman Publik"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </button>
                        {isMine && (
                          <>
                            <button
                              onClick={() => handleStartEdit(c)}
                              className="p-1.5 rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors"
                              title="Edit Info Clip Ini"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteMyClip(c)}
                              className="p-1.5 rounded-lg bg-rose-50 text-rose-600 hover:bg-rose-100 transition-colors"
                              title="Hapus Clip Milik Sendiri"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="neu-card p-8 sm:p-10 text-center space-y-3 bg-white border border-slate-100">
              <Video className="w-10 h-10 text-blue-500 mx-auto" />
              <h3 className="font-extrabold text-sm text-slate-900">Belum Ada Clips</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                {clipsScope === 'mine'
                  ? 'Anda belum mengunggah clips. Klik tombol "Tambahkan Clips" di bawah untuk mulai!'
                  : 'Tidak ada clips yang cocok dengan pencarian.'}
              </p>
              <button
                onClick={() => setActiveTab('upload')}
                className="neu-button text-white text-xs font-bold px-4 py-2 rounded-xl inline-flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Tambahkan Clips Baru</span>
              </button>
            </div>
          )}
        </section>
      )}

      {/* 4. TAB 2: TAMBAHKAN CLIPS */}
      {activeTab === 'upload' && (
        <section className="neu-card p-4 sm:p-6 bg-white space-y-5 max-w-3xl mx-auto border border-blue-100">
          <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
            <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-xs">
              <UploadCloud className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-black text-slate-900">
                Tambahkan Item Clips Baru
              </h2>
              <p className="text-[11px] text-slate-400">
                1 Media Utama (Video/Foto) + 2 Foto Pendukung
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
                placeholder="Contoh: Azryl Visuals / Bobotoh 1933"
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
                placeholder="Contoh: Selebrasi Dramatis Persib Bandung di GBLA"
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
                    onChange={handlePrimaryFileChange}
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
                    className="absolute top-2 right-2 p-1.5 rounded-full bg-rose-600 text-white hover:bg-rose-700 transition-colors cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>

            {/* Dua Foto Pendukung */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2">
                <span className="text-xs font-bold text-slate-800 block">Foto Pendukung 1 *</span>
                {!photoOnePreview ? (
                  <label className="flex flex-col items-center justify-center p-3 border-2 border-dashed border-slate-300 rounded-xl bg-white hover:bg-slate-50 transition-colors cursor-pointer">
                    <span className="text-xs font-bold text-slate-600">Pilih Foto 1</span>
                    <input type="file" accept="image/*" onChange={handlePhotoOneChange} className="hidden" />
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
                  <label className="flex flex-col items-center justify-center p-3 border-2 border-dashed border-slate-300 rounded-xl bg-white hover:bg-slate-50 transition-colors cursor-pointer">
                    <span className="text-xs font-bold text-slate-600">Pilih Foto 2</span>
                    <input type="file" accept="image/*" onChange={handlePhotoTwoChange} className="hidden" />
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

            {/* Upload Progress Bar */}
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

      {/* 5. TAB 3: KELOLA AKUN ADMIN (Upload/Ganti Foto Profil & Medsos) */}
      {activeTab === 'account' && (
        <section className="neu-card p-4 sm:p-6 bg-white space-y-5 max-w-2xl mx-auto border border-blue-100">
          <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
            <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-xs">
              <User className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-black text-slate-900">
                Kelola Akun &amp; Profil Admin
              </h2>
              <p className="text-[11px] text-slate-400">
                Ganti foto profil (bisa upload file atau URL), nama, bio, dan media sosial
              </p>
            </div>
          </div>

          <form onSubmit={handleSaveProfile} className="space-y-4 text-xs sm:text-sm">
            {/* Foto Profil: Bisa Upload File langsung & Ganti URL */}
            <div className="space-y-2 p-3.5 rounded-2xl bg-slate-50 border border-slate-200">
              <label className="font-bold text-slate-800 block text-xs uppercase tracking-wider">
                Foto Profil / Avatar Kreator
              </label>
              <div className="flex items-center gap-3.5">
                <div className="relative w-14 h-14 rounded-2xl overflow-hidden bg-slate-200 border-2 border-blue-500 shadow-xs shrink-0">
                  <img
                    src={profileImage || 'https://i.postimg.cc/4ysQFgqx/1366b69ba442d21911f314947331b50a.jpg'}
                    alt="Avatar"
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                  {isUploadingAvatar && (
                    <div className="absolute inset-0 bg-black/60 flex items-center justify-center text-[10px] text-white font-bold">
                      ...
                    </div>
                  )}
                </div>

                <div className="flex-1 space-y-2">
                  <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-600 text-white text-xs font-bold hover:bg-blue-700 transition-colors cursor-pointer shadow-xs">
                    <Camera className="w-3.5 h-3.5" />
                    <span>Upload Foto Baru</span>
                    <input type="file" accept="image/*" onChange={handleAvatarFileUpload} className="hidden" />
                  </label>
                  <input
                    type="url"
                    placeholder="Atau tempel link URL foto..."
                    value={profileImage}
                    onChange={(e) => setProfileImage(e.target.value)}
                    className="w-full neu-input px-3 py-1.5 text-xs text-slate-800"
                  />
                </div>
              </div>
            </div>

            {/* Nama Admin */}
            <div className="space-y-1">
              <label className="font-bold text-slate-700 block text-xs uppercase tracking-wider">
                Nama Lengkap / Nama Publik Admin *
              </label>
              <input
                type="text"
                value={adminName}
                onChange={(e) => setAdminName(e.target.value)}
                className="w-full neu-input px-3.5 py-2 text-xs sm:text-sm text-slate-800"
                required
              />
            </div>

            {/* Email (Readonly) */}
            <div className="space-y-1">
              <label className="font-bold text-slate-700 block text-xs uppercase tracking-wider">
                Email Akun
              </label>
              <input
                type="email"
                value={userProfile?.email || ''}
                readOnly
                className="w-full neu-input px-3.5 py-2 text-xs sm:text-sm text-slate-500 bg-slate-100 cursor-not-allowed font-mono"
              />
            </div>

            {/* Bio */}
            <div className="space-y-1">
              <label className="font-bold text-slate-700 block text-xs uppercase tracking-wider">
                Bio / Deskripsi Kreator
              </label>
              <textarea
                rows={2}
                placeholder="Tuliskan bio atau deskripsi karya clips Persib Anda..."
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                className="w-full neu-input p-2.5 text-xs sm:text-sm text-slate-800"
              />
            </div>

            {/* Media Sosial */}
            <div className="pt-2 border-t border-slate-100 space-y-2.5">
              <h3 className="font-bold text-xs uppercase tracking-wider text-blue-900">
                Tautan Media Sosial
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <input
                  type="url"
                  placeholder="https://tiktok.com/@..."
                  value={tiktokUrl}
                  onChange={(e) => setTiktokUrl(e.target.value)}
                  className="w-full neu-input px-3 py-2 text-xs"
                />
                <input
                  type="url"
                  placeholder="https://instagram.com/..."
                  value={instagramUrl}
                  onChange={(e) => setInstagramUrl(e.target.value)}
                  className="w-full neu-input px-3 py-2 text-xs"
                />
              </div>
              <input
                type="url"
                placeholder="https://whatsapp.com/channel/... (Saluran WA)"
                value={whatsappChannelUrl}
                onChange={(e) => setWhatsappChannelUrl(e.target.value)}
                className="w-full neu-input px-3 py-2 text-xs"
              />
            </div>

            <button
              type="submit"
              disabled={isSavingProfile}
              className="w-full neu-button text-white py-3 px-4 rounded-xl text-xs sm:text-sm font-extrabold flex items-center justify-center gap-2 cursor-pointer shadow-md disabled:opacity-60"
            >
              <Save className="w-4 h-4" />
              <span>{isSavingProfile ? 'Menyimpan Profil...' : 'Simpan Perubahan Akun'}</span>
            </button>
          </form>
        </section>
      )}

      {/* 6. MODAL EDIT CLIP MILIK SENDIRI */}
      {editingClip && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs">
          <div className="neu-card p-5 sm:p-6 bg-white max-w-lg w-full space-y-4 max-h-[90vh] overflow-y-auto rounded-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Edit3 className="w-4 h-4 text-blue-600" />
                <h3 className="font-black text-slate-900 text-sm sm:text-base">Edit Clips Anda</h3>
              </div>
              <button onClick={() => setEditingClip(null)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveClipEdit} className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Judul Clips *</label>
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full neu-input px-3 py-2 text-xs"
                  required
                />
              </div>
              <div>
                <label className="font-bold text-slate-700 block mb-1">Nama Pembuat *</label>
                <input
                  type="text"
                  value={editCreator}
                  onChange={(e) => setEditCreator(e.target.value)}
                  className="w-full neu-input px-3 py-2 text-xs"
                  required
                />
              </div>
              <div>
                <label className="font-bold text-slate-700 block mb-1">Deskripsi</label>
                <textarea
                  rows={3}
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  className="w-full neu-input p-2.5 text-xs"
                />
              </div>
              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100">
                <span className="font-bold text-slate-800 text-xs">Status Publikasi</span>
                <input
                  type="checkbox"
                  checked={editPublished}
                  onChange={(e) => setEditPublished(e.target.checked)}
                  className="w-5 h-5 accent-blue-600 cursor-pointer"
                />
              </div>
              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingClip(null)}
                  className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 text-xs font-bold cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isUpdatingClip}
                  className="neu-button text-white px-5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs disabled:opacity-60"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>{isUpdatingClip ? 'Menyimpan...' : 'Simpan'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 7. DOCK FITUR DI BAWAH (BOTTOM NAVIGATION BAR) */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-blue-200/80 shadow-[0_-4px_24px_rgba(0,43,102,0.1)] px-3 py-2">
        <div className="max-w-md mx-auto grid grid-cols-3 gap-1">
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
            <span className="text-[10px] mt-1">Tambah Clips</span>
          </button>

          <button
            onClick={() => setActiveTab('account')}
            className={`flex flex-col items-center justify-center py-1.5 rounded-xl transition-all cursor-pointer select-none active:scale-95 ${
              activeTab === 'account' ? 'text-blue-700 bg-blue-50/80 font-black' : 'text-slate-500 hover:text-blue-700 font-semibold'
            }`}
          >
            <User className={`w-5 h-5 ${activeTab === 'account' ? 'stroke-[2.5px]' : 'stroke-2'}`} />
            <span className="text-[10px] mt-1">Kelola Akun</span>
          </button>
        </div>
      </nav>
    </div>
  );
};
