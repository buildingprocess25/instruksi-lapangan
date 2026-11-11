"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { z } from "zod"

import { requireUser } from "@/lib/auth"
import { toActionError, type ActionState } from "@/lib/errors"
import { articleService, type ArticleInput } from "@/services/article.service"

const payloadSchema = z.object({
  title: z.string(),
  excerpt: z.string().optional(),
  content: z.string(),
  keyTakeaways: z.array(z.string()),
  categoryId: z.string(),
  thumbnailDriveId: z.string(),
  imageCaption: z.string().optional(),
  sourceUrl: z.string().optional(),
  type: z.enum(["CITIZEN_REPORT", "OPINION"]),
  status: z.enum(["DRAFT", "PUBLISHED"]),
})

function revalidateNews(slug?: string) {
  revalidatePath("/")
  revalidatePath("/kategori/[slug]", "page")
  if (slug) revalidatePath(`/berita/${slug}`)
}

export async function createArticleAction(payload: ArticleInput): Promise<ActionState> {
  const user = await requireUser()
  const parsed = payloadSchema.safeParse(payload)
  if (!parsed.success) return { error: "Data berita tidak valid." }

  let slug: string
  try {
    slug = (await articleService.create(user, parsed.data)).slug
  } catch (error) {
    return toActionError(error, "Tidak dapat menyimpan berita.")
  }
  revalidateNews()
  redirect(parsed.data.status === "PUBLISHED" ? `/berita/${slug}` : `/@${user.username}`)
}

export async function updateArticleAction(id: string, payload: ArticleInput): Promise<ActionState> {
  const user = await requireUser()
  const parsed = payloadSchema.safeParse(payload)
  if (!parsed.success) return { error: "Data berita tidak valid." }

  let slug: string
  try {
    slug = (await articleService.update(user, id, parsed.data)).slug
  } catch (error) {
    return toActionError(error, "Tidak dapat memperbarui berita.")
  }
  revalidateNews(slug)
  redirect(parsed.data.status === "PUBLISHED" ? `/berita/${slug}` : `/@${user.username}`)
}

export async function deleteArticleAction(id: string): Promise<ActionState> {
  const user = await requireUser()
  try {
    await articleService.remove(user, id)
  } catch (error) {
    return toActionError(error, "Tidak dapat menghapus berita.")
  }
  revalidateNews()
  redirect(`/@${user.username}`)
}
