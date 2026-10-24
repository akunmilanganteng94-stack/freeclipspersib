import {
  collection,
  doc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  where,
  orderBy,
  serverTimestamp,
  increment,
} from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { db, storage, auth, OperationType, handleFirestoreError } from '../firebase/config';
import { ClipItem, UserProfile, SiteSettings } from '../types';

export const INITIAL_CLIPS: ClipItem[] = [];

export const INITIAL_USERS: UserProfile[] = [
  {
    uid: 'apriliansyah-owner-uid',
    email: 'apriliansyahazril10@gmail.com',
    role: 'owner',
    adminName: 'Azryl (Owner)',
    profileImage: 'https://i.postimg.cc/4ysQFgqx/1366b69ba442d21911f314947331b50a.jpg',
    bio: 'Founder & Lead Creator of AZRYL CLIPS. Berdedikasi membagikan video dan foto clips Persib Bandung kualitas terbaik untuk seluruh Bobotoh se-alam dunya.',
    tiktokUrl: 'https://www.tiktok.com/@azrylclips',
    instagramUrl: 'https://www.instagram.com/azrylclips',
    whatsappChannelUrl: 'https://whatsapp.com/channel/persib-azryl',
    active: true,
    createdAt: new Date(Date.now() - 3600000 * 24 * 30).toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    uid: 'dadan-admin-uid',
    email: 'dadan@azrylclips.com',
    role: 'admin',
    adminName: 'Kang Dadan Persib',
    profileImage: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300&h=300&fit=crop',
    bio: 'Photographer & Video Editor resmi komunitas Bobotoh. Mengabadikan setiap jengkal perjuangan Pangeran Biru di atas lapangan hijau.',
    tiktokUrl: 'https://www.tiktok.com/@dadan_persib',
    instagramUrl: 'https://www.instagram.com/dadan_persib',
    whatsappChannelUrl: 'https://whatsapp.com/channel/dadan-persib',
    active: true,
    createdAt: new Date(Date.now() - 3600000 * 24 * 15).toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    uid: 'angga-admin-uid',
    email: 'angga@azrylclips.com',
    role: 'admin',
    adminName: 'Angga Maung',
    profileImage: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300&h=300&fit=crop',
    bio: 'Matchday videographer. Spesialis video slow-motion selebrasi gol dan chant Bobotoh tribun timur.',
    tiktokUrl: 'https://www.tiktok.com/@anggamaung33',
    instagramUrl: 'https://www.instagram.com/anggamaung',
    active: true,
    createdAt: new Date(Date.now() - 3600000 * 24 * 10).toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

export const DEFAULT_SETTINGS: SiteSettings = {
  siteName: 'FREE CLIPS PERSIB',
  description: 'Free Persib Bandung Clips',
  footerText: 'FREE CLIPS PERSIB — Free Persib Clips',
  watermarkText: 'Powered by AZRYL',
  maintenanceMode: false,
  announcement: '🔥 Wilujeng Sumping Bobotoh! Download clips terbaru Persib Bandung sekarang secara gratis tanpa login!',
  apkDownloadUrl: 'https://archive.org/download/azryl-clips-persib/AzrylClipsPersib.apk',
  apkVersionName: 'v1.0.0 (Official)',
  apkReleaseNotes: 'Aplikasi resmi Android Bobotoh Persib untuk nonton dan unduh clips HD dengan cepat & gratis.',
  apkEnabled: true,
};

// Local storage backup keys for offline / demo fallback
const CLIPS_STORAGE_KEY = 'free_persib_clips_data_clean';
const USERS_STORAGE_KEY = 'azryl_users_data';
const SETTINGS_STORAGE_KEY = 'azryl_settings_data_v2';

export function getLocalClips(): ClipItem[] {
  try {
    const raw = localStorage.getItem(CLIPS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      // Ensure any older dummy clips (persib-clip-001 etc) are excluded so it starts at 0
      const filtered = Array.isArray(parsed)
        ? parsed.filter((c: any) => !c.clipId?.startsWith('persib-clip-'))
        : [];
      return filtered;
    }
  } catch (e) {}
  return [];
}

export function saveLocalClips(clips: ClipItem[]) {
  try {
    localStorage.setItem(CLIPS_STORAGE_KEY, JSON.stringify(clips));
  } catch (e) {}
}

export function getLocalUsers(): UserProfile[] {
  try {
    const raw = localStorage.getItem(USERS_STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {}
  return INITIAL_USERS;
}

export function saveLocalUsers(users: UserProfile[]) {
  try {
    localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users));
  } catch (e) {}
}

export function getLocalSettings(): SiteSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {}
  return DEFAULT_SETTINGS;
}

export function saveLocalSettings(settings: SiteSettings) {
  try {
    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
  } catch (e) {}
}

/**
 * Record a download event and increment download tally
 */
export async function trackDownload(clipId: string, mediaType: string): Promise<number | null> {
  // 1. Call server idempotency endpoint
  try {
    await fetch('/api/record-download', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        clipId,
        mediaType,
        requestId: `${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      }),
    });
  } catch (e) {
    console.warn('Backend download tracking notification:', e);
  }

  // 2. Increment in local cache immediately
  const localClips = getLocalClips();
  let updatedCount = 0;
  const updatedClips = localClips.map((c) => {
    if (c.clipId === clipId) {
      updatedCount = (c.downloadCount || 0) + 1;
      return { ...c, downloadCount: updatedCount };
    }
    return c;
  });
  saveLocalClips(updatedClips);

  // 3. Increment in Firestore if available
  try {
    const clipRef = doc(db, 'clips', clipId);
    await updateDoc(clipRef, {
      downloadCount: increment(1),
      updatedAt: new Date().toISOString(),
    });
  } catch (firestoreErr) {
    // If guest permissions prevent direct increment or collection not initialized yet
    handleFirestoreError(firestoreErr, OperationType.UPDATE, `clips/${clipId}`);
  }

  return updatedCount;
}

const LIKES_STORAGE_KEY = 'azryl_liked_clips_list';

export function isClipLikedLocally(clipId: string): boolean {
  try {
    const raw = localStorage.getItem(LIKES_STORAGE_KEY);
    if (!raw) return false;
    const list: string[] = JSON.parse(raw);
    return list.includes(clipId);
  } catch {
    return false;
  }
}

export async function toggleClipLike(clipId: string): Promise<{ liked: boolean; newCount: number }> {
  let isLiked = false;
  try {
    const raw = localStorage.getItem(LIKES_STORAGE_KEY);
    const list: string[] = raw ? JSON.parse(raw) : [];
    if (list.includes(clipId)) {
      const nextList = list.filter((id) => id !== clipId);
      localStorage.setItem(LIKES_STORAGE_KEY, JSON.stringify(nextList));
      isLiked = false;
    } else {
      list.push(clipId);
      localStorage.setItem(LIKES_STORAGE_KEY, JSON.stringify(list));
      isLiked = true;
    }
  } catch {
    isLiked = true;
  }

  // Update local cache
  const localClips = getLocalClips();
  let newCount = 0;
  const updatedClips = localClips.map((c) => {
    if (c.clipId === clipId) {
      const current = c.likeCount || 0;
      newCount = isLiked ? current + 1 : Math.max(0, current - 1);
      return { ...c, likeCount: newCount };
    }
    return c;
  });
  saveLocalClips(updatedClips);

  // Update Firestore
  try {
    const clipRef = doc(db, 'clips', clipId);
    await updateDoc(clipRef, {
      likeCount: increment(isLiked ? 1 : -1),
      updatedAt: new Date().toISOString(),
    });
  } catch (firestoreErr) {
    handleFirestoreError(firestoreErr, OperationType.UPDATE, `clips/${clipId}`);
  }

  return { liked: isLiked, newCount };
}

/**
 * Subscribe to real-time clips updates
 */
export function subscribeToClips(callback: (clips: ClipItem[]) => void): () => void {
  try {
    const clipsCol = collection(db, 'clips');
    const q = query(clipsCol, orderBy('createdAt', 'desc'));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        if (!snapshot.empty) {
          const list: ClipItem[] = [];
          snapshot.forEach((d) => {
            list.push({ ...d.data(), clipId: d.id } as ClipItem);
          });
          saveLocalClips(list);
          callback(list);
        } else {
          // If Firestore is still empty, deliver initialized clips
          callback(getLocalClips());
        }
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, 'clips');
        callback(getLocalClips());
      }
    );

    return unsubscribe;
  } catch (err) {
    callback(getLocalClips());
    return () => {};
  }
}

/**
 * Subscribe to all admins & users
 */
export function subscribeToUsers(callback: (users: UserProfile[]) => void): () => void {
  try {
    const usersCol = collection(db, 'users');
    const unsubscribe = onSnapshot(
      usersCol,
      (snapshot) => {
        if (!snapshot.empty) {
          const list: UserProfile[] = [];
          snapshot.forEach((d) => {
            list.push({ ...d.data(), uid: d.id } as UserProfile);
          });
          saveLocalUsers(list);
          callback(list);
        } else {
          callback(getLocalUsers());
        }
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, 'users');
        callback(getLocalUsers());
      }
    );
    return unsubscribe;
  } catch (err) {
    callback(getLocalUsers());
    return () => {};
  }
}

/**
 * Subscribe to website settings
 */
export function subscribeToSettings(callback: (settings: SiteSettings) => void): () => void {
  try {
    const settingsDoc = doc(db, 'settings', 'general');
    const unsubscribe = onSnapshot(
      settingsDoc,
      (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.data() as SiteSettings;
          saveLocalSettings(data);
          callback(data);
        } else {
          callback(getLocalSettings());
        }
      },
      (error) => {
        handleFirestoreError(error, OperationType.GET, 'settings/general');
        callback(getLocalSettings());
      }
    );
    return unsubscribe;
  } catch (err) {
    callback(getLocalSettings());
    return () => {};
  }
}

/**
 * Upload a media file to Firebase Storage with progress tracking
 */
export async function uploadMediaFile(
  file: File,
  path: string,
  onProgress?: (pct: number) => void
): Promise<string> {
  try {
    const storageRef = ref(storage, path);
    const uploadTask = uploadBytesResumable(storageRef, file);

    return new Promise((resolve, reject) => {
      uploadTask.on(
        'state_changed',
        (snapshot) => {
          const progress = Math.round(
            (snapshot.bytesTransferred / snapshot.totalBytes) * 100
          );
          if (onProgress) onProgress(progress);
        },
        (error) => {
          console.warn('Storage upload error, generating local object URL fallback:', error);
          // Fallback: create object URL so user is never blocked
          const localUrl = URL.createObjectURL(file);
          resolve(localUrl);
        },
        async () => {
          try {
            const downloadUrl = await getDownloadURL(uploadTask.snapshot.ref);
            resolve(downloadUrl);
          } catch (e) {
            const localUrl = URL.createObjectURL(file);
            resolve(localUrl);
          }
        }
      );
    });
  } catch (err) {
    console.warn('Upload error:', err);
    return URL.createObjectURL(file);
  }
}

/**
 * Publish a new clip (Admin/Owner action)
 */
export async function createNewClip(clipData: Omit<ClipItem, 'clipId' | 'downloadCount' | 'likeCount' | 'createdAt'>): Promise<ClipItem> {
  const clipId = `clip_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
  const now = new Date().toISOString();

  const newClip: ClipItem = {
    ...clipData,
    clipId,
    downloadCount: 0,
    likeCount: 0,
    createdAt: now,
    updatedAt: now,
  };

  // 1. Save locally
  const current = getLocalClips();
  const updated = [newClip, ...current];
  saveLocalClips(updated);

  // 2. Save to Firestore
  try {
    const clipRef = doc(db, 'clips', clipId);
    await setDoc(clipRef, newClip);
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, `clips/${clipId}`);
  }

  return newClip;
}

/**
 * Update an existing clip (Owner or uploader Admin)
 */
export async function updateClip(
  clipId: string,
  updates: Partial<ClipItem>,
  currentUser?: { uid: string; role: string }
): Promise<void> {
  const current = getLocalClips();
  const existing = current.find((c) => c.clipId === clipId);

  // Enforce permission: Admin can only edit their own clips, Owner can edit all
  if (currentUser && currentUser.role !== 'owner') {
    if (existing && existing.uploaderUid !== currentUser.uid) {
      throw new Error('Akses ditolak: Admin hanya dapat mengubah clips yang diunggah sendiri!');
    }
  }

  const now = new Date().toISOString();
  // 1. Update locally
  const updated = current.map((c) => (c.clipId === clipId ? { ...c, ...updates, updatedAt: now } : c));
  saveLocalClips(updated);

  // 2. Update Firestore
  try {
    const clipRef = doc(db, 'clips', clipId);
    await updateDoc(clipRef, { ...updates, updatedAt: now });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `clips/${clipId}`);
  }
}

/**
 * Delete a clip (Owner or uploader Admin)
 */
export async function deleteClip(
  clipId: string,
  currentUser?: { uid: string; role: string }
): Promise<void> {
  const current = getLocalClips();
  const existing = current.find((c) => c.clipId === clipId);

  // Enforce permission: Admin can only delete their own clips, Owner can delete all
  if (currentUser && currentUser.role !== 'owner') {
    if (existing && existing.uploaderUid !== currentUser.uid) {
      throw new Error('Akses ditolak: Admin hanya dapat menghapus clips yang diunggah sendiri!');
    }
  }

  // 1. Delete locally
  const updated = current.filter((c) => c.clipId !== clipId);
  saveLocalClips(updated);

  // 2. Delete from Firestore
  try {
    const clipRef = doc(db, 'clips', clipId);
    await deleteDoc(clipRef);
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, `clips/${clipId}`);
  }
}

/**
 * Save / Update Admin profile (Owner action)
 */
export async function saveUserProfile(user: UserProfile): Promise<void> {
  const now = new Date().toISOString();
  const updatedUser = { ...user, updatedAt: now };

  const current = getLocalUsers();
  const exists = current.some((u) => u.uid === user.uid);
  const updated = exists ? current.map((u) => (u.uid === user.uid ? updatedUser : u)) : [...current, updatedUser];
  saveLocalUsers(updated);

  try {
    const userRef = doc(db, 'users', user.uid);
    await setDoc(userRef, updatedUser, { merge: true });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `users/${user.uid}`);
  }
}

/**
 * Save Site Settings (Owner action)
 */
export async function updateSiteSettings(settings: Partial<SiteSettings>): Promise<void> {
  const now = new Date().toISOString();
  const current = getLocalSettings();
  const updated = { ...current, ...settings, updatedAt: now };
  saveLocalSettings(updated);

  try {
    const settingsRef = doc(db, 'settings', 'general');
    await setDoc(settingsRef, updated, { merge: true });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, 'settings/general');
  }
}
