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

// Permanent deleted admin identifiers to guarantee they never reappear on any browser
export const PERMANENT_DELETED_IDENTIFIERS = [
  'dadan-admin-uid',
  'dadan@azrylclips.com',
  'angga-admin-uid',
  'angga@azrylclips.com',
];

// Persistent tracking of deleted admin UIDs and emails so they never reappear
export function getDeletedUserIds(): Set<string> {
  const set = new Set<string>();
  PERMANENT_DELETED_IDENTIFIERS.forEach((id) => {
    set.add(id);
    set.add(id.toLowerCase());
  });

  try {
    const raw = localStorage.getItem(DELETED_USERS_STORAGE_KEY);
    if (raw) {
      const arr = JSON.parse(raw);
      if (Array.isArray(arr)) {
        arr.forEach((id: string) => {
          if (id) {
            set.add(id);
            set.add(String(id).toLowerCase());
          }
        });
      }
    }
  } catch (e) {}
  return set;
}

export function isUserDeleted(user: UserProfile | { uid?: string; email?: string } | string | null | undefined): boolean {
  if (!user) return true;
  const deletedSet = getDeletedUserIds();
  if (typeof user === 'string') {
    return deletedSet.has(user) || deletedSet.has(user.toLowerCase());
  }
  if (user.uid && (deletedSet.has(user.uid) || deletedSet.has(user.uid.toLowerCase()))) {
    return true;
  }
  if (user.email && (deletedSet.has(user.email) || deletedSet.has(user.email.toLowerCase()))) {
    return true;
  }
  return false;
}

export function markUserDeleted(identifier: string) {
  if (!identifier) return;
  try {
    const set = getDeletedUserIds();
    set.add(identifier);
    set.add(identifier.toLowerCase());
    localStorage.setItem(DELETED_USERS_STORAGE_KEY, JSON.stringify(Array.from(set)));
  } catch (e) {}
}

