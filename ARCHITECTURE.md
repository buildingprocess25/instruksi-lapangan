# System Architecture & Integration Guide (`ARCHITECTURE.MD`)

Dokumen ini menjelaskan arsitektur teknis aplikasi menggunakan **Next.js (App Router)**, **Prisma ORM**, **Supabase (Text/Relational Database & Auth)**, dan **Google Drive API (Penyimpanan Gambar/Aset)**.

---

## 1. Diagram Arsitektur Sistem

```
+-----------------------------------------------------------------------+
|                        CLIENT (Browser / UI)                          |
|         Next.js App Router + Tailwind CSS + shadcn/ui                 |
+-------------------+-----------------------------------+---------------+
                    |                                   |
      (1) Baca/Tulis Berita,               (2) Request / Upload Gambar
       Repost, Komentar (JSON)               (/api/media/[fileId])
                    |                                   |
                    v                                   v
+-----------------------------------------------------------------------+
|                    NEXT.JS SERVER (Backend Layer)                     |
|  - Server Actions (CRUD Berita, Repost, Comment)                      |
|  - API Route Handler (/api/media/upload & /api/media/[fileId])        |
|  - Image Optimization (sharp -> WebP) + Edge Cache Headers            |
+-------------------+-----------------------------------+---------------+
                    |                                   |
      (Prisma Client via Pooler)          (Google Drive API v3 SDK
       Hanya Teks / String / ID            via Service Account)
                    |                                   |
                    v                                   v
+-----------------------------------+   +-------------------------------+
|        SUPABASE PLATFORM          |   |         GOOGLE DRIVE          |
|  - PostgreSQL (Data Teks & Relasi)|   |  - Folder Khusus Aset Berita  |
|  - Supabase Auth (Session/JWT)    |   |  - Menyimpan File Gambar WebP |
+-----------------------------------+   +-------------------------------+
```

---

## 2. Alur Integrasi Google Drive sebagai Penyimpanan Gambar

Menggunakan Google Drive sebagai penyimpanan gambar membutuhkan arsitektur **Proxy Stream** agar gambar tidak terkena blokir *CORS* atau *403 Rate Limit* dari Google, serta pengguna tidak perlu login ke akun Google mereka untuk mengunggah gambar.

### A. Persiapan Google Cloud Service Account
1. Buat project di **Google Cloud Console** dan aktifkan **Google Drive API**.
2. Buat **Service Account** dan unduh kredensial JSON (`client_email` dan `private_key`).
3. Buat sebuah folder di Google Drive pribadi/organisasi Anda (misal: `NewsApp_Assets`), lalu **Share (Bagikan)** folder tersebut ke alamat `client_email` Service Account dengan akses **Editor**.
4. Salin `FOLDER_ID` dari URL folder Google Drive tersebut.

### B. Alur Upload Gambar (`POST /api/media/upload`)
1. User memilih gambar saat menulis berita di form Next.js.
2. Server menerima file, lalu mengompresi dan mengubah formatnya menjadi `.webp` menggunakan library `sharp` agar hemat kuota Google Drive dan cepat dimuat.
3. Server mengunggah file `.webp` ke folder Google Drive menggunakan `googleapis` dan menerima `file.id` (contoh: `1xYz987...`).
4. `file.id` tersebut disimpan sebagai `String` pada kolom `thumbnailDriveId` di tabel `Article` **Supabase** melalui **Prisma**.

### C. Alur Menampilkan Gambar (`GET /api/media/[fileId]`)
Alih-alih memakai URL mentah Google Drive di tag `<img>`, aplikasi memanggil `<img src="/api/media/1xYz987..." />`:
1. Endpoint `/api/media/[fileId]/route.ts` mengambil *stream* gambar dari Google Drive API menggunakan Service Account.
2. Endpoint mengembalikan *stream* gambar dengan header:
   `Cache-Control: public, max-age=31536000, s-maxage=31536000, immutable`
3. Dengan header tersebut, Vercel/Cloudflare CDN dan browser akan menyimpan *cache* gambar sehingga Google Drive API hanya dipanggil satu kali saat gambar pertama kali dilihat.

---

## 3. Struktur Folder Proyek (Next.js App Router)

