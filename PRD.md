# Product Requirements Document (PRD) — Social News Web App

## 1. Ringkasan Proyek (Project Overview)
Aplikasi ini adalah platform **Social News & Citizen Journalism** yang menggabungkan pengalaman membaca portal berita modern (sesuai *wireframe* bento-grid dan *editorial split-layout*) dengan interaksi sosial media. Pengguna tidak hanya menjadi pembaca pasif, tetapi memiliki akun untuk menulis berita (CRUD), melakukan *repost* (baik *direct repost* maupun *quote repost* dengan opini), serta berdiskusi melalui kolom komentar berjenjang (*nested comments*).

* **Tech Stack Utama:** Next.js (App Router), Tailwind CSS, shadcn/ui, Prisma ORM, Supabase (PostgreSQL + Auth), dan Google Drive API (penyimpanan aset gambar/media).

---

## 2. Saran & Ide Pengembangan Fitur (Value-Add Recommendations)
Agar aplikasi ini memiliki daya tarik yang kuat dan berbeda dari portal berita biasa maupun sosial media umum, berikut adalah fitur strategis yang sangat disarankan:

### A. Dual-Mode Repost: *Direct Repost* & *Quote News (Opini)*
* **Direct Repost:** Membagikan ulang berita langsung ke *feed* pengikut (seperti fitur Retweet).
* **Quote News (Sudut Pandang):** Pengguna bisa me-*repost* berita sambil menambahkan opini atau analisis singkat di atas kartu berita tersebut. Ini mendorong diskusi sehat antar pembaca.

### B. Sistem Kredibilitas & *Source Citation* (Anti-Hoax)
Karena semua pengguna bisa memposting berita (*User-Generated Content*), risiko berita palsu cukup tinggi.
* **Wajib Cantumkan Sumber (Source Link):** Saat membuat berita, penulis dapat melampirkan URL referensi atau menandai status berita sebagai *"Laporan Langsung (Citizen Report)"* atau *"Saduran/Opini"*.
* **Community Notes (Catatan Komunitas):** Pengguna lain dengan reputasi tinggi dapat mengajukan catatan koreksi konteks di bawah berita jika ditemukan informasi yang kurang akurat.

### C. *TL;DR Ringkasan Poin Penting* (Sesuai Wireframe)
Pada *wireframe* bagian bawah, terlihat struktur artikel yang memiliki daftar poin (*bullet points*).
* Sediakan *field* khusus **"3 Poin Inti Berita (Key Takeaways)"** saat user menulis berita, sehingga pembaca cepat memahami inti berita sebelum membaca paragraf penuh.

### D. Lencana Jurnalis Warga (*Karma / Trust Score*)
* Setiap kali berita seorang user mendapatkan *upvote*, *repost*, atau lolos verifikasi, poin reputasi (*Trust Score*) mereka bertambah. User dengan skor tinggi mendapat badge **Verified Contributor**.

### E. Optimasi Google Drive sebagai Image Storage (Teknis Penting)
* Google Drive sering membatasi *hotlinking* langsung (`403 Forbidden` / *rate limit*) jika diakses serentak oleh banyak pengunjung.
* **Solusi:** Gunakan *Service Account* Google Cloud + *Next.js Image Proxy Route* (`/api/media/[fileId]`) yang dilengkapi *compression* (`sharp`) dan *Edge Caching* (`Cache-Control`), sehingga gambar dari Google Drive tampil secepat CDN.

---

## 3. Peran Pengguna (User Roles)
1. **Guest (Pengunjung Tanpa Akun):**
   * Membaca berita, menjelajahi kategori, mencari berita, dan melihat komentar/repost.
2. **Registered User (Penulis & Pembaca Aktif):**
   * Memiliki halaman profil (`/@username`).
   * CRUD berita milik sendiri (Draft, Publish, Edit, Delete).
   * Melakukan *Like/Upvote*, *Comment* (dan *Reply*), *Repost* / *Quote Repost*, serta *Bookmark* berita.
   * Mengikuti (*Follow*) penulis lain.
3. **Moderator / Admin:**
   * Menentukan berita yang masuk ke *Headline Bento Grid* (halaman utama atas).
   * Mengelola daftar `KATEGORI` di *navbar*.
   * Menindak laporan (*Report*) berita hoax atau komentar spam.

---

## 4. Spesifikasi Fitur Utama (Functional Requirements)

| ID | Modul | Fitur | Prioritas | Deskripsi |
| :--- | :--- | :--- | :--- | :--- |
| **FR-01** | Auth & Profile | Autentikasi & Profil User | P0 (Wajib) | Login/Register via Supabase Auth (Email & Google OAuth), edit bio, foto profil (simpan di Google Drive), dan tab riwayat Post, Repost, serta Komentar. |
| **FR-02** | News CRUD | Editor Berita (Rich Text) | P0 (Wajib) | Buat, baca, perbarui, dan hapus berita. Mendukung upload *Thumbnail* ke Google Drive, pemilihan kategori, tag, ringkasan poin, dan *autosave draft*. |
| **FR-03** | Layout Utama | Hero Bento Grid & Kategori | P0 (Wajib) | Sesuai *wireframe*: Navbar berisi Logo + deretan Kategori. Bagian atas menampilkan 1 berita utama besar (kiri), 1 berita menengah (tengah), dan 3 berita daftar ringkas (kanan). |
| **FR-04** | Reader View | Tampilan Baca (Split & Flow) | P0 (Wajib) | Sesuai *wireframe* bagian bawah: Gambar besar di sisi kiri berdampingan dengan judul `TULISAN BERITA` dan paragraf pembuka di kanan, lalu menyambung penuh (*full-width*) di bawahnya. |
| **FR-05** | Social | Sistem Repost & Quote | P0 (Wajib) | User dapat menekan tombol Repost pada berita orang lain agar tampil di *feed* pengikutnya, dengan opsi menambahkan komentar kutipan (*quote*). |
| **FR-06** | Social | Komentar Berjenjang | P0 (Wajib) | User dapat menulis komentar pada berita, membalas komentar user lain (*nested replies*), serta mengedit/menghapus komentarnya sendiri. |
| **FR-07** | Discovery | Pencarian & Filter Kategori | P1 (Penting) | Pencarian berdasarkan judul/isi berita dan pemfilteran instan saat menu `KATEGORI` di *navbar* diklik. |

---

## 5. Kebutuhan Non-Fungsional (Non-Functional Requirements)
* **SEO & OpenGraph:** Setiap halaman berita (`/berita/[slug]`) wajib dirender di sisi server (SSR/ISR) dengan *meta tag* OpenGraph dinamis agar saat dibagikan ke WhatsApp/X menampilkan gambar dan judul yang rapi.
* **Performa Gambar:** Maksimal ukuran gambar yang diunggah user adalah 5 MB, otomatis dikonversi ke format `.webp` sebelum dikirim ke Google Drive.
* **Responsivitas:** Layout 3 kolom pada *Hero Bento Grid* otomatis beradaptasi menjadi 1 kolom (*stacked*) pada layar ponsel (*mobile-first*).