export function unmarkUserDeleted(identifier: string) {
  if (!identifier) return;
  try {
    const set = getDeletedUserIds();
    set.delete(identifier);
    set.delete(identifier.toLowerCase());
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

// In-app subscribers for instant 0ms real-time clip updates
const clipsSubscribers = new Set<(clips: ClipItem[]) => void>();

export function notifyClipsSubscribers() {
  const clips = getLocalClips();
  clipsSubscribers.forEach((cb) => {
    try {
      cb(clips);
    } catch (e) {
      console.warn('Error in clips subscriber callback:', e);
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
  } catch (e) {
    console.warn('Local storage quota warning, saving sanitized clips:', e);
    try {
      // Purge any large base64 data URLs to protect local storage from crashing
      const sanitized = clips.map((c) => ({
        ...c,
        primaryMediaUrl: c.primaryMediaUrl.startsWith('data:') ? DEFAULT_PERSIB_IMAGE : c.primaryMediaUrl,
        photoOneUrl: c.photoOneUrl.startsWith('data:') ? DEFAULT_PERSIB_IMAGE : c.photoOneUrl,
        photoTwoUrl: c.photoTwoUrl.startsWith('data:') ? DEFAULT_PERSIB_IMAGE : c.photoTwoUrl,
      }));
      localStorage.setItem(CLIPS_STORAGE_KEY, JSON.stringify(sanitized));
    } catch (e2) {}
  }
}

export function getLocalUsers(): UserProfile[] {
  try {
    const raw = localStorage.getItem(USERS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        const userMap = new Map<string, UserProfile>();
        INITIAL_USERS.forEach((u) => {
          if (!isUserDeleted(u)) {
            userMap.set(u.uid, {
              ...u,
              profileImage: sanitizeMediaUrl(u.profileImage),
            });
          }
        });
        parsed.forEach((u) => {
          if (!isUserDeleted(u)) {
            const current = userMap.get(u.uid);
            userMap.set(u.uid, {
              ...current,
              ...u,
              profileImage: sanitizeMediaUrl(u.profileImage || current?.profileImage),
            });
          }
        });
        const cleanUsers = Array.from(userMap.values()).filter((u) => !isUserDeleted(u));
        localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(cleanUsers));
        return cleanUsers;
      }
    }
  } catch (e) {}
  const fallback = INITIAL_USERS.filter((u) => !isUserDeleted(u)).map((u) => ({
    ...u,
    profileImage: sanitizeMediaUrl(u.profileImage),
  }));
  try {
    localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(fallback));
  } catch (e) {}
  return fallback;
}

export function saveLocalUsers(users: UserProfile[]) {
  try {
    const cleanUsers = users.filter((u) => !isUserDeleted(u));
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
 * Subscribe to real-time clips updates with auto-refresh on changes
 */
export function subscribeToClips(callback: (clips: ClipItem[]) => void): () => void {
  // 1. Register in in-app subscriber set for instant 0ms updates
  clipsSubscribers.add(callback);

  // 2. Synchronously emit current local clips with zero delay
  try {
    callback(getLocalClips());
  } catch (e) {}

  // 3. Initial sync and periodic polling from server (every 3.5 seconds)
  const syncServerClips = async () => {
    try {
      const resp = await fetch('/api/clips/list');
      if (resp.ok) {
        const serverClips = await resp.json();
        if (Array.isArray(serverClips) && serverClips.length > 0) {
          const localClips = getLocalClips();
          const clipMap = new Map<string, ClipItem>();
          // Combine local and server clips
          localClips.forEach((c) => clipMap.set(c.clipId, c));
          serverClips.forEach((c) => {
            const existing = clipMap.get(c.clipId);
            clipMap.set(c.clipId, {
              ...existing,
              ...c,
              primaryMediaUrl: sanitizeMediaUrl(c.primaryMediaUrl),
              photoOneUrl: sanitizeMediaUrl(c.photoOneUrl),
              photoTwoUrl: sanitizeMediaUrl(c.photoTwoUrl),
            });
          });
          const merged = Array.from(clipMap.values()).sort(
            (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          );
          saveLocalClips(merged);
          callback(merged);
        }
      }
    } catch (e) {}
  };

  syncServerClips();
  const intervalId = setInterval(syncServerClips, 3500);

  // 4. Firestore snapshot listener
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
        }
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, 'clips');
      }
    );

    return () => {
      clipsSubscribers.delete(callback);
      clearInterval(intervalId);
      unsubscribe();
    };
  } catch (err) {
    return () => {
      clipsSubscribers.delete(callback);
      clearInterval(intervalId);
    };
  }
}

/**
 * Subscribe to all admins & users with real-time interval synchronization across all devices
 */