```text
src/
├── app/
│   ├── (public)/
│   │   ├── page.tsx                  # Halaman Utama (Hero Bento Grid + Artikel Pilihan sesuai Wireframe)
│   │   ├── kategori/[slug]/page.tsx  # Filter Berita per Kategori dari Navbar
│   │   ├── berita/[slug]/page.tsx    # Halaman Baca Berita Lengkap + Repost + Komentar
│   │   └── @[username]/page.tsx      # Profil Sosial User (Tab: Berita, Repost & Opini, Komentar)
│   ├── (protected)/
│   │   ├── tulis/page.tsx            # Form Create Berita + Upload Gambar ke Drive
│   │   ├── edit/[id]/page.tsx        # Form Update/Delete Berita
│   │   └── bookmark/page.tsx         # Daftar Berita Tersimpan
│   ├── api/
│   │   └── media/
│   │       ├── upload/route.ts       # Endpoint Upload Gambar ke Google Drive
│   │       └── [fileId]/route.ts     # Endpoint Proxy Stream Gambar dari Google Drive
│   ├── layout.tsx                    # Root Layout + Navbar (Logo & Kategori)
│   └── globals.css                   # Tailwind CSS Directives
├── actions/
│   ├── article.actions.ts            # Server Actions: Create, Update, Delete Berita
│   ├── social.actions.ts             # Server Actions: Repost, Quote Repost, Comment, Like
│   └── auth.actions.ts               # Sinkronisasi Supabase Auth ke Tabel User Prisma
├── components/
│   ├── layout/
│   │   └── Navbar.tsx                # Komponen Navbar (LOGO + KATEGORI)
│   ├── news/
│   │   ├── HeroBentoGrid.tsx         # Layout 3 Kolom Atas sesuai Wireframe
│   │   ├── EditorialReader.tsx       # Layout Gambar Kiri + Teks Kanan & Bawah sesuai Wireframe
│   │   └── NewsEditorForm.tsx        # Form CRUD Berita
│   ├── social/
│   │   ├── RepostModal.tsx           # Dialog Direct Repost vs Quote Repost
│   │   └── CommentSection.tsx        # Komentar Berjenjang (Nested Replies)
│   └── ui/                           # Komponen bawaan shadcn/ui
└── lib/
    ├── prisma.ts                     # Singleton Prisma Client
    ├── supabase/                     # Konfigurasi Supabase SSR Client
    └── google-drive.ts               # Konfigurasi Google Drive API v3 (Service Account)
```

---

## 4. Konfigurasi Environment Variables (`.env.example`)

```env
# 1. SUPABASE DATABASE (Untuk Prisma ORM)
DATABASE_URL="postgresql://postgres.[PROJECT-REF]:[PASSWORD]@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres?pgbouncer=true"
DIRECT_URL="postgresql://postgres.[PROJECT-REF]:[PASSWORD]@aws-0-ap-southeast-1.pooler.supabase.com:5432/postgres"

# 2. SUPABASE AUTH & CLIENT
NEXT_PUBLIC_SUPABASE_URL="https://[PROJECT-REF].supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."

# 3. GOOGLE DRIVE API (Service Account untuk Penyimpanan Gambar)
GOOGLE_DRIVE_CLIENT_EMAIL="news-drive-uploader@[PROJECT-ID].iam.gserviceaccount.com"
GOOGLE_DRIVE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
GOOGLE_DRIVE_FOLDER_ID="1A2b3C4d5E6f7G8h9I0jKlMnOpQrStUv"
```

---

## 5. Keamanan & Validasi (Row-Level & Server Security)
* **Otorisasi Kepemilikan (Ownership Check):** Di setiap *Server Action* `updateArticle` dan `deleteArticle`, sistem wajib memverifikasi bahwa `article.authorId === currentUser.id` (atau `currentUser.role === 'ADMIN'`). Saat berita dihapus dari Supabase, sistem juga otomatis memanggil `drive.files.delete({ fileId: article.thumbnailDriveId })` agar penyimpanan Google Drive tetap bersih.
* **Sanitasi Konten HTML:** Konten `TULISAN BERITA` disanitasi menggunakan `isomorphic-dompurify` sebelum disimpan ke Supabase untuk mencegah serangan XSS.