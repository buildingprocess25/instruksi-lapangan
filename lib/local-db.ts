import fs from "node:fs"
import path from "node:path"
import type {
  Article,
  ArticleStatus,
  ArticleType,
  Bookmark,
  Category,
  Comment,
  Follow,
  HeadlinePosition,
  Like,
  Repost,
  Role,
  User,
} from "@prisma/client"

type LocalDbSchema = {
  users: User[]
  categories: Category[]
  articles: Article[]
  reposts: Repost[]
  comments: Comment[]
  likes: Like[]
  bookmarks: Bookmark[]
  follows: Follow[]
}

const DB_FILE = path.join(process.cwd(), ".local-db.json")

function getSeedData(): LocalDbSchema {
  const now = new Date()
  const users: User[] = [
    {
      id: "user-admin-1",
      email: "admin@wartawarga.id",
      username: "admin",
      fullName: "Admin Redaksi",
      bio: "Editor & pengelola platform Warta Warga.",
      avatarDriveId: "mock-avatar-admin",
      role: "ADMIN" as Role,
      isVerified: true,
      trustScore: 320,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: "user-jurnalis-2",
      email: "budi@wartawarga.id",
      username: "budi_santoso",
      fullName: "Budi Santoso",
      bio: "Jurnalis warga fokus teknologi dan ekonomi perkotaan.",
      avatarDriveId: "mock-avatar-budi",
      role: "USER" as Role,
      isVerified: true,
      trustScore: 88,
      createdAt: now,
      updatedAt: now,
    },
  ]

  const categories: Category[] = [
    { id: "cat-nasional", name: "Nasional", slug: "nasional", description: "Kabar kebijakan, daerah, dan peristiwa terkini nasional.", orderIndex: 0, createdAt: now },
    { id: "cat-teknologi", name: "Teknologi", slug: "teknologi", description: "Perkembangan AI, gawai, perangkat lunak, dan riset inovasi.", orderIndex: 1, createdAt: now },
    { id: "cat-ekonomi", name: "Ekonomi", slug: "ekonomi", description: "Pasar keuangan, industri, perdagangan, dan bisnis UMKM.", orderIndex: 2, createdAt: now },
    { id: "cat-olahraga", name: "Olahraga", slug: "olahraga", description: "Sepak bola, bulu tangkis, dan ajang olahraga nasional & dunia.", orderIndex: 3, createdAt: now },
    { id: "cat-opini", name: "Opini", slug: "opini", description: "Sudut pandang kritis, analisis, dan esai dari kontributor.", orderIndex: 4, createdAt: now },
  ]

  const articles: Article[] = [
    {
      id: "art-1",
      title: "Transformasi Digital dan AI Nasional: Peluang dan Tantangan Baru 2026",
      slug: "transformasi-digital-dan-ai-nasional-peluang-dan-tantangan-baru-2026",
      excerpt: "Perkembangan adopsi kecerdasan buatan di sektor publik dan industri mendorong percepatan ekonomi berbasis data.",
      content: `<p>Perkembangan teknologi kecerdasan buatan telah memasuki fase implementasi praktis di berbagai sektor industri dan layanan masyarakat Indonesia. Inisiatif modernisasi infrastruktur komputasi awan dan tata kelola data semakin terkoordinasi di tingkat nasional.</p><p>Para pelaku usaha rintisan hingga korporasi manufaktur mulai mengintegrasikan analitik prediktif guna menekan biaya operasional dan mempercepat pengambilan keputusan strategis.</p><h2>Kolaborasi Multi-Pihak</h2><p>Tantangan utama yang dihadapi saat ini adalah pemerataan literasi kecerdasan buatan serta pemenuhan regulasi perlindungan data pribadi yang ketat agar pemanfaatan teknologi senantiasa selaras dengan kepentingan publik.</p>`,
      keyTakeaways: [
        "Pertumbuhan efisiensi sektor industri mencapai 35% berkat otomatisasi.",
        "Regulasi etika kecerdasan buatan mulai diratifikasi secara nasional.",
        "Kebutuhan talenta digital dan keamanan data meningkat dua kali lipat.",
      ],
      thumbnailDriveId: "mock-thumb-1",
      imageCaption: "Pusat inovasi teknologi komputasi awan di Jakarta.",
      sourceUrl: "https://kominfo.go.id",
      status: "PUBLISHED" as ArticleStatus,
      headlinePosition: "MAIN_LEFT" as HeadlinePosition,
      viewCount: 1420,
      authorId: "user-jurnalis-2",
      categoryId: "cat-teknologi",
      createdAt: now,
      updatedAt: now,
      publishedAt: now,
      type: "CITIZEN_REPORT" as ArticleType,
    },
    {
      id: "art-2",
      title: "Neraca Dagang Kuartal Pertama Catat Surplus Signifikan",
      slug: "neraca-dagang-kuartal-pertama-catat-surplus-signifikan",
      excerpt: "Ekspor manufaktur dan komoditas hijau menjadi pendorong utama kestabilan moneter nasional.",
      content: `<p>Kinerja ekspor nasional menunjukkan ketahanan yang solid sepanjang kuartal pertama. Komoditas bernilai tambah tinggi dan produk manufaktur ramah lingkungan memimpin perolehan devisa.</p><p>Kementerian Perdagangan menyatakan bahwa perluasan jaringan perjanjian dagang bilateral ke kawasan Amerika Latin dan Asia Selatan berhasil membuka pasar nontradisional baru.</p>`,
      keyTakeaways: [
        "Surplus perdagangan meningkat 12% secara tahunan.",
        "Manufaktur teknologi tinggi menyumbang porsi ekspor terbesar.",
        "Diversifikasi mitra dagang baru memperkuat daya saing.",
      ],
      thumbnailDriveId: "mock-thumb-2",
      imageCaption: "Aktivitas bongkar muat peti kemas di pelabuhan internasional.",
      sourceUrl: "https://kemendag.go.id",
      status: "PUBLISHED" as ArticleStatus,
      headlinePosition: "MIDDLE_CENTER" as HeadlinePosition,
      viewCount: 980,
      authorId: "user-admin-1",
      categoryId: "cat-ekonomi",
      createdAt: now,
      updatedAt: now,
      publishedAt: now,
      type: "CITIZEN_REPORT" as ArticleType,
    },
    {
      id: "art-3",
      title: "Riset Baterai Ramah Lingkungan Karya Peneliti Kampus Negeri Raih Paten",
      slug: "riset-baterai-ramah-lingkungan-karya-peneliti-kampus-negeri-raih-paten",
      excerpt: "Inovasi elektrolit padat berbasis mineral lokal berpotensi menurunkan biaya produksi baterai kendaraan listrik.",
      content: `<p>Tim peneliti gabungan perguruan tinggi negeri sukses mematenkan sel baterai padat berefisiensi tinggi. Pengujian laboratorium menunjukkan degradasi sel yang sangat minim setelah ribuan siklus pengisian cepat.</p>`,
      keyTakeaways: ["Efisiensi pengisian daya meningkat 25%.", "Bahan baku mengoptimalkan mineral lokal terbarukan."],
      thumbnailDriveId: "mock-thumb-3",
      imageCaption: "Prototipe modul baterai di laboratorium teknik elektro.",
      sourceUrl: null,
      status: "PUBLISHED" as ArticleStatus,
      headlinePosition: "RIGHT_LIST" as HeadlinePosition,
      viewCount: 650,
      authorId: "user-jurnalis-2",
      categoryId: "cat-teknologi",
      createdAt: now,
      updatedAt: now,
      publishedAt: now,
      type: "CITIZEN_REPORT" as ArticleType,
    },
    {
      id: "art-4",
      title: "Pemberdayaan UMKM Pesisir Melalui Digitalisasi Rantai Pasok",
      slug: "pemberdayaan-umkm-pesisir-melalui-digitalisasi-rantai-pasok",
      excerpt: "Koperasi nelayan kini terhubung langsung dengan pasar induk perkotaan lewat aplikasi rantai dingin.",
      content: `<p>Program digitalisasi sentra nelayan memangkas rantai distribusi hasil laut hingga 40%. Para pedagang kecil di sentra pengolahan ikan kini menikmati margin pendapatan yang lebih stabil.</p>`,
      keyTakeaways: ["Harga jual tangkapan lebih transparan.", "Limbah pascapanen berkurang drastis."],
      thumbnailDriveId: "mock-thumb-4",
      imageCaption: "Pendaratan ikan di dermaga nelayan tradisional.",
      sourceUrl: null,
      status: "PUBLISHED" as ArticleStatus,
      headlinePosition: "RIGHT_LIST" as HeadlinePosition,
      viewCount: 430,
      authorId: "user-admin-1",
      categoryId: "cat-ekonomi",
      createdAt: now,
      updatedAt: now,
      publishedAt: now,
      type: "CITIZEN_REPORT" as ArticleType,
    },
    {
      id: "art-5",
      title: "Tim Nasional Siapkan Taktik Baru Hadapi Laga Kualifikasi Utama",
      slug: "tim-nasional-siapkan-taktik-baru-hadapi-laga-kualifikasi-utama",
      excerpt: "Fokus pada transisi cepat dan koordinasi lini tengah menjadi menu utama pemusatan latihan.",
      content: `<p>Pelatih kepala menegaskan pentingnya konsentrasi penuh sepanjang 90 menit pertandingan. Seluruh pemain dalam kondisi prima menjelang laga penentuan pekan depan.</p>`,
      keyTakeaways: ["Pemusatan latihan intensif digelar di dataran tinggi.", "Rotasi skuad disiapkan untuk mengatasi kelelahan."],
      thumbnailDriveId: "mock-thumb-5",
      imageCaption: "Sesi latihan taktik di stadion utama.",
      sourceUrl: null,
      status: "PUBLISHED" as ArticleStatus,
      headlinePosition: "RIGHT_LIST" as HeadlinePosition,
      viewCount: 1120,
      authorId: "user-jurnalis-2",
      categoryId: "cat-olahraga",
      createdAt: now,
      updatedAt: now,
      publishedAt: now,
      type: "CITIZEN_REPORT" as ArticleType,
    },
    {
      id: "art-6",
      title: "Masa Depan Transportasi Terintegrasi di Kota-Kota Penyangga",
      slug: "masa-depan-transportasi-terintegrasi-di-kota-kota-penyangga",
      excerpt: "Pembangunan koridor bus listrik dan jalur rel komuter mempersempit jurang mobilitas warga sub-urban.",
      content: `<p>Keterhubungan antarmoda angkutan umum berhasil meningkatkan minat masyarakat menggunakan transportasi publik hingga 28%. Waktu tempuh komuter berkurang secara signifikan.</p>`,
      keyTakeaways: ["Pengurangan emisi karbon harian di koridor utama.", "Tiket terintegrasi memudahkan perjalanan multi-armada."],
      thumbnailDriveId: "mock-thumb-6",
      imageCaption: "Stasiun integrasi antarmoda saat jam sibuk sore.",
      sourceUrl: null,
      status: "PUBLISHED" as ArticleStatus,
      headlinePosition: "NONE" as HeadlinePosition,
      viewCount: 780,
      authorId: "user-admin-1",
      categoryId: "cat-nasional",
      createdAt: now,
      updatedAt: now,
      publishedAt: now,
      type: "CITIZEN_REPORT" as ArticleType,
    },
    {
      id: "art-7",
      title: "Opini: Membangun Ekosistem Berita Kredibel di Era Algoritma Sosial",
      slug: "opini-membangun-ekosistem-berita-kredibel-di-era-algoritma-sosial",
      excerpt: "Partisipasi aktif pembaca dalam memeriksa fakta dan membagikan kutipan berbobot menjadi benteng melawan hoaks.",
      content: `<p>Jurnalisme warga bukan sekadar kecepatan menyebarkan kabar, melainkan pertanggungjawaban verifikasi di ruang publik. Model kurasi komunitas memberikan harapan baru bagi kualitas wacana informasi kita.</p>`,
      keyTakeaways: ["Kredibilitas dibangun lewat konsistensi sumber rujukan.", "Umpan balik pembaca menjaga akurasi laporan."],
      thumbnailDriveId: "mock-thumb-7",
      imageCaption: "Diskusi media dan literasi digital di ruang kerja redaksi.",
      sourceUrl: null,
      status: "PUBLISHED" as ArticleStatus,
      headlinePosition: "NONE" as HeadlinePosition,
      viewCount: 540,
      authorId: "user-jurnalis-2",
      categoryId: "cat-opini",
      createdAt: now,
      updatedAt: now,
      publishedAt: now,
      type: "OPINION" as ArticleType,
    },
  ]

  const comments: Comment[] = [
    {
      id: "comm-1",
      content: "Ulasan yang sangat komprehensif! Regulasi etika data memang krusial agar industri bisa bersaing secara sehat.",
      userId: "user-admin-1",
      articleId: "art-1",
      parentId: null,
      isEdited: false,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: "comm-2",
      content: "Setuju, terutama di sektor kesehatan dan finansial di mana privasi konsumen adalah hal mutlak.",
      userId: "user-jurnalis-2",
      articleId: "art-1",
      parentId: "comm-1",
      isEdited: false,
      createdAt: now,
      updatedAt: now,
    },
  ]

  const reposts: Repost[] = [
    {
      id: "rep-1",
      userId: "user-admin-1",
      articleId: "art-1",
      quoteText: "Bacaan wajib pagi ini mengenai peta jalan transformasi digital nasional.",
      createdAt: now,
    },
  ]

  const likes: Like[] = [
    { id: "like-1", userId: "user-admin-1", articleId: "art-1", createdAt: now },
    { id: "like-2", userId: "user-jurnalis-2", articleId: "art-2", createdAt: now },
  ]

  const bookmarks: Bookmark[] = [
    { id: "bm-1", userId: "user-admin-1", articleId: "art-1", createdAt: now },
  ]

  const follows: Follow[] = [
    { followerId: "user-admin-1", followingId: "user-jurnalis-2", createdAt: now },
  ]

  return { users, categories, articles, reposts, comments, likes, bookmarks, follows }
}

