import "server-only"

import { Prisma, type Article, type HeadlinePosition, type User } from "@prisma/client"
import { z } from "zod"

import { isLocalMode } from "@/lib/env"
import { localDb } from "@/lib/local-db"
import { ServiceError } from "@/lib/errors"
import { deleteFile } from "@/lib/google-drive"
import { DRIVE_ID_PATTERN } from "@/lib/media"
import { prisma } from "@/lib/prisma"
import { sanitizeHtml } from "@/lib/sanitize"
import { slugify, withSuffix } from "@/lib/slug"
import { stripHtml } from "@/lib/format"

export const PAGE_SIZE = 12
const RIGHT_LIST_SIZE = 3

export const cardSelect = {
  id: true,
  title: true,
  slug: true,
  excerpt: true,
  thumbnailDriveId: true,
  imageCaption: true,
  publishedAt: true,
  type: true,
  headlinePosition: true,
  author: {
    select: { username: true, fullName: true, avatarDriveId: true, isVerified: true },
  },
  category: { select: { name: true, slug: true } },
  _count: { select: { comments: true, reposts: true, likes: true } },
} satisfies Prisma.ArticleSelect

export type ArticleCard = Prisma.ArticleGetPayload<{ select: typeof cardSelect }>

function toArticleCard(a: Article): ArticleCard {
  const author = localDb.getUserById(a.authorId)
  const category = localDb.getCategoryById(a.categoryId)
  return {
    id: a.id,
    title: a.title,
    slug: a.slug,
    excerpt: a.excerpt,
    thumbnailDriveId: a.thumbnailDriveId,
    imageCaption: a.imageCaption,
    publishedAt: a.publishedAt,
    type: a.type,
    headlinePosition: a.headlinePosition,
    author: {
      username: author?.username ?? "anon",
      fullName: author?.fullName ?? "Anonim",
      avatarDriveId: author?.avatarDriveId ?? null,
      isVerified: author?.isVerified ?? false,
    },
    category: {
      name: category?.name ?? "Umum",
      slug: category?.slug ?? "umum",
    },
    _count: {
      comments: localDb.getComments(a.id).length,
      reposts: localDb.getReposts(a.id).length,
      likes: localDb.getLikesCount(a.id),
    },
  }
}

const published = { status: "PUBLISHED" } satisfies Prisma.ArticleWhereInput

const articleSchema = z.object({
  title: z.string().trim().min(5, "Judul minimal 5 karakter.").max(255, "Judul maksimal 255 karakter."),
  excerpt: z.string().trim().max(300, "Ringkasan maksimal 300 karakter.").optional(),
  content: z.string().refine((html) => stripHtml(html).length >= 20, "Isi berita minimal 20 karakter."),
  keyTakeaways: z
    .array(z.string().trim().min(1).max(200, "Setiap poin maksimal 200 karakter."))
    .max(3, "Maksimal 3 poin inti."),
  categoryId: z.string().min(1, "Pilih kategori."),
  thumbnailDriveId: z
    .string()
    .regex(DRIVE_ID_PATTERN, "Unggah gambar thumbnail terlebih dahulu."),
  imageCaption: z.string().trim().max(200).optional(),
  sourceUrl: z
    .string()
    .trim()
    .max(500)
    .refine((v) => /^https?:\/\/\S+$/i.test(v), "Tautan sumber harus diawali http:// atau https://")
    .optional(),
  type: z.enum(["CITIZEN_REPORT", "OPINION"]),
  status: z.enum(["DRAFT", "PUBLISHED"]),
})

export type ArticleInput = z.input<typeof articleSchema>

function parseInput(input: ArticleInput) {
  const cleaned = {
    ...input,
    excerpt: input.excerpt?.trim() || undefined,
    imageCaption: input.imageCaption?.trim() || undefined,
    sourceUrl: input.sourceUrl?.trim() || undefined,
    keyTakeaways: input.keyTakeaways.map((t) => t.trim()).filter(Boolean),
  }
  const parsed = articleSchema.safeParse(cleaned)
  if (!parsed.success) throw new ServiceError(parsed.error.issues[0].message)
  return { ...parsed.data, content: sanitizeHtml(parsed.data.content) }
}

function canManage(user: Pick<User, "id" | "role">, authorId: string) {
  return user.id === authorId || user.role === "ADMIN"
}

async function uniqueSlug(title: string): Promise<string> {
  const base = slugify(title)
  if (isLocalMode) {
    const taken = localDb.getArticleBySlug(base)
    return taken ? withSuffix(base) : base
  }
  const taken = await prisma.article.findUnique({ where: { slug: base }, select: { id: true } })
  return taken ? withSuffix(base) : base
}