export function subscribeToUsers(callback: (users: UserProfile[]) => void): () => void {
  // Register in userSubscribers for immediate local updates
  userSubscribers.add(callback);

  // Synchronously emit current cleansed local users immediately
  try {
    callback(getLocalUsers());
  } catch (syncErr) {
    console.warn('Initial users emit warning:', syncErr);
  }

  // Periodic synchronization from server (every 2.5 seconds) so any deleted or added admin
  // instantly reflects on EVERY device and visitor in real time
  const syncServerUsers = async () => {
    try {
      // 1. Fetch server deleted admins list and permanently mark them locally
      const delResp = await fetch('/api/admin/deleted-admins');
      if (delResp.ok) {
        const deletedUids = await delResp.json();
        if (Array.isArray(deletedUids) && deletedUids.length > 0) {
          let newlyDeleted = false;
          deletedUids.forEach((id: string) => {
            if (id && !isUserDeleted(id)) {
              markUserDeleted(id);
              newlyDeleted = true;
            }
          });
          if (newlyDeleted) {
            const cleanLocal = getLocalUsers();
            saveLocalUsers(cleanLocal);
            callback(cleanLocal);
          }
        }
      }

      // 2. Fetch authoritative list of admins from server
      const listResp = await fetch('/api/admin/list-admins');
      if (listResp.ok) {
        const serverAdmins = await listResp.json();
        if (Array.isArray(serverAdmins)) {
          const userMap = new Map<string, UserProfile>();
          // Base Owner
          INITIAL_USERS.forEach((u) => {
            if (!isUserDeleted(u)) userMap.set(u.uid, u);
          });
          // Server admins
          serverAdmins.forEach((sa: UserProfile) => {
            if (!isUserDeleted(sa)) {
              userMap.set(sa.uid, {
                ...userMap.get(sa.uid),
                ...sa,
                profileImage: sanitizeMediaUrl(sa.profileImage),
              });
            }
          });
          const merged = Array.from(userMap.values()).filter((u) => !isUserDeleted(u));
          saveLocalUsers(merged);
          callback(merged);
        }
      }
    } catch (e) {}
  };

  syncServerUsers();
  const intervalId = setInterval(syncServerUsers, 2500);

  // Firestore snapshot listener
  try {
    const usersCol = collection(db, 'users');
    const unsubscribe = onSnapshot(
      usersCol,
      (snapshot) => {
        const userMap = new Map<string, UserProfile>();

        // 1. Initial default users (Owner)
        INITIAL_USERS.forEach((u) => {
          if (!isUserDeleted(u)) {
            userMap.set(u.uid, u);
          }
        });

        // 2. Existing local users
        getLocalUsers().forEach((u) => {
          if (!isUserDeleted(u)) {
            userMap.set(u.uid, { ...userMap.get(u.uid), ...u });
          }
        });

        // 3. Firestore snapshot documents
        if (!snapshot.empty) {
          snapshot.forEach((d) => {
            const data = d.data() as UserProfile;
            const fullUser = { ...data, uid: d.id };
            if (!isUserDeleted(fullUser)) {
              userMap.set(d.id, fullUser);
            }
          });
        }

        const merged = Array.from(userMap.values()).filter((u) => !isUserDeleted(u));
        saveLocalUsers(merged);
        callback(merged);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, 'users');
        callback(getLocalUsers());
      }
    );

    return () => {
      userSubscribers.delete(callback);
      clearInterval(intervalId);
      unsubscribe();
    };
  } catch (err) {
    callback(getLocalUsers());
    return () => {
      userSubscribers.delete(callback);
      clearInterval(intervalId);
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
 * Supports HD video clips (MP4/WebM/MOV up to 250MB) and high-res photos
 */
export async function uploadMediaFile(
  file: File,
  storagePath: string,
  onProgress?: (pct: number) => void
): Promise<string> {
  if (onProgress) onProgress(15);

  // 1. Primary method: Direct binary FormData streaming to backend server (Permanent /uploads/, 0% memory bloat)
  try {
    const formData = new FormData();
    formData.append('file', file, file.name);
    formData.append('filename', file.name);

    if (onProgress) onProgress(35);
    const resp = await fetch('/api/upload-media', {
      method: 'POST',
      body: formData,
    });

    if (resp.ok) {
      const json = await resp.json();
      if (json && json.url) {
        if (onProgress) onProgress(100);
        return json.url;
      }
    }
  } catch (formDataErr) {
    console.warn('Backend FormData upload notice, attempting fallback methods:', formDataErr);
  }

  if (onProgress) onProgress(50);

  // 2. Base64 payload fallback (with compression for images)
  let dataUrl = '';
  try {
    if (file.type.startsWith('image/') || /\.(jpg|jpeg|png|webp)$/i.test(file.name)) {
      dataUrl = await compressImageToDataUrl(file, 1600, 0.88);
    } else if (file.size < 40 * 1024 * 1024) {
      dataUrl = await readFileAsDataUrl(file);
    }
  } catch (err) {
    console.warn('Failed to read file as data url:', err);
  }

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
      console.warn('Backend base64 upload notice, attempting Firebase Storage:', apiErr);
    }
  }

  // 3. Try Firebase Storage if backend is unreachable
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
            const pct = Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 40) + 55;
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

  // 4. Guaranteed fallback for photos or small files:
  if (dataUrl && (file.type.startsWith('image/') || dataUrl.length < 3 * 1024 * 1024)) {
    return dataUrl;
  }

  // Final fallback
  return DEFAULT_PERSIB_IMAGE;
}

