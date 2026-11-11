# Database Schema & Data Modeling (`SCHEME.MD`)

Dokumen ini mendefinisikan skema database PostgreSQL pada **Supabase** yang dikelola menggunakan **Prisma ORM**. Seluruh data teks dan relasi disimpan sebagai *string/text* di Supabase, sementara aset gambar disimpan di **Google Drive** dan direferensikan menggunakan `driveFileId`.

---

## 1. Arsitektur Penyimpanan Aset (Supabase + Google Drive)
* **Supabase PostgreSQL:** Menyimpan seluruh teks berita, metadata, akun user, relasi komentar, dan *repost*.
* **Kolom Gambar (`driveFileId`):** Alih-alih menyimpan *binary file* di database, kita menyimpan **ID File Google Drive** (contoh: `1A2b3C4d5E6f7G8h9I0j`). URL gambar dirender melalui endpoint internal `/api/media/[driveFileId]`.

---

## 2. File Konfigurasi `prisma/schema.prisma`

```prisma
// prisma/schema.prisma

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")      // Supabase Transaction Pooler (Port 6543)
  directUrl = env("DIRECT_URL")        // Supabase Direct Connection (Port 5432 - untuk migrasi)
}

enum Role {
  USER
  MODERATOR
  ADMIN
}

enum ArticleStatus {
  DRAFT
  PUBLISHED
  ARCHIVED
}

enum HeadlinePosition {
  NONE
  MAIN_LEFT     // Kolom Kiri Besar pada Wireframe Bento Grid
  MIDDLE_CENTER // Kolom Tengah pada Wireframe Bento Grid
  RIGHT_LIST    // 3 List Kanan pada Wireframe Bento Grid
}

// 1. Model User (Terhubung dengan Supabase Auth UID)
model User {
  id              String    @id @default(uuid())
  email           String    @unique
  username        String    @unique
  fullName        String
  bio             String?   @db.Text
  avatarDriveId   String?   // ID file foto profil di Google Drive
  role            Role      @default(USER)
  isVerified      Boolean   @default(false)
  trustScore      Int       @default(0)
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt

  // Relasi
  articles        Article[]
  comments        Comment[]
  reposts         Repost[]
  likes           Like[]
  bookmarks       Bookmark[]
  followers       Follow[]  @relation("following")
  following       Follow[]  @relation("follower")

  @@index([username])
}

// 2. Model Kategori Berita (Ditampilkan di Navbar sesuai Wireframe)
model Category {
  id          String    @id @default(cuid())
  name        String    @unique
  slug        String    @unique
  description String?
  orderIndex  Int       @default(0) // Urutan tampil di Navbar
  createdAt   DateTime  @default(now())

  articles    Article[]

  @@index([slug])
}

// 3. Model Berita / Artikel (Inti CRUD)
model Article {
  id                String           @id @default(cuid())
  title             String           @db.VarChar(255)
  slug              String           @unique
  excerpt           String?          @db.Text // Ringkasan singkat
  content           String           @db.Text // Isi berita lengkap (HTML/Markdown)
  keyTakeaways      String[]         // Poin-poin penting (Bullet points seperti di wireframe)
  
  // Integrasi Google Drive untuk Gambar Berita
  thumbnailDriveId  String           // File ID Gambar Utama di Google Drive
  imageCaption      String?
  
  // Metadata Berita & Kredibilitas
  sourceUrl         String?          // URL sumber referensi (jika ada)
  status            ArticleStatus    @default(PUBLISHED)
  headlinePosition  HeadlinePosition @default(NONE)
  viewCount         Int              @default(0)
  
  // Foreign Keys
  authorId          String
  categoryId        String
  
  createdAt         DateTime         @default(now())
  updatedAt         DateTime         @updatedAt
  publishedAt       DateTime?        @default(now())

  // Relasi
  author            User             @relation(fields: [authorId], references: [id], onDelete: Cascade)
  category          Category         @relation(fields: [categoryId], references: [id], onDelete: Restrict)
  comments          Comment[]
  reposts           Repost[]
  likes             Like[]
  bookmarks         Bookmark[]

  @@index([slug])
  @@index([categoryId, status, publishedAt(sort: Desc)])
  @@index([authorId])
  @@index([headlinePosition])
}

// 4. Model Repost (Mendukung Direct Repost & Quote Repost)
model Repost {
  id          String   @id @default(cuid())
  userId      String
  articleId   String
  quoteText   String?  @db.Text // Kosong jika Direct Repost, terisi jika Quote Repost (Opini)
  createdAt   DateTime @default(now())

  user        User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  article     Article  @relation(fields: [articleId], references: [id], onDelete: Cascade)

  // Satu user bisa direct-repost 1x per berita, atau membuat quote-repost
  @@unique([userId, articleId])
  @@index([userId, createdAt(sort: Desc)])
  @@index([articleId])
}

// 5. Model Komentar Berjenjang (Nested Comments)
model Comment {
  id          String    @id @default(cuid())
  content     String    @db.Text
  userId      String
  articleId   String
  parentId    String?   // Jika terisi, berarti ini adalah balasan (reply) terhadap komentar lain
  isEdited    Boolean   @default(false)
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt

  user        User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  article     Article   @relation(fields: [articleId], references: [id], onDelete: Cascade)
  parent      Comment?  @relation("CommentReplies", fields: [parentId], references: [id], onDelete: Cascade)
  replies     Comment[] @relation("CommentReplies")

  @@index([articleId, createdAt(sort: Asc)])
  @@index([parentId])
}

// 6. Model Like / Upvote Berita
model Like {
  id        String   @id @default(cuid())
  userId    String
  articleId String
  createdAt DateTime @default(now())

  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  article   Article  @relation(fields: [articleId], references: [id], onDelete: Cascade)

  @@unique([userId, articleId])
}

// 7. Model Bookmark (Simpan Berita)
model Bookmark {
  id        String   @id @default(cuid())
  userId    String
  articleId String
  createdAt DateTime @default(now())

  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  article   Article  @relation(fields: [articleId], references: [id], onDelete: Cascade)

  @@unique([userId, articleId])
}

// 8. Model Follow Antar User
model Follow {
  followerId  String
  followingId String
  createdAt   DateTime @default(now())

  follower    User     @relation("follower", fields: [followerId], references: [id], onDelete: Cascade)
  following   User     @relation("following", fields: [followingId], references: [id], onDelete: Cascade)

  @@id([followerId, followingId])
}
```

---

## 3. Penjelasan Relasi Kunci Berdasarkan Kebutuhan
1. **`HeadlinePosition` Enum pada `Article`:** Memudahkan sistem memetakan berita mana yang masuk ke kotak kiri besar (`MAIN_LEFT`), kotak tengah (`MIDDLE_CENTER`), dan 3 daftar kanan (`RIGHT_LIST`) sesuai dengan gambar *wireframe* Anda.
2. **`Repost` dengan `quoteText` Opsional:** Memungkinkan user melakukan *1-click repost* maupun *Repost dengan Kutipan Opini* layaknya sosial media X/Twitter.
3. **`Comment` Self-Relation (`parentId`):** Mendukung diskusi berjenjang di bawah artikel berita.