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

// 4. Create Admin Account without overriding Owner's frontend Firebase Auth session
app.post('/api/admin/create-admin', async (req: Request, res: Response) => {
  try {
    const { email, password, adminName, bio, tiktokUrl, instagramUrl, whatsappChannelUrl } = req.body;
    if (!email || !password || !adminName) {
      return res.status(400).json({ error: 'Email, password, and adminName are required' });
    }

    const firebaseApiKey = "AIzaSyD2awU2TG21qC44SLIJl0j-6FotR3giH4";
    // Call Firebase Auth REST API signUp
    const signUpUrl = `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${firebaseApiKey}`;
    const authResp = await fetch(signUpUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email,
        password,
        returnSecureToken: true,
      }),
    });

    const authData = await authResp.json();
    if (!authResp.ok) {
      return res.status(400).json({ error: authData.error?.message || 'Failed to create user in Firebase Auth' });
    }

    const uid = authData.localId;
    return res.json({
      success: true,
      uid,
      email,
      adminName,
      message: 'Admin account created successfully',
    });
  } catch (err: any) {
    console.error('Error creating admin:', err);
    return res.status(500).json({ error: err.message || 'Internal server error' });
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