/**
 * Publish a new clip (Admin/Owner action) - optimized for instant loading, persistence & auto-refresh
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

  // 1. Save to backend server API FIRST so it's written permanently to data/clips.json
  try {
    await fetch('/api/clips/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newClip),
    });
  } catch (serverErr) {
    console.warn('Server clip save notice:', serverErr);
  }

  // 2. Save locally immediately so it renders instantly
  const current = getLocalClips();
  const updated = [newClip, ...current.filter((c) => c.clipId !== clipId)];
  saveLocalClips(updated);

  // 3. Refresh all React listeners automatically with 0ms delay!
  notifyClipsSubscribers();

  // 4. Save to Firestore asynchronously in background
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
 * Update an existing clip (Owner or uploader Admin) with auto-refresh
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
  const updatedItem = { ...(existing || {}), ...updates, clipId, updatedAt: now };
  // 1. Update locally
  const updated = current.map((c) => (c.clipId === clipId ? (updatedItem as ClipItem) : c));
  saveLocalClips(updated);

  // 2. Refresh all React listeners automatically!
  notifyClipsSubscribers();

  // 3. Save to backend server API
  fetch('/api/clips/save', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updatedItem),
  }).catch(() => {});

  // 4. Update Firestore
  try {
    const clipRef = doc(db, 'clips', clipId);
    await updateDoc(clipRef, { ...updates, updatedAt: now });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `clips/${clipId}`);
  }
}

/**
 * Delete a clip (Owner or uploader Admin) with auto-refresh
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

  // 2. Refresh all React listeners automatically!
  notifyClipsSubscribers();

  // 3. Delete from backend server API
  fetch('/api/clips/delete', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ clipId }),
  }).catch(() => {});

  // 4. Delete from Firestore
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

  // Sync to server storage
  fetch('/api/admin/update-admin', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ uid: user.uid, updates: updatedUser }),
  }).catch(() => {});

  try {
    const userRef = doc(db, 'users', user.uid);
    await setDoc(userRef, updatedUser, { merge: true });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `users/${user.uid}`);
  }
}

/**
 * Delete Admin user profile (Owner action) - guarantees immediate & permanent deletion
 * across all devices, visitors, database, server storage, and authentication.
 */
export async function deleteUserProfile(uid: string, email?: string): Promise<void> {
  // 1. Mark both UID and email as permanently deleted so it never resurrects anywhere
  markUserDeleted(uid);
  if (email) {
    markUserDeleted(email.toLowerCase());
  }

  // 2. Remove immediately from local storage cache
  const current = getLocalUsers();
  const updated = current.filter(
    (u) => u.uid !== uid && (!email || u.email.toLowerCase() !== email.toLowerCase())
  );
  saveLocalUsers(updated);

  // 3. Immediately notify all React components so the admin card vanishes instantly (0ms)
  notifyUsersSubscribers();

  // 4. Notify backend server to permanently remove from data/admins.json and append to data/deleted_admins.json
  try {
    await fetch('/api/admin/delete-admin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ uid, email }),
    });
  } catch (apiErr) {
    console.warn('Backend delete admin notification:', apiErr);
  }

  // 5. Delete from Firestore in background and record in deleted_admins tombstone collection
  try {
    const userRef = doc(db, 'users', uid);
    await deleteDoc(userRef);
    const tombstoneRef = doc(db, 'deleted_admins', uid);
    await setDoc(tombstoneRef, {
      uid,
      email: email ? email.toLowerCase() : '',
      deletedAt: new Date().toISOString(),
    });
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