function parseDates<T>(item: T): T {
  if (!item || typeof item !== "object") return item
  const record = item as Record<string, unknown>
  for (const [key, val] of Object.entries(record)) {
    if (typeof val === "string" && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(val)) {
      record[key] = new Date(val)
    }
  }
  return record as T
}

export class LocalDb {
  private data: LocalDbSchema

  constructor() {
    this.data = this.load()
  }

  private load(): LocalDbSchema {
    if (!fs.existsSync(DB_FILE)) {
      const seed = getSeedData()
      this.save(seed)
      return seed
    }
    try {
      const raw = fs.readFileSync(DB_FILE, "utf-8")
      const parsed = JSON.parse(raw) as LocalDbSchema
      return {
        users: parsed.users.map(parseDates),
        categories: parsed.categories.map(parseDates),
        articles: parsed.articles.map(parseDates),
        reposts: parsed.reposts.map(parseDates),
        comments: parsed.comments.map(parseDates),
        likes: parsed.likes.map(parseDates),
        bookmarks: parsed.bookmarks.map(parseDates),
        follows: parsed.follows.map(parseDates),
      }
    } catch {
      const seed = getSeedData()
      this.save(seed)
      return seed
    }
  }

  private save(data = this.data) {
    try {
      fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), "utf-8")
    } catch {}
  }

  // --- Users ---
  getUsers() { return this.data.users }
  getUserById(id: string) { return this.data.users.find((u) => u.id === id) || null }
  getUserByUsername(username: string) { return this.data.users.find((u) => u.username.toLowerCase() === username.toLowerCase()) || null }
  getUserByEmail(email: string) { return this.data.users.find((u) => u.email.toLowerCase() === email.toLowerCase()) || null }
  createUser(user: User) {
    this.data.users.push(user)
    this.save()
    return user
  }
  updateUser(id: string, updates: Partial<User>) {
    const idx = this.data.users.findIndex((u) => u.id === id)
    if (idx === -1) return null
    this.data.users[idx] = { ...this.data.users[idx], ...updates, updatedAt: new Date() }
    this.save()
    return this.data.users[idx]
  }

  // --- Categories ---
  getCategories() {
    return [...this.data.categories].sort((a, b) => a.orderIndex - b.orderIndex || a.name.localeCompare(b.name))
  }
  getCategoryBySlug(slug: string) { return this.data.categories.find((c) => c.slug === slug) || null }
  getCategoryById(id: string) { return this.data.categories.find((c) => c.id === id) || null }
  createCategory(cat: Category) {
    this.data.categories.push(cat)
    this.save()
    return cat
  }
  updateCategory(id: string, updates: Partial<Category>) {
    const idx = this.data.categories.findIndex((c) => c.id === id)
    if (idx === -1) return null
    this.data.categories[idx] = { ...this.data.categories[idx], ...updates }
    this.save()
    return this.data.categories[idx]
  }
  deleteCategory(id: string) {
    this.data.categories = this.data.categories.filter((c) => c.id !== id)
    this.save()
  }

  // --- Articles ---
  getArticles() { return this.data.articles }
  getArticleById(id: string) { return this.data.articles.find((a) => a.id === id) || null }
  getArticleBySlug(slug: string) { return this.data.articles.find((a) => a.slug === slug) || null }
  createArticle(article: Article) {
    this.data.articles.unshift(article)
    this.save()
    return article
  }
  updateArticle(id: string, updates: Partial<Article>) {
    const idx = this.data.articles.findIndex((a) => a.id === id)
    if (idx === -1) return null
    this.data.articles[idx] = { ...this.data.articles[idx], ...updates, updatedAt: new Date() }
    this.save()
    return this.data.articles[idx]
  }
  deleteArticle(id: string) {
    this.data.articles = this.data.articles.filter((a) => a.id !== id)
    this.data.comments = this.data.comments.filter((c) => c.articleId !== id)
    this.data.reposts = this.data.reposts.filter((r) => r.articleId !== id)
    this.data.likes = this.data.likes.filter((l) => l.articleId !== id)
    this.data.bookmarks = this.data.bookmarks.filter((b) => b.articleId !== id)
    this.save()
  }

  // --- Comments ---
  getComments(articleId: string) {
    return this.data.comments.filter((c) => c.articleId === articleId)
  }
  getUserComments(userId: string) {
    return this.data.comments.filter((c) => c.userId === userId)
  }
  getCommentById(id: string) { return this.data.comments.find((c) => c.id === id) || null }
  createComment(comment: Comment) {
    this.data.comments.push(comment)
    this.save()
    return comment
  }
  updateComment(id: string, content: string) {
    const idx = this.data.comments.findIndex((c) => c.id === id)
    if (idx === -1) return null
    this.data.comments[idx] = { ...this.data.comments[idx], content, isEdited: true, updatedAt: new Date() }
    this.save()
    return this.data.comments[idx]
  }
  deleteComment(id: string) {
    // Delete comment and its nested replies
    const toDelete = new Set<string>([id])
    let changed = true
    while (changed) {
      changed = false
      for (const c of this.data.comments) {
        if (c.parentId && toDelete.has(c.parentId) && !toDelete.has(c.id)) {
          toDelete.add(c.id)
          changed = true
        }
      }
    }
    this.data.comments = this.data.comments.filter((c) => !toDelete.has(c.id))
    this.save()
  }

  // --- Reposts ---
  getReposts(articleId: string) {
    return this.data.reposts.filter((r) => r.articleId === articleId)
  }
  getUserReposts(userId: string) {
    return this.data.reposts.filter((r) => r.userId === userId)
  }
  getAllReposts() {
    return this.data.reposts
  }
  getRepost(userId: string, articleId: string) {
    return this.data.reposts.find((r) => r.userId === userId && r.articleId === articleId) || null
  }
  createRepost(repost: Repost) {
    this.data.reposts.push(repost)
    this.save()
    return repost
  }
  updateRepostQuote(userId: string, articleId: string, quoteText: string | null) {
    const rep = this.getRepost(userId, articleId)
    if (rep) {
      rep.quoteText = quoteText
      this.save()
    }
    return rep
  }
  deleteRepost(userId: string, articleId: string) {
    this.data.reposts = this.data.reposts.filter((r) => !(r.userId === userId && r.articleId === articleId))
    this.save()
  }

  // --- Likes ---
  getLikesCount(articleId: string) { return this.data.likes.filter((l) => l.articleId === articleId).length }
  getLike(userId: string, articleId: string) {
    return this.data.likes.find((l) => l.userId === userId && l.articleId === articleId) || null
  }
  createLike(like: Like) {
    this.data.likes.push(like)
    this.save()
    return like
  }
  deleteLike(userId: string, articleId: string) {
    this.data.likes = this.data.likes.filter((l) => !(l.userId === userId && l.articleId === articleId))
    this.save()
  }

  // --- Bookmarks ---
  getUserBookmarks(userId: string) {
    return this.data.bookmarks.filter((b) => b.userId === userId)
  }
  getBookmark(userId: string, articleId: string) {
    return this.data.bookmarks.find((b) => b.userId === userId && b.articleId === articleId) || null
  }
  createBookmark(bm: Bookmark) {
    this.data.bookmarks.push(bm)
    this.save()
    return bm
  }
  deleteBookmark(userId: string, articleId: string) {
    this.data.bookmarks = this.data.bookmarks.filter((b) => !(b.userId === userId && b.articleId === articleId))
    this.save()
  }

  // --- Follows ---
  getFollow(followerId: string, followingId: string) {
    return this.data.follows.find((f) => f.followerId === followerId && f.followingId === followingId) || null
  }
  createFollow(f: Follow) {
    this.data.follows.push(f)
    this.save()
    return f
  }
  deleteFollow(followerId: string, followingId: string) {
    this.data.follows = this.data.follows.filter((f) => !(f.followerId === followerId && f.followingId === followingId))
    this.save()
  }
  getUserFollowersCount(userId: string) { return this.data.follows.filter((f) => f.followingId === userId).length }
  getUserFollowingCount(userId: string) { return this.data.follows.filter((f) => f.followerId === userId).length }
  getUserFollowing(userId: string) { return this.data.follows.filter((f) => f.followerId === userId) }
}

const globalForLocalDb = globalThis as unknown as { localDb?: LocalDb }
export const localDb = globalForLocalDb.localDb ?? new LocalDb()
if (process.env.NODE_ENV !== "production") globalForLocalDb.localDb = localDb
