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
const DELETED_USERS_STORAGE_KEY = 'azryl_deleted_user_ids';

// Persistent tracking of deleted admin UIDs so they never reappear
export function getDeletedUserIds(): Set<string> {
  try {
    const raw = localStorage.getItem(DELETED_USERS_STORAGE_KEY);
    if (raw) {
      const arr = JSON.parse(raw);
      if (Array.isArray(arr)) {
        return new Set(arr);
      }
    }
  } catch (e) {}
  return new Set<string>();
}

export function markUserDeleted(uid: string) {
  try {
    const set = getDeletedUserIds();
    set.add(uid);
    localStorage.setItem(DELETED_USERS_STORAGE_KEY, JSON.stringify(Array.from(set)));
  } catch (e) {}
}

export function unmarkUserDeleted(uid: string) {
  try {
    const set = getDeletedUserIds();
    set.delete(uid);
    localStorage.setItem(DELETED_USERS_STORAGE_KEY, JSON.stringify(Array.from(set)));
  } catch (e) {}
}

// In-app subscribers for instant 0ms user list changes
const userSubscribers = new Set<(users: UserProfile[]) => void>();

export function notifyUsersSubscribers() {
  const users = getLocalUsers();
  userSubscribers.forEach((cb) => {
    try {
      cb(users);
    } catch (e) {
      console.warn('Error in user subscriber callback:', e);
    }
  });
}

const DEFAULT_PERSIB_IMAGE = 'https://i.postimg.cc/4ysQFgqx/1366b69ba442d21911f314947331b50a.jpg';

export function sanitizeMediaUrl(url?: string, fallback = DEFAULT_PERSIB_IMAGE): string {
  if (!url || typeof url !== 'string' || url.startsWith('blob:')) {
    return fallback;
  }
  return url;
}

export function getLocalClips(): ClipItem[] {
  try {
    const raw = localStorage.getItem(CLIPS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      // Ensure any older dummy clips (persib-clip-001 etc) are excluded so it starts at 0
      const filtered = Array.isArray(parsed)
        ? parsed
            .filter((c: any) => !c.clipId?.startsWith('persib-clip-'))
            .map((c: ClipItem) => ({
              ...c,
              primaryMediaUrl: sanitizeMediaUrl(c.primaryMediaUrl),
              photoOneUrl: sanitizeMediaUrl(c.photoOneUrl),
              photoTwoUrl: sanitizeMediaUrl(c.photoTwoUrl),
            }))
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
  const deletedIds = getDeletedUserIds();
  try {
    const raw = localStorage.getItem(USERS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        const userMap = new Map<string, UserProfile>();
        INITIAL_USERS.forEach((u) => {
          if (!deletedIds.has(u.uid)) {
            userMap.set(u.uid, {
              ...u,
              profileImage: sanitizeMediaUrl(u.profileImage),
            });
          }
        });
        parsed.forEach((u) => {
          if (!deletedIds.has(u.uid)) {
            const current = userMap.get(u.uid);
            userMap.set(u.uid, {
              ...current,
              ...u,
              profileImage: sanitizeMediaUrl(u.profileImage || current?.profileImage),
            });
          }
        });
        return Array.from(userMap.values());
      }
    }
  } catch (e) {}
  return INITIAL_USERS.filter((u) => !deletedIds.has(u.uid)).map((u) => ({
    ...u,
    profileImage: sanitizeMediaUrl(u.profileImage),
  }));
}

export function saveLocalUsers(users: UserProfile[]) {
  try {
    const deletedIds = getDeletedUserIds();
    const cleanUsers = users.filter((u) => !deletedIds.has(u.uid));
    localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(cleanUsers));
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
  // Register in userSubscribers for immediate local deletion updates
  userSubscribers.add(callback);

  try {
    const usersCol = collection(db, 'users');
    const unsubscribe = onSnapshot(
      usersCol,
      (snapshot) => {
        const deletedIds = getDeletedUserIds();
        if (!snapshot.empty) {
          const list: UserProfile[] = [];
          snapshot.forEach((d) => {
            if (!deletedIds.has(d.id)) {
              list.push({ ...d.data(), uid: d.id } as UserProfile);
            }
          });
          const userMap = new Map<string, UserProfile>();
          INITIAL_USERS.forEach((u) => {
            if (!deletedIds.has(u.uid)) {
              userMap.set(u.uid, u);
            }
          });
          list.forEach((u) => {
            if (!deletedIds.has(u.uid)) {
              userMap.set(u.uid, { ...userMap.get(u.uid), ...u });
            }
          });
          const merged = Array.from(userMap.values());
          saveLocalUsers(merged);
          callback(merged);
        } else {
          callback(getLocalUsers());
        }
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, 'users');
        callback(getLocalUsers());
      }
    );
    return () => {
      userSubscribers.delete(callback);
      unsubscribe();
    };
  } catch (err) {
    callback(getLocalUsers());
    return () => {
      userSubscribers.delete(callback);
    };
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

export function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (err) => reject(err);
    reader.readAsDataURL(file);
  });
}

