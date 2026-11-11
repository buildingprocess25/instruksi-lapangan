# UI/UX Design Specification (`DESIGN.MD`)

Dokumen ini menerjemahkan sketsa *wireframe* yang Anda lampirkan menjadi spesifikasi desain modern menggunakan **Tailwind CSS** dan komponen **shadcn/ui**.

---

## 1. Bedah Layout Berdasarkan Wireframe

### A. Top Navigation Bar (`Navbar`)
Sesuai bagian paling atas pada gambar *wireframe*:
* **Struktur:** Bar horizontal penuh (`w-full h-16 bg-slate-100/90 backdrop-blur border-b border-slate-200 sticky top-0 z-50`).
* **Elemen Kiri:** `LOGO` aplikasi dengan tipografi tegas.
* **Elemen Tengah:** Deretan tautan `KATEGORI` (`Nasional`, `Teknologi`, `Ekonomi`, `Olahraga`, `Opini`) yang disejajarkan secara horizontal (`flex items-center gap-8`).
* **Elemen Kanan (Tambahan Fungsional Sosial Media):** Tombol **"+ Tulis Berita"** (`Button` dari shadcn/ui), ikon Notifikasi, dan `Avatar` dropdown akun pengguna.

### B. Bagian Atas: Hero Bento Grid (`Headline Section`)
Pada *wireframe*, bagian atas dibungkus dalam sebuah *container* besar bersudut membulat (`rounded-3xl bg-slate-100 p-6 lg:p-8`) yang memiliki **Grid 12 Kolom (`grid-cols-1 lg:grid-cols-12 gap-6`)**:

1. **Kolom Kiri — Headline Utama (`lg:col-span-5`):**
   * Menampilkan kotak `GAMBAR` berukuran paling besar (`aspect-[4/3] w-full rounded-2xl object-cover`).
   * Di bawah gambar terdapat `JUDUL BERITA` dengan ukuran huruf paling menonjol (`text-2xl lg:text-3xl font-bold leading-tight mt-4`), diikuti info singkat penulis, waktu tayang, serta jumlah *Repost* & *Komentar*.
2. **Kolom Tengah — Sub-Headline (`lg:col-span-4`):**
   * Menampilkan kotak `GAMBAR` menengah di bagian atas (`aspect-[16/10] w-full rounded-2xl object-cover`).
   * Di bawahnya terdapat `JUDUL BERITA` rata tengah atau kiri (`text-xl font-bold mt-4`) beserta cuplikan singkat (*excerpt*).
3. **Kolom Kanan — 3 Berita Terpopuler/Terkini (`lg:col-span-3 flex flex-col justify-between gap-4`):**
   * Berisi **3 kartu horizontal yang ditumpuk ke bawah**.
   * Masing-masing item menggunakan `flex items-center gap-4`:
     * Sisi kiri: Kotak `GAMBAR` persegi/kompak (`w-24 h-24 shrink-0 rounded-xl object-cover`).
     * Sisi kanan: `JUDUL BERITA` (`text-sm font-semibold line-clamp-3`).

### C. Bagian Bawah: Tampilan Baca Berita & Editorial (`TULISAN BERITA`)
Pada paruh bawah *wireframe*, terdapat tata letak *editorial magazine* yang sangat khas:
* **Judul Seksi / Header Artikel:** Teks `TULISAN BERITA` di sisi kanan atas (`text-2xl lg:text-3xl font-extrabold tracking-tight mb-4`).
* **Baris Pertama (2 Kolom Sejajar — `grid-cols-1 lg:grid-cols-12 gap-8 items-start`):**
  * **Sisi Kiri (`lg:col-span-5`):** Kotak `GAMBAR` besar (`aspect-[4/3] rounded-2xl bg-slate-200 object-cover sticky top-24`).
  * **Sisi Kanan (`lg:col-span-7`):** Paragraf pembuka artikel, sub-judul, serta daftar poin (*bullet points* `keyTakeaways`) yang padat dan terstruktur.
* **Baris Kedua (Teks Penuh di Bawah Gambar — `w-full mt-6`):**
  * Paragraf lanjutan mengalir memenuhi lebar kontainer (`max-w-none prose prose-slate`) tepat di bawah gambar dan kolom teks kanan.
* **Baris Interaksi Sosial (Di Bawah Artikel):**
  * **Action Bar Sosial:** Tombol *Upvote/Like*, tombol **Repost** (Dropdown: *Repost Langsung* atau *Kutipan Opini*), tombol *Komentar*, dan *Bookmark*.
  * **Kolom Komentar & Repost Feed:** Menggunakan komponen `Textarea`, `Avatar`, dan `Tabs` dari `shadcn/ui`.

---

## 2. Sistem Tipografi & Warna (Design Tokens)

### Palet Warna (Clean Editorial + Social Vibe)
* **Background Utama:** `#FFFFFF` (Putih bersih untuk ruang baca)
* **Surface / Container Bento:** `#F1F5F9` (`slate-100` — sesuai warna abu-abu lembut pada kartu *wireframe*)
* **Placeholder / Elemen Gambar:** `#CBD5E1` (`slate-300`)
* **Teks Utama (Judul & Isi):** `#0F172A` (`slate-900` — kontras tinggi agar nyaman dibaca lama)
* **Teks Sekunder (Metadata/Waktu/Kategori):** `#475569` (`slate-600`)
* **Aksen Utama (Brand/CTA/Repost Aktif):** `#2563EB` (`blue-600`) atau `#059669` (`emerald-600` untuk indikator *Repost/Verified*)

### Tipografi
* **Font Judul (`JUDUL BERITA`):** `Plus Jakarta Sans` atau `Merriweather` (Memberikan kesan jurnalisme kredibel dan tegas).
* **Font Isi (`TULISAN BERITA` & UI):** `Inter` (Sangat nyaman untuk paragraf panjang dan elemen sosial media).

---

## 3. Pemetaan Komponen `shadcn/ui`

| Bagian UI | Komponen `shadcn/ui` yang Digunakan | Fungsi |
| :--- | :--- | :--- |
| **Navbar Kategori** | `NavigationMenu`, `Button`, `DropdownMenu`, `Avatar` | Navigasi antar kategori berita dan menu profil user. |
| **Hero Bento Grid** | `Card`, `Badge`, `Skeleton` | Pembungkus visual berita utama dan *loading state* gambar dari Google Drive. |
| **Modal Repost / Quote** | `Dialog`, `Popover`, `Textarea` | Muncul saat user menekan tombol Repost untuk menambahkan opini singkat. |
| **CRUD Editor Berita** | `Form`, `Input`, `Select`, `Switch`, `Sonner` (Toast) | Form pembuatan/pengeditan berita dan notifikasi berhasil simpan. |
| **Diskusi & Komentar** | `Tabs`, `Separator`, `ScrollArea`, `Collapsible` | Menampilkan daftar komentar berjenjang dan daftar user yang me-*repost*. |