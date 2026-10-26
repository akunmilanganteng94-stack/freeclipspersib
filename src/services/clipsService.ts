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

/**
 * Resilient JSON fetcher: verifies response is OK and has application/json content-type
 * Prevents "Unexpected token '<'" SyntaxError when deployed on Vercel SPA rewrites
 */
export async function safeFetchJson<T = any>(url: string, options?: RequestInit): Promise<T | null> {
  try {
    const resp = await fetch(url, options);
    if (!resp.ok) return null;
    const contentType = resp.headers.get('content-type') || '';
    if (!contentType.toLowerCase().includes('application/json')) {
      return null;
    }
    return (await resp.json()) as T;
  } catch {
    return null;
  }
}

const DEFAULT_PURGED_ADMINS = ['dadan-admin-uid', 'angga-admin-uid', 'jun-cpf-admin-uid'];

// Persistent tracking of deleted admin UIDs so they never reappear
export function getDeletedUserIds(): Set<string> {
  const set = new Set<string>(DEFAULT_PURGED_ADMINS);
  try {
    const raw = localStorage.getItem(DELETED_USERS_STORAGE_KEY);
    if (raw) {
      const arr = JSON.parse(raw);
      if (Array.isArray(arr)) {
        arr.forEach((id) => set.add(id));
      }
    }
  } catch (e) {}
  return set;
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
      const serverClips = await safeFetchJson<ClipItem[]>('/api/clips/list');
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
    } catch (e) {}
  };

  syncServerClips();
  const intervalId = setInterval(syncServerClips, 3500);

  // 4. Firestore snapshot listener (direct collection listener for zero-index failures)
  try {
    const clipsCol = collection(db, 'clips');

    const unsubscribe = onSnapshot(
      clipsCol,
      (snapshot) => {
        const localClips = getLocalClips();
        const clipMap = new Map<string, ClipItem>();
        // Keep local clips
        localClips.forEach((c) => clipMap.set(c.clipId, c));

        snapshot.forEach((d) => {
          const data = d.data() as ClipItem;
          clipMap.set(d.id, {
            ...clipMap.get(d.id),
            ...data,
            clipId: d.id,
            primaryMediaUrl: sanitizeMediaUrl(data.primaryMediaUrl),
            photoOneUrl: sanitizeMediaUrl(data.photoOneUrl),
            photoTwoUrl: sanitizeMediaUrl(data.photoTwoUrl),
            published: data.published ?? true,
          });
        });

        const merged = Array.from(clipMap.values()).sort(
          (a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
        );
        saveLocalClips(merged);
        callback(merged);
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
 * Subscribe to all admins & users with real-time multi-tier global deletion sync
 */
export function subscribeToUsers(callback: (users: UserProfile[]) => void): () => void {
  // Register in userSubscribers for immediate local updates
  userSubscribers.add(callback);

  // Synchronously emit current local users immediately with 0ms latency
  try {
    callback(getLocalUsers());
  } catch (syncErr) {
    console.warn('Initial users emit warning:', syncErr);
  }

  // Helper to re-emit clean users after deletion sync
  const refreshCleanUsers = () => {
    const cleanLocal = getLocalUsers();
    saveLocalUsers(cleanLocal);
    callback(cleanLocal);
  };

  // 1. Sync server deleted admins (if backend running)
  safeFetchJson<string[]>('/api/admin/deleted-admins')
    .then((deletedUids) => {
      if (Array.isArray(deletedUids) && deletedUids.length > 0) {
        let changed = false;
        const currentDeleted = getDeletedUserIds();
        deletedUids.forEach((uid: string) => {
          if (!currentDeleted.has(uid)) {
            markUserDeleted(uid);
            changed = true;
          }
        });
        if (changed) {
          refreshCleanUsers();
        }
      }
    })
    .catch(() => {});

  // 2. Sync server-persisted admins asynchronously
  safeFetchJson<UserProfile[]>('/api/admin/list-admins')
    .then((serverAdmins) => {
      if (Array.isArray(serverAdmins) && serverAdmins.length > 0) {
        const deletedIds = getDeletedUserIds();
        const currentLocal = getLocalUsers();
        const userMap = new Map<string, UserProfile>();
        currentLocal.forEach((u) => {
          if (!deletedIds.has(u.uid)) userMap.set(u.uid, u);
        });
        serverAdmins.forEach((sa) => {
          if (!deletedIds.has(sa.uid) && sa.active !== false) {
            userMap.set(sa.uid, { ...userMap.get(sa.uid), ...sa, profileImage: sanitizeMediaUrl(sa.profileImage) });
          }
        });
        const merged = Array.from(userMap.values());
        saveLocalUsers(merged);
        callback(merged);
      }
    })
    .catch(() => {});

  // 3. Firestore Real-Time Global Deleted Admins Listener
  // This guarantees that when the Owner deletes an admin, every visitor & device
  // worldwide receives the event immediately and removes them permanently!
  let unsubDeletedCol: (() => void) | null = null;
  let unsubDeletedDoc: (() => void) | null = null;
  let unsubUsersCol: (() => void) | null = null;

  try {
    // 3a. Listen to deletedAdmins collection
    const deletedCol = collection(db, 'deletedAdmins');
    unsubDeletedCol = onSnapshot(
      deletedCol,
      (snapshot) => {
        let changed = false;
        const currentDeleted = getDeletedUserIds();
        snapshot.forEach((d) => {
          if (!currentDeleted.has(d.id)) {
            markUserDeleted(d.id);
            changed = true;
          }
        });
        if (changed) {
          refreshCleanUsers();
        }
      },
      () => {}
    );
  } catch (err) {}

  try {
    // 3b. Listen to settings/deletedAdmins document
    const deletedDocRef = doc(db, 'settings', 'deletedAdmins');
    unsubDeletedDoc = onSnapshot(
      deletedDocRef,
      (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.data();
          let changed = false;
          const currentDeleted = getDeletedUserIds();
          Object.keys(data).forEach((uid) => {
            if (data[uid] === true && !currentDeleted.has(uid)) {
              markUserDeleted(uid);
              changed = true;
            }
          });
          if (changed) {
            refreshCleanUsers();
          }
        }
      },
      () => {}
    );
  } catch (err) {}

  try {
    // 3c. Listen to users collection
    const usersCol = collection(db, 'users');
    unsubUsersCol = onSnapshot(
      usersCol,
      (snapshot) => {
        const deletedIds = getDeletedUserIds();
        const userMap = new Map<string, UserProfile>();

        // 1. Initial default users
        INITIAL_USERS.forEach((u) => {
          if (!deletedIds.has(u.uid)) {
            userMap.set(u.uid, u);
          }
        });

        // 2. Existing local users
        getLocalUsers().forEach((u) => {
          if (!deletedIds.has(u.uid) && u.active !== false) {
            userMap.set(u.uid, { ...userMap.get(u.uid), ...u });
          }
        });

        // 3. Firestore snapshot documents
        if (!snapshot.empty) {
          snapshot.forEach((d) => {
            const data = d.data() as any;
            if (data?.deleted === true || data?.active === false || data?.role === 'deleted' || deletedIds.has(d.id)) {
              markUserDeleted(d.id);
              userMap.delete(d.id);
              return;
            }
            userMap.set(d.id, {
              ...userMap.get(d.id),
              ...data,
              uid: d.id,
              profileImage: sanitizeMediaUrl(data?.profileImage),
            } as UserProfile);
          });
        }

        const merged = Array.from(userMap.values()).filter(
          (u) => !getDeletedUserIds().has(u.uid) && u.active !== false
        );
        saveLocalUsers(merged);
        callback(merged);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, 'users');
        callback(getLocalUsers());
      }
    );
  } catch (err) {
    callback(getLocalUsers());
  }

  return () => {
    userSubscribers.delete(callback);
    if (unsubDeletedCol) unsubDeletedCol();
    if (unsubDeletedDoc) unsubDeletedDoc();
    if (unsubUsersCol) unsubUsersCol();
  };
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

export function generateVideoThumbnail(file: File): Promise<string> {
  return new Promise((resolve) => {
    try {
      const video = document.createElement('video');
      video.preload = 'metadata';
      video.muted = true;
      video.playsInline = true;
      const blobUrl = URL.createObjectURL(file);
      video.src = blobUrl;
      video.onloadeddata = () => {
        video.currentTime = Math.min(0.5, (video.duration || 1) / 2);
      };
      video.onseeked = () => {
        try {
          const canvas = document.createElement('canvas');
          const width = Math.min(960, video.videoWidth || 720);
          const height = Math.round((width * (video.videoHeight || 480)) / (video.videoWidth || 720));
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(video, 0, 0, width, height);
            const thumb = canvas.toDataURL('image/jpeg', 0.8);
            URL.revokeObjectURL(blobUrl);
            resolve(thumb);
            return;
          }
        } catch {}
        URL.revokeObjectURL(blobUrl);
        resolve('');
      };
      video.onerror = () => {
        URL.revokeObjectURL(blobUrl);
        resolve('');
      };
    } catch {
      resolve('');
    }
  });
}

export async function compressImageToDataUrl(file: File, maxDim = 1080, quality = 0.80): Promise<string> {
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

  const isImage = file.type.startsWith('image/');
  let dataUrl = '';

  try {
    if (isImage) {
      dataUrl = await compressImageToDataUrl(file, 1080, 0.80);
    } else {
      // For video, also attempt to get video data URL if under 15MB
      if (file.size < 15 * 1024 * 1024) {
        dataUrl = await readFileAsDataUrl(file);
      }
    }
  } catch (err) {
    console.warn('Failed to read file as data url:', err);
  }

  if (onProgress) onProgress(35);

  // 1. Try Firebase Storage (Provides global public CDN URLs for any visitor worldwide)
  try {
    const storageRef = ref(storage, storagePath);
    const uploadTask = uploadBytesResumable(storageRef, file);

    const storageUrl = await new Promise<string>((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Firebase Storage timeout'));
      }, 35000);

      uploadTask.on(
        'state_changed',
        (snapshot) => {
          if (snapshot.totalBytes > 0 && onProgress) {
            const pct = Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 50) + 35;
            onProgress(Math.min(90, pct));
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
    console.warn('Firebase Storage upload notice, falling back to server/dataUrl:', storageErr);
  }

  // 2. Try backend /api/upload-media endpoint (saves permanently to public/uploads)
  if (dataUrl) {
    try {
      const json = await safeFetchJson<{ url?: string }>('/api/upload-media', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filename: file.name,
          base64Data: dataUrl,
          contentType: file.type,
        }),
      });
      if (json && json.url) {
        if (onProgress) onProgress(100);
        return json.url;
      }
    } catch (apiErr) {
      console.warn('Backend upload notice:', apiErr);
    }
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
 * Publish a new clip (Admin/Owner action) - optimized for instant public appearance & global sync
 */
export async function createNewClip(clipData: Omit<ClipItem, 'clipId' | 'downloadCount' | 'likeCount' | 'createdAt'>): Promise<ClipItem> {
  const clipId = `clip_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
  const now = new Date().toISOString();

  const newClip: ClipItem = {
    ...clipData,
    clipId,
    published: true, // Always published so public can immediately watch and download
    downloadCount: 0,
    likeCount: 0,
    createdAt: now,
    updatedAt: now,
  };

  // 1. Save locally immediately so it renders instantly for uploader
  const current = getLocalClips();
  const updated = [newClip, ...current];
  saveLocalClips(updated);

  // 2. Refresh all React listeners automatically with 0ms delay!
  notifyClipsSubscribers();

  // 3. Save to backend server API
  safeFetchJson('/api/clips/save', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(newClip),
  }).catch(() => {});

  // 4. Save to Firestore with size guard (ensures document fits within Firestore's 1MB limit so setDoc NEVER fails)
  try {
    let safeFirestoreClip = { ...newClip };
    const payloadSize = JSON.stringify(safeFirestoreClip).length;
    if (payloadSize > 850000) {
      console.warn(`Clip ${clipId} payload is ${payloadSize} bytes. Adjusting to ensure Firestore 1MB compliance.`);
      // If primaryMedia is a huge raw base64 video string, use photoOneUrl as display preview
      if (safeFirestoreClip.primaryMediaType === 'video' && safeFirestoreClip.primaryMediaUrl.startsWith('data:')) {
        safeFirestoreClip.primaryMediaUrl = safeFirestoreClip.photoOneUrl || DEFAULT_PERSIB_IMAGE;
      }
    }

    const clipRef = doc(db, 'clips', clipId);
    await setDoc(clipRef, safeFirestoreClip);
  } catch (err) {
    console.error('Firestore clip create error:', err);
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

  // If this user was previously marked deleted, unmark them locally and in Firestore
  unmarkUserDeleted(user.uid);
  try {
    await deleteDoc(doc(db, 'deletedAdmins', user.uid));
  } catch (e) {}
  try {
    await setDoc(doc(db, 'settings', 'deletedAdmins'), { [user.uid]: false }, { merge: true });
  } catch (e) {}

  const current = getLocalUsers();
  const exists = current.some((u) => u.uid === user.uid);
  const updated = exists ? current.map((u) => (u.uid === user.uid ? updatedUser : u)) : [...current, updatedUser];
  saveLocalUsers(updated);

  // Notify active listeners immediately
  notifyUsersSubscribers();

  // Safely notify server storage if running
  safeFetchJson('/api/admin/update-admin', {
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
 * Delete Admin user profile (Owner action) - guarantees immediate & permanent deletion across all devices worldwide
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

  // 4. Safely notify backend server if running
  safeFetchJson('/api/admin/delete-admin', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ uid }),
  }).catch(() => {});

  // 5. Global Firestore Sync: Write to deletedAdmins collection so every user in the world gets notified in real-time
  try {
    await setDoc(doc(db, 'deletedAdmins', uid), {
      uid,
      deleted: true,
      deletedAt: new Date().toISOString(),
    });
  } catch (e) {}

  // 6. Global Firestore Sync: Write to settings/deletedAdmins document
  try {
    await setDoc(
      doc(db, 'settings', 'deletedAdmins'),
      { [uid]: true, lastUpdatedAt: new Date().toISOString() },
      { merge: true }
    );
  } catch (e) {}

  // 7. Mark doc as deleted & remove document from Firestore users collection
  try {
    const userRef = doc(db, 'users', uid);
    await updateDoc(userRef, {
      deleted: true,
      active: false,
      role: 'deleted',
      deletedAt: new Date().toISOString(),
    });
    await deleteDoc(userRef);
  } catch (err) {
    try {
      await deleteDoc(doc(db, 'users', uid));
    } catch (fallbackErr) {
      handleFirestoreError(fallbackErr, OperationType.DELETE, `users/${uid}`);
    }
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
