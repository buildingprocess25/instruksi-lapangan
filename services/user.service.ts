import "server-only"

import type { User } from "@prisma/client"
import { z } from "zod"

import { isLocalMode } from "@/lib/env"
import { localDb } from "@/lib/local-db"
import { ServiceError } from "@/lib/errors"
import { DRIVE_ID_PATTERN } from "@/lib/media"
import { deleteFile } from "@/lib/google-drive"
import { prisma } from "@/lib/prisma"
import { cardSelect, type ArticleCard } from "@/services/article.service"

const profileSchema = z.object({
  fullName: z.string().trim().min(2, "Nama minimal 2 karakter.").max(60),
  username: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^[a-z0-9_]{3,20}$/, "Username 3-20 karakter: huruf kecil, angka, atau _."),
  bio: z.string().trim().max(300, "Bio maksimal 300 karakter.").optional(),
  avatarDriveId: z.string().regex(DRIVE_ID_PATTERN).optional(),
})

export type ProfileInput = z.input<typeof profileSchema>

function toLocalCard(articleId: string): ArticleCard | null {
  const a = localDb.getArticleById(articleId)
  if (!a) return null
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

export const userService = {
  getByUsername(username: string) {
    if (isLocalMode) {
      const u = localDb.getUserByUsername(username)
      if (!u) return Promise.resolve(null)
      const publishedCount = localDb.getArticles().filter((a) => a.authorId === u.id && a.status === "PUBLISHED").length
      return Promise.resolve({
        id: u.id,
        username: u.username,
        fullName: u.fullName,
        bio: u.bio,
        avatarDriveId: u.avatarDriveId,
        isVerified: u.isVerified,
        trustScore: u.trustScore,
        createdAt: u.createdAt,
        _count: {
          followers: localDb.getUserFollowersCount(u.id),
          following: localDb.getUserFollowingCount(u.id),
          articles: publishedCount,
        },
      })
    }

    return prisma.user.findUnique({
      where: { username: username.toLowerCase() },
      select: {
        id: true,
        username: true,
        fullName: true,
        bio: true,
        avatarDriveId: true,
        isVerified: true,
        trustScore: true,
        createdAt: true,
        _count: { select: { followers: true, following: true, articles: { where: { status: "PUBLISHED" } } } },
      },
    })
  },

  listReposts(userId: string) {
    if (isLocalMode) {
      const list = localDb.getUserReposts(userId)
      const result = list
        .map((r) => {
          const card = toLocalCard(r.articleId)
          if (!card) return null
          return { id: r.id, quoteText: r.quoteText, createdAt: r.createdAt, article: card }
        })
        .filter((x): x is NonNullable<typeof x> => x !== null)
      return Promise.resolve(result)
    }

    return prisma.repost.findMany({
      where: { userId, article: { status: "PUBLISHED" } },
      orderBy: { createdAt: "desc" },
      select: { id: true, quoteText: true, createdAt: true, article: { select: cardSelect } },
    })
  },

  listComments(userId: string) {
    if (isLocalMode) {
      const userComments = localDb
        .getUserComments(userId)
        .map((c) => {
          const art = localDb.getArticleById(c.articleId)
          if (!art || art.status !== "PUBLISHED") return null
          return {
            id: c.id,
            content: c.content,
            createdAt: c.createdAt,
            article: { title: art.title, slug: art.slug },
          }
        })
        .filter((x): x is NonNullable<typeof x> => x !== null)
      return Promise.resolve(userComments)
    }

    return prisma.comment.findMany({
      where: { userId, article: { status: "PUBLISHED" } },
      orderBy: { createdAt: "desc" },
      take: 50,
      select: {
        id: true,
        content: true,
        createdAt: true,
        article: { select: { title: true, slug: true } },
      },
    })
  },

  async getFollowingFeed(userId: string) {
    if (isLocalMode) {
      const following = localDb.getUserFollowing(userId)
      const ids = following.map((f) => f.followingId)
      if (ids.length === 0) return []

      const articles = localDb
        .getArticles()
        .filter((a) => ids.includes(a.authorId) && a.status === "PUBLISHED")
        .map((a) => toLocalCard(a.id))
        .filter((a): a is ArticleCard => a !== null)

      const reposts = localDb
        .getAllReposts()
        .filter((r) => ids.includes(r.userId))
        .map((r) => {
          const card = toLocalCard(r.articleId)
          const reposter = localDb.getUserById(r.userId)
          if (!card || !reposter) return null
          return {
            id: r.id,
            quoteText: r.quoteText,
            createdAt: r.createdAt,
            user: { username: reposter.username, fullName: reposter.fullName },
            article: card,
          }
        })
        .filter((x): x is NonNullable<typeof x> => x !== null)

      const items = [
        ...articles.map((article) => ({
          kind: "article" as const,
          id: `a-${article.id}`,
          at: article.publishedAt ?? new Date(0),
          article,
        })),
        ...reposts.map((repost) => ({
          kind: "repost" as const,
          id: `r-${repost.id}`,
          at: repost.createdAt,
          article: repost.article,
          reposter: repost.user,
          quoteText: repost.quoteText,
        })),
      ]
      return items.sort((a, b) => b.at.getTime() - a.at.getTime()).slice(0, 40)
    }

    const following = await prisma.follow.findMany({
      where: { followerId: userId },
      select: { followingId: true },
    })
    const ids = following.map((f) => f.followingId)
    if (ids.length === 0) return []

    const [articles, reposts] = await Promise.all([
      prisma.article.findMany({
        where: { authorId: { in: ids }, status: "PUBLISHED" },
        select: cardSelect,
        orderBy: { publishedAt: "desc" },
        take: 30,
      }),
      prisma.repost.findMany({
        where: { userId: { in: ids }, article: { status: "PUBLISHED" } },
        orderBy: { createdAt: "desc" },
        take: 30,
        select: {
          id: true,
          quoteText: true,
          createdAt: true,
          user: { select: { username: true, fullName: true } },
          article: { select: cardSelect },
        },
      }),
    ])

    const items = [
      ...articles.map((article) => ({
        kind: "article" as const,
        id: `a-${article.id}`,
        at: article.publishedAt ?? new Date(0),
        article,
      })),
      ...reposts.map((repost) => ({
        kind: "repost" as const,
        id: `r-${repost.id}`,
        at: repost.createdAt,
        article: repost.article,
        reposter: repost.user,
        quoteText: repost.quoteText,
      })),
    ]
    return items.sort((a, b) => b.at.getTime() - a.at.getTime()).slice(0, 40)
  },

  async updateProfile(user: User, input: ProfileInput) {
    const parsed = profileSchema.safeParse({ ...input, bio: input.bio?.trim() || undefined })
    if (!parsed.success) throw new ServiceError(parsed.error.issues[0].message)
    const data = parsed.data

    if (isLocalMode) {
      if (data.username !== user.username) {
        const taken = localDb.getUserByUsername(data.username)
        if (taken && taken.id !== user.id) throw new ServiceError("Username sudah dipakai.")
      }
      localDb.updateUser(user.id, {
        fullName: data.fullName,
        username: data.username,
        bio: data.bio ?? null,
        avatarDriveId: data.avatarDriveId ?? user.avatarDriveId,
      })
      return
    }

    if (data.username !== user.username) {
      const taken = await prisma.user.findUnique({ where: { username: data.username } })
      if (taken) throw new ServiceError("Username sudah dipakai.")
    }

    const avatarChanged = data.avatarDriveId && data.avatarDriveId !== user.avatarDriveId
    await prisma.user.update({
      where: { id: user.id },
      data: {
        fullName: data.fullName,
        username: data.username,
        bio: data.bio ?? null,
        ...(avatarChanged ? { avatarDriveId: data.avatarDriveId } : {}),
      },
    })
    if (avatarChanged) await deleteFile(user.avatarDriveId)
  },

  listUsers() {
    if (isLocalMode) {
      return Promise.resolve(
        localDb.getUsers().map((u) => ({
          id: u.id,
          username: u.username,
          fullName: u.fullName,
          email: u.email,
          role: u.role,
          isVerified: u.isVerified,
          trustScore: u.trustScore,
        }))
      )
    }

    return prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      take: 100,
      select: { id: true, username: true, fullName: true, email: true, role: true, isVerified: true, trustScore: true },
    })
  },

  async setRole(id: string, role: User["role"]) {
    if (isLocalMode) {
      localDb.updateUser(id, { role })
      return
    }
    await prisma.user.update({ where: { id }, data: { role } })
  },
}
