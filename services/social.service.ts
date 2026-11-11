import "server-only"

import type { User } from "@prisma/client"
import { z } from "zod"

import { isLocalMode } from "@/lib/env"
import { localDb } from "@/lib/local-db"
import { ServiceError } from "@/lib/errors"
import { prisma } from "@/lib/prisma"

const VERIFIED_THRESHOLD = 50
const POINTS = { like: 1, repost: 3 }

const commentSchema = z.object({
  content: z.string().trim().min(1, "Komentar tidak boleh kosong.").max(2000, "Komentar maksimal 2000 karakter."),
})

const quoteSchema = z
  .string()
  .trim()
  .max(500, "Kutipan maksimal 500 karakter.")

async function adjustTrust(authorId: string, delta: number) {
  if (isLocalMode) {
    const author = localDb.getUserById(authorId)
    if (!author) return
    const score = Math.max(0, author.trustScore + delta)
    localDb.updateUser(authorId, {
      trustScore: score,
      isVerified: score >= VERIFIED_THRESHOLD,
    })
    return
  }

  const author = await prisma.user.update({
    where: { id: authorId },
    data: { trustScore: { increment: delta } },
    select: { trustScore: true, isVerified: true },
  })
  const score = Math.max(0, author.trustScore)
  if (score !== author.trustScore || (score >= VERIFIED_THRESHOLD) !== author.isVerified) {
    await prisma.user.update({
      where: { id: authorId },
      data: { trustScore: score, isVerified: score >= VERIFIED_THRESHOLD },
    })
  }
}

async function publishedArticle(articleId: string) {
  if (isLocalMode) {
    const a = localDb.getArticleById(articleId)
    if (!a || a.status !== "PUBLISHED") throw new ServiceError("Berita tidak ditemukan.")
    return a
  }
  const article = await prisma.article.findUnique({
    where: { id: articleId },
    select: { id: true, authorId: true, status: true },
  })
  if (!article || article.status !== "PUBLISHED") throw new ServiceError("Berita tidak ditemukan.")
  return article
}

export type CommentNode = {
  id: string
  content: string
  isEdited: boolean
  createdAt: Date
  parentId: string | null
  user: { id: string; username: string; fullName: string; avatarDriveId: string | null; isVerified: boolean }
  replies: CommentNode[]
}

function buildTree(flat: Omit<CommentNode, "replies">[]): CommentNode[] {
  const nodes = new Map<string, CommentNode>(flat.map((c) => [c.id, { ...c, replies: [] }]))
  const roots: CommentNode[] = []
  for (const node of nodes.values()) {
    const parent = node.parentId ? nodes.get(node.parentId) : undefined
    if (parent) parent.replies.push(node)
    else roots.push(node)
  }
  return roots
}

