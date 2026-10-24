# PANDUAN LENGKAP AZRYL CLIPS — FREE PERSIB CLIPS

Platform berbagi dan download clips Persib Bandung gratis berkualitas tinggi untuk Bobotoh.

---

## 1. DAFTAR PENGATURAN FIREBASE CONSOLE YANG WAJIB DILAKUKAN

Buka [Firebase Console](https://console.firebase.google.com/) dan pilih project **azrylclips**:

### A. Aktifkan Firebase Authentication
1. Di menu navigasi kiri, klik **Build** > **Authentication**.
2. Klik **Get Started**.
3. Di tab **Sign-in method**, pilih **Email/Password**.
4. Aktifkan opsi pertama: **Email/Password** (Status: *Enabled*).
5. Klik **Save**.
6. *(Opsional untuk testing)*: Di tab **Users**, klik **Add user** untuk menambahkan user Owner:
   - Email: `apriliansyahazril10@gmail.com`
   - Password: Buat password minimal 6 karakter.

### B. Siapkan Cloud Firestore Database
1. Di menu kiri, klik **Build** > **Firestore Database**.
2. Klik **Create database**.
3. Pilih lokasi server terdekat (contoh: `asia-southeast1` untuk Singapura / Indonesia atau `asia-east1`).
4. Pilih mode keamanan **Production Mode** (Aturan keamanan lengkap sudah disediakan di file `firestore.rules`).
5. Di tab **Rules**, salin dan tempelkan isi dari file `firestore.rules` di repositori ini, lalu klik **Publish**.

### C. Siapkan Firebase Storage
1. Di menu kiri, klik **Build** > **Storage**.
2. Klik **Get Started**.
3. Pilih lokasi bucket default (`azrylclips.firebasestorage.app`).
4. Di tab **Rules**, salin dan tempelkan isi dari file `storage.rules` di repositori ini, lalu klik **Publish**.
5. Buka tab **Settings** (ikon gerigi) atau konfigurasi CORS di Google Cloud Shell jika ingin mengizinkan unduhan langsung lintas domain:
   ```bash
   echo '[{"origin": ["*"],"method": ["GET", "HEAD"],"responseHeader": ["Content-Type", "Content-Disposition"],"maxAgeSeconds": 3600}]' > cors.json
   gsutil cors set cors.json gs://azrylclips.firebasestorage.app
   ```

---

## 2. STRUKTUR DATABASE FIRESTORE

Aplikasi menggunakan 4 koleksi utama:
- **`users`**: Menyimpan profil owner dan admin (nama, email, role `owner` / `admin`, avatar, bio, medsos TikTok, Instagram, WA).
- **`clips`**: Menyimpan setiap item clips yang berisi 3 media (1 media utama video/foto, foto 1, foto 2, jumlah unduhan, slug permanen).
- **`downloadEvents`**: Audit log idempotency pencatatan unduhan.
- **`settings`**: Pengaturan global website (nama, pengumuman, maintenance mode).

---

## 3. PANDUAN DEPLOY KE VERCEL

Aplikasi ini dapat di-deploy dengan cepat ke **Vercel**:

### Langkah 1: Push ke GitHub
```bash
git add .
git commit -m "Deploy AZRYL CLIPS — Free Persib Clips"
git push origin main
```

### Langkah 2: Import Proyek di Vercel
1. Buka [Vercel Dashboard](https://vercel.com/dashboard) dan klik **Add New...** > **Project**.
2. Hubungkan repository GitHub Anda.
3. Konfigurasi Build & Development Settings:
   - **Framework Preset**: `Vite`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
   - **Install Command**: `npm install`
4. Tambahkan Environment Variables di Vercel:
   - `PORT`: `3000`
   - `VITE_FIREBASE_API_KEY`: `AIzaSyD2awU2TG21qC44SLIJl0j-6FotR3giH4`
   - `VITE_FIREBASE_PROJECT_ID`: `azrylclips`
   - (Variabel lain seperti tercantum pada `.env.example`)
5. Klik **Deploy**.

---

## 4. CHECKLIST PENGUJIAN SELURUH FITUR

Gunakan checklist ini untuk menguji seluruh fungsi sistem:

### A. Fitur Publik (Tanpa Login)
- [x] **Homepage (`/`)**: Tampilan hero Persib, statistik Bobotoh, pencarian real-time, seksi trending, dan clips terbaru.
- [x] **Pencarian Real-Time**: Ketik judul / nama pemain / pembuat clips, hasil langsung menyaring tanpa reload. Tombol reset berfungsi.
- [x] **All Clips (`/clips`)**: Filter tab Semua / Video / Foto dan pengurutan (Terbaru, Terbanyak Unduhan, Judul A-Z).
- [x] **Trending (`/trending`)**: Peringkat 1, 2, 3 dengan medali emas, perak, perunggu dan jumlah unduhan valid.
- [x] **All Admin (`/admin`)**: Menampilkan seluruh admin aktif beserta foto profil, bio, dan tombol medsos (TikTok, IG, WA).
- [x] **Admin Public Profile (`/admin/:adminId`)**: Menampilkan profil lengkap admin dan seluruh clips yang diunggah oleh admin tersebut.
- [x] **Halaman Detail 3 Media (`/clips/:slug`)**:
  - [x] Pemutar Video Full HD kustom (Play, Pause, Timeline slider, Volume/Mute, Fullscreen) ATAU Foto Utama resolusi tinggi.
  - [x] 2 Foto pendukung dengan lightbox pembesar resolusi penuh.
  - [x] Tombol "Download Media Utama".
  - [x] Tombol "Download Foto 1".
  - [x] Tombol "Download Foto 2".
  - [x] Tombol "Download Semua 3 Media (ZIP)".
  - [x] Tombol "Bagikan" ke WhatsApp, Telegram, Twitter/X.
  - [x] Tombol "Salin Link" dengan toast notification "Link berhasil disalin!".
  - [x] Rekomendasi clips terkait di bawah halaman.
- [x] **Identitas Brand & Footer**: Teks "AZRYL CLIPS — Free Persib Clips" dan watermark permanen "Powered by AZRYL".

### B. Portal Rahasia Pengelola (`/azryl-control`)
- [x] Rute tersembunyi tidak tampak di navbar publik pengunjung umum.
- [x] Validasi login dengan Firebase Auth email & password.
- [x] Fitur "Akses Cepat Pengujian Fitur" untuk langsung mengetes role Owner atau Admin.

### C. Dashboard Admin (`/azryl-control/admin`)
- [x] Form upload 3 media lengkap: Nama pembuat, Judul, Deskripsi, Media Utama (Video/Foto), Foto 1, Foto 2.
- [x] Pratinjau langsung sebelum upload dan tombol batal pilihan file.
- [x] Indikator progress bar upload (0% - 100%).
- [x] Notifikasi toast ketika upload berhasil.
- [x] Daftar riwayat clips milik admin sendiri.
- [x] Admin tidak memiliki hak akses mengubah/menghapus clips setelah publikasi atau mengubah akun admin lain.

### D. Dashboard Owner (`/azryl-control/owner`)
- [x] **Tab Statistik**: Total clips, total unduhan website, admin aktif, unduhan hari ini, top clips, dan statistik upload per admin.
- [x] **Tab Manajemen Admin**:
  - [x] Buat akun admin baru tanpa mengeluarkan sesi login Owner.
  - [x] Edit nama admin, bio, dan tautan media sosial (TikTok, Instagram, WhatsApp Channel).
  - [x] Nonaktifkan atau aktifkan kembali akun admin.
- [x] **Tab Manajemen Clips**:
  - [x] Edit judul, nama pembuat, dan deskripsi clip.
  - [x] Ubah status publikasi (Published / Arsip).
  - [x] Hapus clips dari database dengan konfirmasi.
- [x] **Tab Pengaturan Website**:
  - [x] Ubah nama dan deskripsi website.
  - [x] Aktifkan / nonaktifkan Mode Pemeliharaan (Maintenance Mode).
  - [x] Ubah pesan pengumuman banner beranda.
