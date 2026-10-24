import React, { useState } from 'react';
import {
  UploadCloud,
  Film,
  Image as ImageIcon,
  CheckCircle2,
  AlertCircle,
  FileCheck,
  X,
  ExternalLink,
  LogOut,
  User,
  Clock,
  Sparkles,
  Edit3,
  Trash2,
  Lock,
  Save,
  ShieldAlert,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { ClipItem } from '../types';
import { uploadMediaFile, createNewClip, updateClip, deleteClip } from '../services/clipsService';

interface AdminDashboardProps {
  clips: ClipItem[];
  onNavigate: (path: string) => void;
  onShowToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ clips, onNavigate, onShowToast }) => {
  const { userProfile, role, logout } = useAuth();

  // Edit clip state
  const [editingClip, setEditingClip] = useState<ClipItem | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editCreator, setEditCreator] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editPublished, setEditPublished] = useState(true);
  const [isUpdatingClip, setIsUpdatingClip] = useState(false);

  // Form states
  const [creatorName, setCreatorName] = useState('');
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

  // Filter own clips
  const myClips = clips.filter((c) => c.uploaderUid === userProfile?.uid);

  // File change handlers
  const handlePrimaryFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (primaryMediaType === 'video' && !file.type.startsWith('video/')) {
      onShowToast('Media utama harus berupa file video!', 'error');
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

  const handleSubmit = async (e: React.FormEvent) => {
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
      // 1. Generate unique slug based on admin & timestamp
      const adminPrefix = (userProfile?.adminName || 'admin')
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '')
        .substring(0, 10);
      const randomCode = Math.floor(100 + Math.random() * 900);
      const generatedSlug = `${adminPrefix}-${randomCode}`;

      // 2. Upload Primary File
      setUploadProgress(25);
      const primaryPath = `clips/${userProfile?.uid}/${generatedSlug}/primary_${primaryFile.name}`;
      const primaryUrl = await uploadMediaFile(primaryFile, primaryPath, (pct) => {
        setUploadProgress(25 + Math.floor(pct * 0.25));
      });

      // 3. Upload Photo One
      setUploadProgress(55);
      const photoOnePath = `clips/${userProfile?.uid}/${generatedSlug}/photo1_${photoOneFile.name}`;
      const photoOneUrl = await uploadMediaFile(photoOneFile, photoOnePath, (pct) => {
        setUploadProgress(55 + Math.floor(pct * 0.2));
      });

      // 4. Upload Photo Two
      setUploadProgress(75);
      const photoTwoPath = `clips/${userProfile?.uid}/${generatedSlug}/photo2_${photoTwoFile.name}`;
      const photoTwoUrl = await uploadMediaFile(photoTwoFile, photoTwoPath, (pct) => {
        setUploadProgress(75 + Math.floor(pct * 0.2));
      });

      // 5. Create Clip in Firestore
      setUploadProgress(95);
      const newClip = await createNewClip({
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
      setCreatorName('');
      setDescription('');
      setPrimaryFile(null);
      setPrimaryPreview(null);
      setPhotoOneFile(null);
      setPhotoOnePreview(null);
      setPhotoTwoFile(null);
      setPhotoTwoPreview(null);

      // Offer view
      setTimeout(() => {
        onNavigate(`/clips/${newClip.slug}`);
      }, 1500);
    } catch (err: any) {
      console.error('Upload failed:', err);
      onShowToast(`Upload gagal: ${err.message || 'Terjadi kesalahan'}`, 'error');
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

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
      onShowToast('Akses ditolak: Anda tidak dapat menghapus clips admin lain! Hanya bisa menghapus clips sendiri.', 'error');
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

  return (
    <div className="space-y-8">
      {/* Header bar */}
      <div className="neu-card p-6 bg-white flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-xs">
            <User className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-black text-slate-900">
                Dashboard Admin — {userProfile?.adminName || 'Admin'}
              </h1>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-800">
                {role?.toUpperCase()}
              </span>
            </div>
            <p className="text-xs text-slate-500">
              Form khusus pengunggahan clips Persib (1 Item wajib berisi tepat 3 Media)
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {userProfile?.uid && (
            <button
              onClick={() => onNavigate(`/admin/${userProfile.uid}`)}
              className="neu-button-secondary px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Lihat Profil Publik</span>
            </button>
          )}
          <button
            onClick={() => {
              logout();
              onNavigate('/');
            }}
            className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
            title="Keluar"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Main Grid: Upload Form (Left) & My Clips List (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Upload Form (2 cols) */}
        <div className="lg:col-span-2 neu-card p-6 sm:p-8 bg-white space-y-6">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
            <UploadCloud className="w-5 h-5 text-blue-600" />
            <h2 className="text-base sm:text-lg font-black text-slate-900">
              Unggah Item Clips Baru
            </h2>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* 1. Nama Pembuat Clips */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                1. Nama Pembuat Clips <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                placeholder="Contoh: Azryl Visuals / Bobotoh 1933 / Nama Anda"
                value={creatorName}
                onChange={(e) => setCreatorName(e.target.value)}
                className="w-full neu-input px-3.5 py-2.5 text-xs sm:text-sm text-slate-800"
                required
              />
            </div>

            {/* 2. Judul Clips */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                2. Judul Clips <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                placeholder="Contoh: Selebrasi Dramatis Persib Bandung vs Persija di GBLA"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full neu-input px-3.5 py-2.5 text-xs sm:text-sm text-slate-800"
                required
              />
            </div>

            {/* 3. Deskripsi Opsional */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                3. Deskripsi Clips (Opsional)
              </label>
              <textarea
                rows={3}
                placeholder="Tuliskan keterangan momen pertandingan, menit gol, atau pesan untuk Bobotoh..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full neu-input p-3 text-xs sm:text-sm text-slate-800"
              />
            </div>

            {/* MEDIA SECTION: 3 MANDATORY FILES */}
            <div className="pt-3 border-t border-slate-100 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-bold text-blue-900 uppercase tracking-wider">
                    Sistem 3 Media (Wajib Lengkap)
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Satu item clips terdiri dari 1 media utama dan 2 foto pendukung
                  </p>
                </div>
              </div>

              {/* 4. Media Utama (Video or Photo) */}
              <div className="p-4 rounded-2xl bg-blue-50/50 border border-blue-100 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-blue-950 flex items-center gap-1.5">
                    {primaryMediaType === 'video' ? <Film className="w-4 h-4 text-blue-600" /> : <ImageIcon className="w-4 h-4 text-blue-600" />}
                    <span>Media Utama (Video / Foto) <span className="text-rose-500">*</span></span>
                  </label>

                  {/* Switcher Video / Photo */}
                  <div className="flex items-center gap-1 p-0.5 bg-white rounded-lg border border-blue-200">
                    <button
                      type="button"
                      onClick={() => {
                        setPrimaryMediaType('video');
                        setPrimaryFile(null);
                        setPrimaryPreview(null);
                      }}
                      className={`px-2 py-1 text-[11px] font-bold rounded cursor-pointer ${
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
                      className={`px-2 py-1 text-[11px] font-bold rounded cursor-pointer ${
                        primaryMediaType === 'photo' ? 'bg-blue-600 text-white' : 'text-slate-600'
                      }`}
                    >
                      Foto
                    </button>
                  </div>
                </div>

                {!primaryPreview ? (
                  <label className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-blue-300 rounded-xl bg-white hover:bg-blue-50/50 transition-colors cursor-pointer">
                    <UploadCloud className="w-8 h-8 text-blue-500 mb-1" />
                    <span className="text-xs font-bold text-slate-700">
                      Pilih file {primaryMediaType === 'video' ? 'Video (MP4/WebM)' : 'Foto Utama (JPG/PNG)'}
                    </span>
                    <span className="text-[11px] text-slate-400 mt-0.5">Maksimal 100MB</span>
                    <input
                      type="file"
                      accept={primaryMediaType === 'video' ? 'video/*' : 'image/*'}
                      onChange={handlePrimaryFileChange}
                      className="hidden"
                    />
                  </label>
                ) : (
                  <div className="relative rounded-xl overflow-hidden bg-slate-900 max-h-48 flex items-center justify-center">
                    {primaryMediaType === 'video' ? (
                      <video src={primaryPreview} controls className="max-h-48 w-full object-contain" />
                    ) : (
                      <img src={primaryPreview} alt="Preview" className="max-h-48 object-contain" />
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        setPrimaryFile(null);
                        setPrimaryPreview(null);
                      }}
                      className="absolute top-2 right-2 p-1.5 rounded-full bg-rose-600 text-white hover:bg-rose-700 transition-colors"
                      title="Batalkan pilihan file"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>

              {/* 5. Foto Pendukung Pertama */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <ImageIcon className="w-4 h-4 text-blue-600" />
                    <span>Foto Pendukung Pertama <span className="text-rose-500">*</span></span>
                  </label>
                  <span className="text-[10px] text-slate-400 font-semibold">Wajib Format Foto</span>
                </div>

                {!photoOnePreview ? (
                  <label className="flex flex-col items-center justify-center p-4 border-2 border-dashed border-slate-300 rounded-xl bg-white hover:bg-slate-50 transition-colors cursor-pointer">
                    <span className="text-xs font-bold text-slate-700">Pilih Foto 1 (JPG/PNG)</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handlePhotoOneChange}
                      className="hidden"
                    />
                  </label>
                ) : (
                  <div className="relative rounded-xl overflow-hidden bg-slate-900 max-h-36 flex items-center justify-center">
                    <img src={photoOnePreview} alt="Foto 1 Preview" className="max-h-36 object-contain" />
                    <button
                      type="button"
                      onClick={() => {
                        setPhotoOneFile(null);
                        setPhotoOnePreview(null);
                      }}
                      className="absolute top-2 right-2 p-1 rounded-full bg-rose-600 text-white hover:bg-rose-700"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>

              {/* 6. Foto Pendukung Kedua */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <ImageIcon className="w-4 h-4 text-blue-600" />
                    <span>Foto Pendukung Kedua <span className="text-rose-500">*</span></span>
                  </label>
                  <span className="text-[10px] text-slate-400 font-semibold">Wajib Format Foto</span>
                </div>

                {!photoTwoPreview ? (
                  <label className="flex flex-col items-center justify-center p-4 border-2 border-dashed border-slate-300 rounded-xl bg-white hover:bg-slate-50 transition-colors cursor-pointer">
                    <span className="text-xs font-bold text-slate-700">Pilih Foto 2 (JPG/PNG)</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handlePhotoTwoChange}
                      className="hidden"
                    />
                  </label>
                ) : (
                  <div className="relative rounded-xl overflow-hidden bg-slate-900 max-h-36 flex items-center justify-center">
                    <img src={photoTwoPreview} alt="Foto 2 Preview" className="max-h-36 object-contain" />
                    <button
                      type="button"
                      onClick={() => {
                        setPhotoTwoFile(null);
                        setPhotoTwoPreview(null);
                      }}
                      className="absolute top-2 right-2 p-1 rounded-full bg-rose-600 text-white hover:bg-rose-700"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Upload Progress Bar */}
            {isUploading && (
              <div className="space-y-1.5 p-3 rounded-xl bg-blue-50 border border-blue-200">
                <div className="flex justify-between text-xs font-bold text-blue-900">
                  <span>Mengunggah file ke Firebase Storage...</span>
                  <span>{uploadProgress}%</span>
                </div>
                <div className="w-full h-2 bg-blue-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-600 transition-all duration-300"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isUploading}
              className="w-full neu-button text-white py-3 px-4 rounded-xl text-xs sm:text-sm font-extrabold flex items-center justify-center gap-2 cursor-pointer shadow-lg disabled:opacity-60"
            >
              <UploadCloud className="w-4 h-4" />
              <span>{isUploading ? `Mengunggah (${uploadProgress}%)...` : 'Publikasikan Clips Sekarang'}</span>
            </button>
          </form>
        </div>

        {/* My Clips List & Guidelines (1 col) */}
        <div className="space-y-6">
          <div className="neu-card p-6 bg-white space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-extrabold text-sm sm:text-base text-slate-900 flex items-center gap-2">
                <Clock className="w-4 h-4 text-blue-600" />
                <span>Clips Milik Anda ({myClips.length})</span>
              </h3>
              <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
                Edit & Hapus Mandiri
              </span>
            </div>

            {myClips.length > 0 ? (
              <div className="space-y-3 max-h-[520px] overflow-y-auto pr-1">
                {myClips.map((c) => (
                  <div
                    key={c.clipId}
                    className="p-3 rounded-xl bg-slate-50 border border-slate-100 space-y-2 text-xs"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <h4 className="font-bold text-slate-800 line-clamp-1">{c.title}</h4>
                        <p className="text-[10px] text-slate-400 mt-0.5">
                          ID: <span className="text-blue-700 font-mono">{c.slug}</span> · {c.downloadCount} unduhan · {c.likeCount || 0} suka
                        </p>
                      </div>
                      <span
                        className={`text-[9px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider shrink-0 ${
                          c.published ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-700'
                        }`}
                      >
                        {c.published ? 'Tayang' : 'Draft'}
                      </span>
                    </div>

                    <div className="flex items-center justify-end gap-1.5 pt-1 border-t border-slate-200/50">
                      <button
                        onClick={() => onNavigate(`/clips/${c.slug}`)}
                        className="px-2 py-1 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 font-bold shrink-0 text-[11px] flex items-center gap-1 cursor-pointer"
                        title="Buka Halaman Publik"
                      >
                        <ExternalLink className="w-3 h-3" />
                        <span>Lihat</span>
                      </button>
                      <button
                        onClick={() => handleStartEdit(c)}
                        className="px-2 py-1 rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 font-bold shrink-0 text-[11px] flex items-center gap-1 cursor-pointer"
                        title="Edit Info Clip Ini"
                      >
                        <Edit3 className="w-3 h-3" />
                        <span>Edit</span>
                      </button>
                      <button
                        onClick={() => handleDeleteMyClip(c)}
                        className="px-2 py-1 rounded-lg bg-rose-50 text-rose-600 hover:bg-rose-100 font-bold shrink-0 text-[11px] flex items-center gap-1 cursor-pointer"
                        title="Hapus Clip Milik Sendiri"
                      >
                        <Trash2 className="w-3 h-3" />
                        <span>Hapus</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 space-y-2">
                <p className="text-xs font-bold text-slate-600">Belum ada clips yang diunggah</p>
                <p className="text-[11px] text-slate-400">
                  Gunakan formulir di sebelah kiri untuk mengunggah clips Persib pertama Anda!
                </p>
              </div>
            )}
          </div>

          {/* Aturan Khusus Admin */}
          <div className="neu-card p-5 bg-gradient-to-br from-blue-50 to-indigo-50/50 border border-blue-100 text-xs space-y-2.5">
            <h4 className="font-bold text-blue-900 flex items-center gap-1.5">
              <ShieldAlert className="w-4 h-4 text-blue-600" />
              <span>Ketentuan & Hak Akses Admin</span>
            </h4>
            <ul className="space-y-1.5 text-slate-600 text-[11px] leading-relaxed list-disc list-inside">
              <li>
                <strong className="text-blue-900">Clips Sendiri:</strong> Anda dapat mengedit judul, nama pembuat, deskripsi, dan menghapus clips yang Anda unggah sendiri.
              </li>
              <li>
                <strong className="text-rose-700">Clips Admin Lain:</strong> Anda <span className="underline decoration-rose-400 font-bold">tidak dapat</span> mengedit atau menghapus clips milik admin lain.
              </li>
              <li>
                <strong className="text-slate-800">Hak Owner:</strong> Hanya akun Owner yang memiliki wewenang untuk mengelola atau menghapus seluruh clips lintas admin.
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* MODAL EDIT CLIP MILIK SENDIRI */}
      {editingClip && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="neu-card p-6 bg-white max-w-lg w-full space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Edit3 className="w-4 h-4 text-blue-600" />
                <h3 className="font-black text-slate-900 text-base">Edit Clips Anda</h3>
              </div>
              <button
                onClick={() => setEditingClip(null)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveClipEdit} className="space-y-3.5 text-xs">
              <div className="space-y-1">
                <label className="font-bold text-slate-700 block">Judul Clips *</label>
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full neu-input px-3 py-2 text-xs"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700 block">Nama Pembuat / Sumber *</label>
                <input
                  type="text"
                  value={editCreator}
                  onChange={(e) => setEditCreator(e.target.value)}
                  className="w-full neu-input px-3 py-2 text-xs"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700 block">Deskripsi</label>
                <textarea
                  rows={3}
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  className="w-full neu-input p-3 text-xs"
                />
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100">
                <div>
                  <span className="font-bold text-slate-800 block text-xs">Status Publikasi</span>
                  <span className="text-[10px] text-slate-400">
                    {editPublished ? 'Clips aktif dan dapat dilihat Bobotoh' : 'Clips disembunyikan (Draft)'}
                  </span>
                </div>
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
                  <span>{isUpdatingClip ? 'Menyimpan...' : 'Simpan Perubahan'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