export const socialService = {
  async toggleLike(user: User, articleId: string) {
    const article = await publishedArticle(articleId)
    if (isLocalMode) {
      const existing = localDb.getLike(user.id, articleId)
      if (existing) {
        localDb.deleteLike(user.id, articleId)
        if (article.authorId !== user.id) await adjustTrust(article.authorId, -POINTS.like)
        return false
      }
      localDb.createLike({ id: `like-${Date.now()}`, userId: user.id, articleId, createdAt: new Date() })
      if (article.authorId !== user.id) await adjustTrust(article.authorId, POINTS.like)
      return true
    }

    const key = { userId_articleId: { userId: user.id, articleId } }
    const existing = await prisma.like.findUnique({ where: key })
    if (existing) {
      await prisma.like.delete({ where: key })
      if (article.authorId !== user.id) await adjustTrust(article.authorId, -POINTS.like)
      return false
    }
    await prisma.like.create({ data: { userId: user.id, articleId } })
    if (article.authorId !== user.id) await adjustTrust(article.authorId, POINTS.like)
    return true
  },

  async toggleBookmark(user: User, articleId: string) {
    await publishedArticle(articleId)
    if (isLocalMode) {
      const existing = localDb.getBookmark(user.id, articleId)
      if (existing) {
        localDb.deleteBookmark(user.id, articleId)
        return false
      }
      localDb.createBookmark({ id: `bm-${Date.now()}`, userId: user.id, articleId, createdAt: new Date() })
      return true
    }

    const key = { userId_articleId: { userId: user.id, articleId } }
    const existing = await prisma.bookmark.findUnique({ where: key })
    if (existing) {
      await prisma.bookmark.delete({ where: key })
      return false
    }
    await prisma.bookmark.create({ data: { userId: user.id, articleId } })
    return true
  },

  async repost(user: User, articleId: string, quoteText?: string) {
    const article = await publishedArticle(articleId)
    if (article.authorId === user.id) throw new ServiceError("Anda tidak dapat me-repost berita sendiri.")

    const parsedQuote = quoteSchema.safeParse(quoteText ?? "")
    if (!parsedQuote.success) throw new ServiceError(parsedQuote.error.issues[0].message)
    const quote = parsedQuote.data || null

    if (isLocalMode) {
      const existing = localDb.getRepost(user.id, articleId)
      if (existing) {
        localDb.updateRepostQuote(user.id, articleId, quote)
        return
      }
      localDb.createRepost({ id: `rep-${Date.now()}`, userId: user.id, articleId, quoteText: quote, createdAt: new Date() })
      await adjustTrust(article.authorId, POINTS.repost)
      return
    }

    const key = { userId_articleId: { userId: user.id, articleId } }
    const existing = await prisma.repost.findUnique({ where: key })
    if (existing) {
      await prisma.repost.update({ where: key, data: { quoteText: quote } })
      return
    }
    await prisma.repost.create({ data: { userId: user.id, articleId, quoteText: quote } })
    await adjustTrust(article.authorId, POINTS.repost)
  },

  async undoRepost(user: User, articleId: string) {
    if (isLocalMode) {
      const existing = localDb.getRepost(user.id, articleId)
      if (!existing) return
      const article = localDb.getArticleById(articleId)
      localDb.deleteRepost(user.id, articleId)
      if (article) await adjustTrust(article.authorId, -POINTS.repost)
      return
    }

    const key = { userId_articleId: { userId: user.id, articleId } }
    const existing = await prisma.repost.findUnique({ where: key, select: { article: { select: { authorId: true } } } })
    if (!existing) return
    await prisma.repost.delete({ where: key })
    await adjustTrust(existing.article.authorId, -POINTS.repost)
  },

  async addComment(user: User, articleId: string, content: string, parentId?: string) {
    await publishedArticle(articleId)
    const parsed = commentSchema.safeParse({ content })
    if (!parsed.success) throw new ServiceError(parsed.error.issues[0].message)

    if (isLocalMode) {
      if (parentId) {
        const parent = localDb.getCommentById(parentId)
        if (!parent || parent.articleId !== articleId) throw new ServiceError("Komentar yang dibalas tidak ditemukan.")
      }
      const now = new Date()
      localDb.createComment({
        id: `comm-${Date.now()}`,
        content: parsed.data.content,
        userId: user.id,
        articleId,
        parentId: parentId || null,
        isEdited: false,
        createdAt: now,
        updatedAt: now,
      })
      return
    }

    if (parentId) {
      const parent = await prisma.comment.findUnique({ where: { id: parentId }, select: { articleId: true } })
      if (!parent || parent.articleId !== articleId) throw new ServiceError("Komentar yang dibalas tidak ditemukan.")
    }
    await prisma.comment.create({
      data: { content: parsed.data.content, userId: user.id, articleId, parentId: parentId || null },
    })
  },

  async editComment(user: User, commentId: string, content: string) {
    const parsed = commentSchema.safeParse({ content })
    if (!parsed.success) throw new ServiceError(parsed.error.issues[0].message)

    if (isLocalMode) {
      const existing = localDb.getCommentById(commentId)
      if (!existing) throw new ServiceError("Komentar tidak ditemukan.")
      if (existing.userId !== user.id) throw new ServiceError("Anda tidak berhak mengubah komentar ini.")
      localDb.updateComment(commentId, parsed.data.content)
      return
    }

    const existing = await prisma.comment.findUnique({ where: { id: commentId } })
    if (!existing) throw new ServiceError("Komentar tidak ditemukan.")
    if (existing.userId !== user.id) throw new ServiceError("Anda tidak berhak mengubah komentar ini.")
    await prisma.comment.update({
      where: { id: commentId },
      data: { content: parsed.data.content, isEdited: true },
    })
  },

  async deleteComment(user: User, commentId: string) {
    if (isLocalMode) {
      const existing = localDb.getCommentById(commentId)
      if (!existing) throw new ServiceError("Komentar tidak ditemukan.")
      const isStaff = user.role === "ADMIN" || user.role === "MODERATOR"
      if (existing.userId !== user.id && !isStaff) throw new ServiceError("Anda tidak berhak menghapus komentar ini.")
      localDb.deleteComment(commentId)
      return
    }

    const existing = await prisma.comment.findUnique({ where: { id: commentId } })
    if (!existing) throw new ServiceError("Komentar tidak ditemukan.")
    const isStaff = user.role === "ADMIN" || user.role === "MODERATOR"
    if (existing.userId !== user.id && !isStaff) throw new ServiceError("Anda tidak berhak menghapus komentar ini.")
    await prisma.comment.delete({ where: { id: commentId } })
  },

  async toggleFollow(user: User, targetId: string) {
    if (user.id === targetId) throw new ServiceError("Anda tidak dapat mengikuti diri sendiri.")

    if (isLocalMode) {
      const target = localDb.getUserById(targetId)
      if (!target) throw new ServiceError("Pengguna tidak ditemukan.")
      const existing = localDb.getFollow(user.id, targetId)
      if (existing) {
        localDb.deleteFollow(user.id, targetId)
        return false
      }
      localDb.createFollow({ followerId: user.id, followingId: targetId, createdAt: new Date() })
      return true
    }

    const target = await prisma.user.findUnique({ where: { id: targetId }, select: { id: true } })
    if (!target) throw new ServiceError("Pengguna tidak ditemukan.")
    const key = { followerId_followingId: { followerId: user.id, followingId: targetId } }
    const existing = await prisma.follow.findUnique({ where: key })
    if (existing) {
      await prisma.follow.delete({ where: key })
      return false
    }
    await prisma.follow.create({ data: { followerId: user.id, followingId: targetId } })
    return true
  },

  async getComments(articleId: string): Promise<CommentNode[]> {
    if (isLocalMode) {
      const flat = localDb.getComments(articleId).map((c) => {
        const u = localDb.getUserById(c.userId)
        return {
          id: c.id,
          content: c.content,
          isEdited: c.isEdited,
          createdAt: c.createdAt,
          parentId: c.parentId,
          user: {
            id: u?.id ?? c.userId,
            username: u?.username ?? "anon",
            fullName: u?.fullName ?? "Anonim",
            avatarDriveId: u?.avatarDriveId ?? null,
            isVerified: u?.isVerified ?? false,
          },
        }
      })
      return buildTree(flat)
    }

    const flat = await prisma.comment.findMany({
      where: { articleId },
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        content: true,
        isEdited: true,
        createdAt: true,
        parentId: true,
        user: { select: { id: true, username: true, fullName: true, avatarDriveId: true, isVerified: true } },
      },
    })
    return buildTree(flat)
  },

  getReposts(articleId: string) {
    if (isLocalMode) {
      const list = localDb.getReposts(articleId).map((r) => {
        const u = localDb.getUserById(r.userId)
        return {
          id: r.id,
          quoteText: r.quoteText,
          createdAt: r.createdAt,
          user: {
            username: u?.username ?? "anon",
            fullName: u?.fullName ?? "Anonim",
            avatarDriveId: u?.avatarDriveId ?? null,
            isVerified: u?.isVerified ?? false,
          },
        }
      })
      return Promise.resolve(list)
    }

    return prisma.repost.findMany({
      where: { articleId },
      orderBy: { createdAt: "desc" },
      take: 50,
      select: {
        id: true,
        quoteText: true,
        createdAt: true,
        user: { select: { username: true, fullName: true, avatarDriveId: true, isVerified: true } },
      },
    })
  },

  async getViewerState(userId: string, articleId: string) {
    if (isLocalMode) {
      const like = localDb.getLike(userId, articleId)
      const bookmark = localDb.getBookmark(userId, articleId)
      const repost = localDb.getRepost(userId, articleId)
      return { liked: !!like, bookmarked: !!bookmark, reposted: !!repost, quoteText: repost?.quoteText ?? null }
    }

    const key = { userId_articleId: { userId, articleId } }
    const [like, bookmark, repost] = await Promise.all([
      prisma.like.findUnique({ where: key, select: { id: true } }),
      prisma.bookmark.findUnique({ where: key, select: { id: true } }),
      prisma.repost.findUnique({ where: key, select: { quoteText: true } }),
    ])
    return { liked: !!like, bookmarked: !!bookmark, reposted: !!repost, quoteText: repost?.quoteText ?? null }
  },

  async isFollowing(userId: string, targetId: string) {
    if (isLocalMode) {
      return Promise.resolve(!!localDb.getFollow(userId, targetId))
    }

    const row = await prisma.follow.findUnique({
      where: { followerId_followingId: { followerId: userId, followingId: targetId } },
      select: { followerId: true },
    })
    return !!row
  },
}