export type PublishedListInput = { categorySlug?: string; q?: string; page?: number }

export const articleService = {
  async getHome() {
    if (isLocalMode) {
      const all = localDb.getArticles().filter((a) => a.status === "PUBLISHED")
      let main = all.find((a) => a.headlinePosition === "MAIN_LEFT")
      let middle = all.find((a) => a.headlinePosition === "MIDDLE_CENTER")
      const right = all.filter((a) => a.headlinePosition === "RIGHT_LIST").slice(0, RIGHT_LIST_SIZE)

      const used = new Set([main, middle, ...right].filter(Boolean).map((a) => a!.id))
      const pool = all.filter((a) => !used.has(a.id))
      main ??= pool.shift()
      middle ??= pool.shift()
      while (right.length < RIGHT_LIST_SIZE && pool.length > 0) right.push(pool.shift()!)

      return {
        main: main ? toArticleCard(main) : undefined,
        middle: middle ? toArticleCard(middle) : undefined,
        right: right.map(toArticleCard),
        more: pool.map(toArticleCard),
      }
    }

    const [headlines, latest] = await Promise.all([
      prisma.article.findMany({
        where: { ...published, headlinePosition: { not: "NONE" } },
        select: cardSelect,
        orderBy: { publishedAt: "desc" },
      }),
      prisma.article.findMany({
        where: published,
        select: cardSelect,
        orderBy: { publishedAt: "desc" },
        take: 24,
      }),
    ])

    let main = headlines.find((a) => a.headlinePosition === "MAIN_LEFT")
    let middle = headlines.find((a) => a.headlinePosition === "MIDDLE_CENTER")
    const right = headlines.filter((a) => a.headlinePosition === "RIGHT_LIST").slice(0, RIGHT_LIST_SIZE)

    // Empty slots fall back to the newest articles so the grid is never broken.
    const used = new Set([main, middle, ...right].filter(Boolean).map((a) => a!.id))
    const pool = latest.filter((a) => !used.has(a.id))
    main ??= pool.shift()
    middle ??= pool.shift()
    while (right.length < RIGHT_LIST_SIZE && pool.length > 0) right.push(pool.shift()!)

    return { main, middle, right, more: pool }
  },

  async listPublished({ categorySlug, q, page = 1 }: PublishedListInput) {
    if (isLocalMode) {
      const term = q?.trim().toLowerCase()
      let filtered = localDb.getArticles().filter((a) => a.status === "PUBLISHED")
      if (categorySlug) {
        const cat = localDb.getCategoryBySlug(categorySlug)
        filtered = filtered.filter((a) => a.categoryId === cat?.id)
      }
      if (term) {
        filtered = filtered.filter(
          (a) =>
            a.title.toLowerCase().includes(term) ||
            (a.excerpt && a.excerpt.toLowerCase().includes(term)) ||
            a.content.toLowerCase().includes(term)
        )
      }
      const current = Math.max(1, Math.floor(page) || 1)
      const total = filtered.length
      const items = filtered.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE).map(toArticleCard)
      return { items, total, page: current, pageCount: Math.max(1, Math.ceil(total / PAGE_SIZE)) }
    }

    const term = q?.trim()
    const where: Prisma.ArticleWhereInput = {
      ...published,
      ...(categorySlug ? { category: { slug: categorySlug } } : {}),
      ...(term
        ? {
            OR: [
              { title: { contains: term, mode: "insensitive" } },
              { excerpt: { contains: term, mode: "insensitive" } },
              { content: { contains: term, mode: "insensitive" } },
            ],
          }
        : {}),
    }
    const current = Math.max(1, Math.floor(page) || 1)
    const [items, total] = await Promise.all([
      prisma.article.findMany({
        where,
        select: cardSelect,
        orderBy: { publishedAt: "desc" },
        skip: (current - 1) * PAGE_SIZE,
        take: PAGE_SIZE,
      }),
      prisma.article.count({ where }),
    ])
    return { items, total, page: current, pageCount: Math.max(1, Math.ceil(total / PAGE_SIZE)) }
  },

  async getBySlug(slug: string) {
    if (isLocalMode) {
      const a = localDb.getArticleBySlug(slug)
      if (!a) return null
      const author = localDb.getUserById(a.authorId)
      const category = localDb.getCategoryById(a.categoryId)
      return {
        ...a,
        author: {
          id: author?.id ?? a.authorId,
          username: author?.username ?? "anon",
          fullName: author?.fullName ?? "Anonim",
          avatarDriveId: author?.avatarDriveId ?? null,
          isVerified: author?.isVerified ?? false,
          bio: author?.bio ?? null,
        },
        category: {
          id: category?.id ?? a.categoryId,
          name: category?.name ?? "Umum",
          slug: category?.slug ?? "umum",
        },
        _count: {
          comments: localDb.getComments(a.id).length,
          reposts: localDb.getReposts(a.id).length,
          likes: localDb.getLikesCount(a.id),
        },
      }
    }

    return prisma.article.findUnique({
      where: { slug },
      include: {
        author: {
          select: { id: true, username: true, fullName: true, avatarDriveId: true, isVerified: true, bio: true },
        },
        category: { select: { id: true, name: true, slug: true } },
        _count: { select: { comments: true, reposts: true, likes: true } },
      },
    })
  },

  getById(id: string) {
    if (isLocalMode) {
      return Promise.resolve(localDb.getArticleById(id))
    }
    return prisma.article.findUnique({ where: { id } })
  },

  listByAuthor(authorId: string, includeDrafts: boolean) {
    if (isLocalMode) {
      const list = localDb
        .getArticles()
        .filter((a) => a.authorId === authorId && (includeDrafts ? a.status !== "ARCHIVED" : a.status === "PUBLISHED"))
      return Promise.resolve(list.map((a) => ({ ...toArticleCard(a), status: a.status, id: a.id })))
    }
    return prisma.article.findMany({
      where: { authorId, ...(includeDrafts ? { status: { not: "ARCHIVED" } } : published) },
      select: { ...cardSelect, status: true, id: true },
      orderBy: { createdAt: "desc" },
    })
  },

  listBookmarked(userId: string) {
    if (isLocalMode) {
      const bms = localDb.getUserBookmarks(userId)
      const items = bms
        .map((b) => {
          const a = localDb.getArticleById(b.articleId)
          if (!a || a.status !== "PUBLISHED") return null
          return { article: toArticleCard(a) }
        })
        .filter((x): x is { article: ArticleCard } => x !== null)
      return Promise.resolve(items)
    }
    return prisma.bookmark.findMany({
      where: { userId, article: published },
      orderBy: { createdAt: "desc" },
      select: { article: { select: cardSelect } },
    })
  },

  incrementViews(id: string) {
    if (isLocalMode) {
      const a = localDb.getArticleById(id)
      if (a) localDb.updateArticle(id, { viewCount: a.viewCount + 1 })
      return Promise.resolve()
    }
    return prisma.article.update({ where: { id }, data: { viewCount: { increment: 1 } } })
  },

  async create(user: User, input: ArticleInput) {
    const data = parseInput(input)
    if (isLocalMode) {
      const category = localDb.getCategoryById(data.categoryId)
      if (!category) throw new ServiceError("Kategori tidak ditemukan.")
      const slug = await uniqueSlug(data.title)
      const now = new Date()
      const newArticle = localDb.createArticle({
        ...data,
        id: `art-${Date.now()}`,
        slug,
        headlinePosition: "NONE",
        excerpt: data.excerpt ?? null,
        imageCaption: data.imageCaption ?? null,
        sourceUrl: data.sourceUrl ?? null,
        viewCount: 0,
        authorId: user.id,
        createdAt: now,
        updatedAt: now,
        publishedAt: data.status === "PUBLISHED" ? now : null,
      })
      return newArticle
    }

    const category = await prisma.category.findUnique({ where: { id: data.categoryId } })
    if (!category) throw new ServiceError("Kategori tidak ditemukan.")

    return prisma.article.create({
      data: {
        ...data,
        slug: await uniqueSlug(data.title),
        authorId: user.id,
        publishedAt: data.status === "PUBLISHED" ? new Date() : null,
      },
    })
  },

  async update(user: User, id: string, input: ArticleInput) {
    if (isLocalMode) {
      const existing = localDb.getArticleById(id)
      if (!existing) throw new ServiceError("Berita tidak ditemukan.")
      if (!canManage(user, existing.authorId)) throw new ServiceError("Anda tidak berhak mengubah berita ini.")
      const data = parseInput(input)
      const updated = localDb.updateArticle(id, {
        ...data,
        excerpt: data.excerpt ?? null,
        imageCaption: data.imageCaption ?? null,
        sourceUrl: data.sourceUrl ?? null,
        publishedAt:
          data.status === "PUBLISHED" ? (existing.publishedAt ?? new Date()) : existing.publishedAt,
        ...(data.status === "DRAFT" ? { headlinePosition: "NONE" } : {}),
      })
      if (!updated) throw new ServiceError("Gagal memperbarui berita.")
      return updated
    }

    const existing = await prisma.article.findUnique({ where: { id } })
    if (!existing) throw new ServiceError("Berita tidak ditemukan.")
    if (!canManage(user, existing.authorId)) throw new ServiceError("Anda tidak berhak mengubah berita ini.")

    const data = parseInput(input)
    const updated = await prisma.article.update({
      where: { id },
      data: {
        ...data,
        publishedAt:
          data.status === "PUBLISHED" ? (existing.publishedAt ?? new Date()) : existing.publishedAt,
        ...(data.status === "DRAFT" ? { headlinePosition: "NONE" } : {}),
      },
    })
    if (existing.thumbnailDriveId !== data.thumbnailDriveId) await deleteFile(existing.thumbnailDriveId)
    return updated
  },

  async remove(user: User, id: string) {
    if (isLocalMode) {
      const existing = localDb.getArticleById(id)
      if (!existing) throw new ServiceError("Berita tidak ditemukan.")
      if (!canManage(user, existing.authorId)) throw new ServiceError("Anda tidak berhak menghapus berita ini.")
      localDb.deleteArticle(id)
      return
    }

    const existing = await prisma.article.findUnique({ where: { id } })
    if (!existing) throw new ServiceError("Berita tidak ditemukan.")
    if (!canManage(user, existing.authorId)) throw new ServiceError("Anda tidak berhak menghapus berita ini.")

    await prisma.article.delete({ where: { id } })
    await deleteFile(existing.thumbnailDriveId)
  },

  async setHeadline(id: string, position: HeadlinePosition) {
    if (isLocalMode) {
      const article = localDb.getArticleById(id)
      if (!article) throw new ServiceError("Berita tidak ditemukan.")
      if (position !== "NONE" && article.status !== "PUBLISHED") {
        throw new ServiceError("Hanya berita terbit yang bisa menjadi headline.")
      }
      if (position === "MAIN_LEFT" || position === "MIDDLE_CENTER") {
        localDb.getArticles().forEach((a) => {
          if (a.headlinePosition === position && a.id !== id) {
            localDb.updateArticle(a.id, { headlinePosition: "NONE" })
          }
        })
      } else if (position === "RIGHT_LIST") {
        const current = localDb
          .getArticles()
          .filter((a) => a.headlinePosition === "RIGHT_LIST" && a.id !== id)
        const overflow = current.slice(0, Math.max(0, current.length - (RIGHT_LIST_SIZE - 1)))
        overflow.forEach((a) => localDb.updateArticle(a.id, { headlinePosition: "NONE" }))
      }
      localDb.updateArticle(id, { headlinePosition: position })
      return
    }

    const article = await prisma.article.findUnique({ where: { id } })
    if (!article) throw new ServiceError("Berita tidak ditemukan.")
    if (position !== "NONE" && article.status !== "PUBLISHED") {
      throw new ServiceError("Hanya berita terbit yang bisa menjadi headline.")
    }

    await prisma.$transaction(async (tx) => {
      if (position === "MAIN_LEFT" || position === "MIDDLE_CENTER") {
        await tx.article.updateMany({
          where: { headlinePosition: position, id: { not: id } },
          data: { headlinePosition: "NONE" },
        })
      } else if (position === "RIGHT_LIST") {
        const current = await tx.article.findMany({
          where: { headlinePosition: "RIGHT_LIST", id: { not: id } },
          orderBy: { updatedAt: "asc" },
          select: { id: true },
        })
        const overflow = current.slice(0, Math.max(0, current.length - (RIGHT_LIST_SIZE - 1)))
        if (overflow.length) {
          await tx.article.updateMany({
            where: { id: { in: overflow.map((a) => a.id) } },
            data: { headlinePosition: "NONE" },
          })
        }
      }
      await tx.article.update({ where: { id }, data: { headlinePosition: position } })
    })
  },

  listForHeadlineAdmin() {
    if (isLocalMode) {
      const list = localDb.getArticles().filter((a) => a.status === "PUBLISHED")
      return Promise.resolve(list.map((a) => ({ id: a.id, title: a.title, slug: a.slug, headlinePosition: a.headlinePosition })))
    }
    return prisma.article.findMany({
      where: published,
      select: { id: true, title: true, slug: true, headlinePosition: true },
      orderBy: { publishedAt: "desc" },
      take: 50,
    })
  },
}
