import express, { Request, Response } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import JSZip from 'jszip';
import dotenv from 'dotenv';

import fs from 'fs';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

// High limits for seamless media uploads (photos & video clips)
app.use(express.json({ limit: '150mb' }));
app.use(express.urlencoded({ extended: true, limit: '150mb' }));

// Ensure public/uploads directory exists and serve it statically
const uploadsDir = path.join(__dirname, 'public', 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}
app.use('/uploads', express.static(uploadsDir));

// Media Upload API: Saves uploaded clips and avatars permanently to public/uploads
app.post('/api/upload-media', async (req: Request, res: Response) => {
  try {
    const { filename, base64Data, contentType } = req.body;
    if (!base64Data || !filename) {
      return res.status(400).json({ error: 'File data and filename are required' });
    }

    const cleanBase64 = base64Data.replace(/^data:[^;]+;base64,/, '');
    const buffer = Buffer.from(cleanBase64, 'base64');

    const ext = path.extname(filename) || (contentType?.includes('video') ? '.mp4' : '.jpg');
    const safeBase = filename.replace(/[^a-zA-Z0-9_\-]/g, '_').replace(/\.[^/.]+$/, '');
    const uniqueFilename = `${Date.now()}_${safeBase}${ext}`;
    const filePath = path.join(uploadsDir, uniqueFilename);

    await fs.promises.writeFile(filePath, buffer);
    const publicUrl = `/uploads/${uniqueFilename}`;

    return res.json({
      success: true,
      url: publicUrl,
      filename: uniqueFilename,
      size: buffer.length,
    });
  } catch (err: any) {
    console.error('Server upload error:', err);
    return res.status(500).json({ error: err.message || 'Failed to save media file' });
  }
});

// Idempotency cache for download counts (prevents double-counting within 30 seconds)
const recentDownloads = new Map<string, number>();

// Clean old entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, timestamp] of recentDownloads.entries()) {
    if (now - timestamp > 30000) {
      recentDownloads.delete(key);
    }
  }
}, 60000);