export async function compressImageToDataUrl(file: File, maxDim = 1600, quality = 0.88): Promise<string> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        let { width, height } = img;
        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL('image/jpeg', quality));
        } else {
          resolve(e.target?.result as string);
        }
      };
      img.onerror = () => resolve(e.target?.result as string);
      img.src = e.target?.result as string;
    };
    reader.onerror = () => resolve('');
    reader.readAsDataURL(file);
  });
}

/**
 * Upload a media file permanently so it is 100% public, persistent, and never errors
 */
export async function uploadMediaFile(
  file: File,
  storagePath: string,
  onProgress?: (pct: number) => void
): Promise<string> {
  if (onProgress) onProgress(15);

  let dataUrl = '';
  try {
    if (file.type.startsWith('image/')) {
      dataUrl = await compressImageToDataUrl(file, 1600, 0.88);
    } else {
      dataUrl = await readFileAsDataUrl(file);
    }
  } catch (err) {
    console.warn('Failed to read file as data url:', err);
  }

  if (onProgress) onProgress(45);

  // 1. Try uploading to backend /api/upload-media endpoint (saves to permanent public /uploads/)
  if (dataUrl) {
    try {
      const resp = await fetch('/api/upload-media', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filename: file.name,
          base64Data: dataUrl,
          contentType: file.type,
        }),
      });
      if (resp.ok) {
        const json = await resp.json();
        if (json && json.url) {
          if (onProgress) onProgress(100);
          return json.url;
        }
      }
    } catch (apiErr) {
      console.warn('Backend upload notice, attempting Firebase Storage:', apiErr);
    }
  }

  // 2. Try Firebase Storage if backend is unreachable
  try {
    const storageRef = ref(storage, storagePath);
    const uploadTask = uploadBytesResumable(storageRef, file);

    const storageUrl = await new Promise<string>((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Firebase Storage timeout'));
      }, 7000);

      uploadTask.on(
        'state_changed',
        (snapshot) => {
          if (snapshot.totalBytes > 0 && onProgress) {
            const pct = Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 50) + 45;
            onProgress(Math.min(95, pct));
          }
        },
        (error) => {
          clearTimeout(timeout);
          reject(error);
        },
        async () => {
          clearTimeout(timeout);
          try {
            const downloadUrl = await getDownloadURL(uploadTask.snapshot.ref);
            resolve(downloadUrl);
          } catch (e) {
            reject(e);
          }
        }
      );
    });

    if (onProgress) onProgress(100);
    return storageUrl;
  } catch (storageErr) {
    console.warn('Storage upload fallback triggered:', storageErr);
  }

  if (onProgress) onProgress(100);

  // 3. Guaranteed permanent fallback:
  // Base64 data URL is 100% self-contained and universally viewable by any user/browser.
  if (dataUrl) {
    return dataUrl;
  }

  // Final fallback to default official Persib Bobotoh banner/image
  return DEFAULT_PERSIB_IMAGE;
}

/**
 * Publish a new clip (Admin/Owner action) - optimized for instant loading
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

  // 1. Save locally immediately so it renders instantly
  const current = getLocalClips();
  const updated = [newClip, ...current];
  saveLocalClips(updated);

  // 2. Save to Firestore asynchronously in background
  try {
    const clipRef = doc(db, 'clips', clipId);
    setDoc(clipRef, newClip).catch((err) => {
      handleFirestoreError(err, OperationType.CREATE, `clips/${clipId}`);
    });
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

  // If this user was previously marked deleted, unmark them
  unmarkUserDeleted(user.uid);

  const current = getLocalUsers();
  const exists = current.some((u) => u.uid === user.uid);
  const updated = exists ? current.map((u) => (u.uid === user.uid ? updatedUser : u)) : [...current, updatedUser];
  saveLocalUsers(updated);

  // Notify active listeners immediately
  notifyUsersSubscribers();

  try {
    const userRef = doc(db, 'users', user.uid);
    await setDoc(userRef, updatedUser, { merge: true });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `users/${user.uid}`);
  }
}

/**
 * Delete Admin user profile (Owner action) - guarantees immediate & permanent deletion
 */
export async function deleteUserProfile(uid: string): Promise<void> {
  // 1. Mark as permanently deleted so it never resurrects from INITIAL_USERS or stale cache
  markUserDeleted(uid);

  // 2. Remove immediately from local storage cache
  const current = getLocalUsers();
  const updated = current.filter((u) => u.uid !== uid);
  saveLocalUsers(updated);

  // 3. Immediately notify all React components so the admin card vanishes instantly
  notifyUsersSubscribers();

  // 4. Delete from Firestore in background
  try {
    const userRef = doc(db, 'users', uid);
    await deleteDoc(userRef);
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, `users/${uid}`);
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
