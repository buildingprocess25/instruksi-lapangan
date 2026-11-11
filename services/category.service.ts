import "server-only"

import { isLocalMode } from "@/lib/env"
import { localDb } from "@/lib/local-db"
import { prisma } from "@/lib/prisma"
import { ServiceError } from "@/lib/errors"
import { slugify } from "@/lib/slug"
import { z } from "zod"

const categorySchema = z.object({
  name: z.string().trim().min(2, "Nama kategori minimal 2 karakter.").max(40),
  description: z.string().trim().max(200).optional(),
  orderIndex: z.coerce.number().int().min(0).max(999).default(0),
})

export type CategoryInput = z.input<typeof categorySchema>

function parse(input: CategoryInput) {
  const parsed = categorySchema.safeParse(input)
  if (!parsed.success) throw new ServiceError(parsed.error.issues[0].message)
  return parsed.data
}

export const categoryService = {
  list() {
    if (isLocalMode) {
      return Promise.resolve(localDb.getCategories())
    }
    return prisma.category.findMany({ orderBy: [{ orderIndex: "asc" }, { name: "asc" }] })
  },

  getBySlug(slug: string) {
    if (isLocalMode) {
      return Promise.resolve(localDb.getCategoryBySlug(slug))
    }
    return prisma.category.findUnique({ where: { slug } })
  },

  async create(input: CategoryInput) {
    const data = parse(input)
    const slug = slugify(data.name)
    if (isLocalMode) {
      const exists = localDb.getCategoryBySlug(slug) || localDb.getCategories().find((c) => c.name.toLowerCase() === data.name.toLowerCase())
      if (exists) throw new ServiceError("Kategori sudah ada.")
      const cat = localDb.createCategory({
        id: `cat-${slug}`,
        name: data.name,
        slug,
        description: data.description ?? null,
        orderIndex: data.orderIndex,
        createdAt: new Date(),
      })
      return cat
    }
    const exists = await prisma.category.findFirst({
      where: { OR: [{ slug }, { name: data.name }] },
    })
    if (exists) throw new ServiceError("Kategori sudah ada.")
    return prisma.category.create({ data: { ...data, slug } })
  },

  async update(id: string, input: CategoryInput) {
    const data = parse(input)
    if (isLocalMode) {
      const clash = localDb.getCategories().find((c) => c.id !== id && c.name.toLowerCase() === data.name.toLowerCase())
      if (clash) throw new ServiceError("Nama kategori sudah dipakai.")
      const updated = localDb.updateCategory(id, {
        name: data.name,
        description: data.description ?? null,
        orderIndex: data.orderIndex,
      })
      if (!updated) throw new ServiceError("Kategori tidak ditemukan.")
      return updated
    }
    const clash = await prisma.category.findFirst({
      where: { id: { not: id }, name: data.name },
    })
    if (clash) throw new ServiceError("Nama kategori sudah dipakai.")
    return prisma.category.update({ where: { id }, data })
  },

  async remove(id: string) {
    if (isLocalMode) {
      const used = localDb.getArticles().filter((a) => a.categoryId === id).length
      if (used > 0) throw new ServiceError("Kategori masih dipakai oleh berita.")
      localDb.deleteCategory(id)
      return
    }
    const used = await prisma.article.count({ where: { categoryId: id } })
    if (used > 0) throw new ServiceError("Kategori masih dipakai oleh berita.")
    await prisma.category.delete({ where: { id } })
  },
}