// 1. Record Download API with idempotency
app.post('/api/record-download', async (req: Request, res: Response) => {
  try {
    const { clipId, mediaType, requestId } = req.body;
    if (!clipId) {
      return res.status(400).json({ error: 'clipId is required' });
    }

    const idempotencyKey = `${clipId}_${mediaType}_${requestId || req.ip}`;
    const now = Date.now();
    const lastRecorded = recentDownloads.get(idempotencyKey);

    if (lastRecorded && now - lastRecorded < 15000) {
      // Ignored due to rapid duplicate within 15 seconds
      return res.json({ success: true, message: 'Cached / duplicate event skipped' });
    }

    recentDownloads.set(idempotencyKey, now);
    return res.json({ success: true, recorded: true, clipId });
  } catch (error: any) {
    console.error('Error recording download:', error);
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

// 2. Download File Proxy with forced Content-Disposition: attachment
app.get('/api/download', async (req: Request, res: Response) => {
  try {
    const fileUrl = req.query.url as string;
    const filename = (req.query.filename as string) || 'persib-clip';

    if (!fileUrl) {
      return res.status(400).send('Missing url parameter');
    }

    // Sanitize filename
    const safeFilename = filename.replace(/[^a-zA-Z0-9_\-\.]/g, '_');

    // Handle relative local asset and uploads paths
    if (fileUrl.startsWith('/src/assets/')) {
      const localFilePath = path.join(__dirname, fileUrl);
      res.setHeader('Content-Disposition', `attachment; filename="${safeFilename}"`);
      return res.sendFile(localFilePath);
    }
    if (fileUrl.startsWith('/uploads/')) {
      const localFilePath = path.join(uploadsDir, fileUrl.replace(/^\/uploads\//, ''));
      res.setHeader('Content-Disposition', `attachment; filename="${safeFilename}"`);
      return res.sendFile(localFilePath);
    }
    if (fileUrl.startsWith('data:')) {
      const matches = fileUrl.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
      if (matches && matches.length === 3) {
        const contentType = matches[1];
        const buffer = Buffer.from(matches[2], 'base64');
        res.setHeader('Content-Type', contentType);
        res.setHeader('Content-Disposition', `attachment; filename="${safeFilename}"`);
        return res.send(buffer);
      }
    }

    // Remote URL (Firebase Storage or CDN)
    const response = await fetch(fileUrl);
    if (!response.ok) {
      return res.status(response.status).send(`Failed to fetch media: ${response.statusText}`);
    }

    const contentType = response.headers.get('content-type') || 'application/octet-stream';
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${safeFilename}"`);

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    return res.send(buffer);
  } catch (err: any) {
    console.error('Error proxying download:', err);
    return res.status(500).send('Failed to download media file');
  }
});

// 3. Download All 3 Media Files as a single ZIP
app.post('/api/download-zip', async (req: Request, res: Response) => {
  try {
    const { title, items } = req.body as {
      title?: string;
      items: Array<{ url: string; filename: string }>;
    };

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'No media items specified' });
    }

    const zip = new JSZip();
    const zipFolderName = (title || 'AZRYL_CLIPS_PERSIB').replace(/[^a-zA-Z0-9_\-]/g, '_');
    const folder = zip.folder(zipFolderName) || zip;

    // Fetch all items in parallel
    await Promise.all(
      items.map(async (item, index) => {
        try {
          let buffer: Buffer;
          if (item.url.startsWith('/src/assets/')) {
            const localPath = path.join(__dirname, item.url);
            buffer = await fs.promises.readFile(localPath);
          } else if (item.url.startsWith('/uploads/')) {
            const localPath = path.join(uploadsDir, item.url.replace(/^\/uploads\//, ''));
            buffer = await fs.promises.readFile(localPath);
          } else if (item.url.startsWith('data:')) {
            const cleanBase64 = item.url.replace(/^data:[^;]+;base64,/, '');
            buffer = Buffer.from(cleanBase64, 'base64');
          } else {
            const resp = await fetch(item.url);
            if (resp.ok) {
              const ab = await resp.arrayBuffer();
              buffer = Buffer.from(ab);
            } else {
              return;
            }
          }
          const cleanName = item.filename || `media_${index + 1}.jpg`;
          folder.file(cleanName, buffer);
        } catch (fetchErr) {
          console.warn(`Failed to include item ${item.url} in zip:`, fetchErr);
        }
      })
    );

    // Add Bobotoh info text file inside ZIP
    folder.file(
      'INFO_FREE_CLIPS_PERSIB.txt',
      `FREE CLIPS PERSIB — Free Persib Clips\n` +
      `Platform Berbagi & Download Clips Persib Bandung Gratis untuk Bobotoh.\n` +
      `Website: FREE CLIPS PERSIB\n` +
      `Powered by AZRYL\n` +
      `Hidup Persib! 💙\n`
    );

    const zipContent = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' });

    res.setHeader('Content-Type', 'application/zip');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="FREE-CLIPS-PERSIB-${zipFolderName}.zip"`
    );
    return res.send(zipContent);
  } catch (error: any) {
    console.error('Error generating zip:', error);
    return res.status(500).json({ error: 'Failed to generate ZIP archive' });
  }
});

// Ensure data directory exists for persistent admins
const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}
const adminsFile = path.join(dataDir, 'admins.json');
const deletedAdminsFile = path.join(dataDir, 'deleted_admins.json');
const clipsFile = path.join(dataDir, 'clips.json');

if (!fs.existsSync(deletedAdminsFile)) {
  fs.writeFileSync(deletedAdminsFile, JSON.stringify([], null, 2), 'utf-8');
}
if (!fs.existsSync(clipsFile)) {
  fs.writeFileSync(clipsFile, JSON.stringify([], null, 2), 'utf-8');
}

const DEFAULT_SERVER_ADMINS = [
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
    whatsappChannelUrl: '',
    active: true,
    createdAt: new Date(Date.now() - 3600000 * 24 * 10).toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

if (!fs.existsSync(adminsFile)) {
  fs.writeFileSync(adminsFile, JSON.stringify(DEFAULT_SERVER_ADMINS, null, 2), 'utf-8');
}

function getStoredClips(): any[] {
  try {
    if (fs.existsSync(clipsFile)) {
      const content = fs.readFileSync(clipsFile, 'utf-8');
      const parsed = JSON.parse(content);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (err) {
    console.error('Error reading clips.json:', err);
  }
  return [];
}

function saveStoredClips(clips: any[]) {
  try {
    fs.writeFileSync(clipsFile, JSON.stringify(clips, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error writing clips.json:', err);
  }
}

function getDeletedAdminUids(): string[] {
  try {
    if (fs.existsSync(deletedAdminsFile)) {
      const content = fs.readFileSync(deletedAdminsFile, 'utf-8');
      const parsed = JSON.parse(content);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (err) {
    console.error('Error reading deleted_admins.json:', err);
  }
  return [];
}

function saveDeletedAdminUids(uids: string[]) {
  try {
    fs.writeFileSync(deletedAdminsFile, JSON.stringify(uids, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error writing deleted_admins.json:', err);
  }
}

function getStoredAdmins(): any[] {
  try {
    if (fs.existsSync(adminsFile)) {
      const content = fs.readFileSync(adminsFile, 'utf-8');
      const parsed = JSON.parse(content);
      if (Array.isArray(parsed)) {
        return parsed;
      }
    }
  } catch (err) {
    console.error('Error reading admins.json:', err);
  }
  return DEFAULT_SERVER_ADMINS;
}

function saveStoredAdmins(admins: any[]) {
  try {
    fs.writeFileSync(adminsFile, JSON.stringify(admins, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error writing admins.json:', err);
  }
}

// Clips API Endpoints (Auto-sync for real-time changes)
app.get('/api/clips/list', (_req: Request, res: Response) => {
  try {
    return res.json(getStoredClips());
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

app.post('/api/clips/save', (req: Request, res: Response) => {
  try {
    const clip = req.body;
    if (!clip || !clip.clipId) {
      return res.status(400).json({ error: 'clipId is required' });
    }
    const stored = getStoredClips();
    const idx = stored.findIndex((c) => c.clipId === clip.clipId);
    if (idx >= 0) {
      stored[idx] = { ...stored[idx], ...clip, updatedAt: new Date().toISOString() };
    } else {
      stored.unshift({ ...clip, updatedAt: new Date().toISOString() });
    }
    saveStoredClips(stored);
    return res.json({ success: true, clipId: clip.clipId });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

app.post('/api/clips/delete', (req: Request, res: Response) => {
  try {
    const { clipId } = req.body;
    if (!clipId) return res.status(400).json({ error: 'clipId is required' });
    const stored = getStoredClips();
    const filtered = stored.filter((c) => c.clipId !== clipId);
    saveStoredClips(filtered);
    return res.json({ success: true, deletedClipId: clipId });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// 4. Create Admin Account without overriding Owner's frontend Firebase Auth session
app.post('/api/admin/create-admin', async (req: Request, res: Response) => {
  try {
    const { email, password, adminName, bio, profileImage, tiktokUrl, instagramUrl, whatsappChannelUrl } = req.body;
    if (!email || !password || !adminName) {
      return res.status(400).json({ error: 'Email, password, and adminName are required' });
    }

    const cleanEmail = String(email).trim().toLowerCase();
    let uid = `admin_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    // Try creating via Firebase Auth REST API if enabled
    try {
      const firebaseApiKey = "AIzaSyD2awU2TG21qC44SLIJl0j-6FotR3giH4";
      const signUpUrl = `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${firebaseApiKey}`;
      const authResp = await fetch(signUpUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: cleanEmail,
          password,
          returnSecureToken: true,
        }),
      });

      const authData = await authResp.json();
      if (authResp.ok && authData?.localId) {
        uid = authData.localId;
      }
    } catch (fbErr) {
      console.warn('Firebase Auth REST signup notice (using local storage fallback):', fbErr);
    }

    const defaultImg = 'https://i.postimg.cc/4ysQFgqx/1366b69ba442d21911f314947331b50a.jpg';
    const newAdmin = {
      uid,
      email: cleanEmail,
      password: String(password),
      role: 'admin',
      adminName: String(adminName).trim(),
      profileImage: profileImage?.trim() || defaultImg,
      bio: bio?.trim() || '',
      tiktokUrl: tiktokUrl?.trim() || '',
      instagramUrl: instagramUrl?.trim() || '',
      whatsappChannelUrl: whatsappChannelUrl?.trim() || '',
      active: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // Remove from deleted list if present
    const deleted = getDeletedAdminUids().filter((id) => id !== uid && id !== cleanEmail);
    saveDeletedAdminUids(deleted);

    // Save in persistent admins file
    const stored = getStoredAdmins();
    const existingIndex = stored.findIndex((a) => a.uid === uid || a.email.toLowerCase() === cleanEmail);
    if (existingIndex >= 0) {
      stored[existingIndex] = { ...stored[existingIndex], ...newAdmin };
    } else {
      stored.push(newAdmin);
    }
    saveStoredAdmins(stored);

    const safeUser = { ...newAdmin };
    delete (safeUser as any).password;

    return res.json({
      success: true,
      uid,
      user: safeUser,
      message: `Akun admin ${adminName} berhasil dibuat!`,
    });
  } catch (err: any) {
    console.error('Error creating admin:', err);
    return res.status(500).json({ error: err.message || 'Internal server error' });
  }
});

// 5. List Custom Server Admins (excluding permanently deleted admins)
app.get('/api/admin/list-admins', (_req: Request, res: Response) => {
  try {
    const deleted = new Set(getDeletedAdminUids());
    const stored = getStoredAdmins();
    const safeAdmins = stored
      .filter((a) => !deleted.has(a.uid))
      .map((a) => {
        const copy = { ...a };
        delete copy.password;
        return copy;
      });
    return res.json(safeAdmins);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// 5b. List Deleted Admin UIDs
app.get('/api/admin/deleted-admins', (_req: Request, res: Response) => {
  try {
    const deleted = getDeletedAdminUids();
    return res.json(deleted);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// 6. Delete Admin from Server (persist to deleted_admins.json and remove from admins.json)
app.post('/api/admin/delete-admin', (req: Request, res: Response) => {
  try {
    const { uid } = req.body;
    if (!uid) return res.status(400).json({ error: 'UID is required' });
    
    // Add to deleted admins list
    const deleted = getDeletedAdminUids();
    if (!deleted.includes(uid)) {
      deleted.push(uid);
      saveDeletedAdminUids(deleted);
    }

    // Remove from stored admins
    const stored = getStoredAdmins();
    const filtered = stored.filter((a) => a.uid !== uid);
    saveStoredAdmins(filtered);
    
    return res.json({ success: true, deletedUid: uid });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// 7. Update Admin Profile on Server (Upsert support for both initial and newly created admins)
app.post('/api/admin/update-admin', (req: Request, res: Response) => {
  try {
    const { uid, updates } = req.body;
    if (!uid) return res.status(400).json({ error: 'UID is required' });
    
    // Unmark from deleted if it was somehow marked
    const deleted = getDeletedAdminUids().filter((id) => id !== uid);
    saveDeletedAdminUids(deleted);

    const stored = getStoredAdmins();
    const idx = stored.findIndex((a) => a.uid === uid);
    let updatedItem: any;

    if (idx >= 0) {
      updatedItem = { ...stored[idx], ...updates, updatedAt: new Date().toISOString() };
      stored[idx] = updatedItem;
    } else {
      updatedItem = { uid, ...updates, updatedAt: new Date().toISOString() };
      stored.push(updatedItem);
    }
    
    saveStoredAdmins(stored);
    const safe = { ...updatedItem };
    delete safe.password;
    return res.json({ success: true, user: safe });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// 8. Verify Admin Login
app.post('/api/admin/verify-login', (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }
    const cleanEmail = String(email).trim().toLowerCase();
    const deleted = new Set(getDeletedAdminUids());
    const stored = getStoredAdmins();
    const found = stored.find((a) => !deleted.has(a.uid) && a.email.toLowerCase() === cleanEmail && a.password === String(password));

    if (found) {
      if (!found.active) {
        return res.status(403).json({ error: 'Akun admin ini dinonaktifkan oleh Owner.' });
      }
      const safe = { ...found };
      delete safe.password;
      return res.json({ success: true, user: safe });
    }

    return res.status(401).json({ error: 'Email atau password salah.' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// Configure Vite or Static files
async function startServer() {
  const isDev = process.env.NODE_ENV !== 'production';

  if (isDev) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`AZRYL CLIPS Server running at http://0.0.0.0:${PORT}`);
  });
}

startServer();
