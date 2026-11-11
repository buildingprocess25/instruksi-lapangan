"use server"

import { revalidatePath } from "next/cache"

import { requireStaff, requireUser } from "@/lib/auth"
import { toActionError, type ActionState } from "@/lib/errors"
import { articleService } from "@/services/article.service"
import { categoryService } from "@/services/category.service"
import { userService } from "@/services/user.service"
import type { HeadlinePosition, Role } from "@prisma/client"

const POSITIONS: HeadlinePosition[] = ["NONE", "MAIN_LEFT", "MIDDLE_CENTER", "RIGHT_LIST"]
const ROLES: Role[] = ["USER", "MODERATOR", "ADMIN"]

export async function setHeadlineAction(articleId: string, position: string): Promise<ActionState> {
  await requireStaff()
  if (!POSITIONS.includes(position as HeadlinePosition)) return { error: "Posisi tidak valid." }
  try {
    await articleService.setHeadline(articleId, position as HeadlinePosition)
  } catch (error) {
    return toActionError(error, "Tidak dapat mengubah headline.")
  }
  revalidatePath("/")
  revalidatePath("/admin")
  return { success: "Headline diperbarui." }
}

export async function saveCategoryAction(_: ActionState, formData: FormData): Promise<ActionState> {
  await requireStaff()
  const id = String(formData.get("id") ?? "")
  const input = {
    name: String(formData.get("name") ?? ""),
    description: String(formData.get("description") ?? "") || undefined,
    orderIndex: String(formData.get("orderIndex") ?? "0"),
  }
  try {
    if (id) await categoryService.update(id, input)
    else await categoryService.create(input)
  } catch (error) {
    return toActionError(error, "Tidak dapat menyimpan kategori.")
  }
  revalidatePath("/", "layout")
  return { success: "Kategori disimpan." }
}

export async function deleteCategoryAction(id: string): Promise<ActionState> {
  await requireStaff()
  try {
    await categoryService.remove(id)
  } catch (error) {
    return toActionError(error, "Tidak dapat menghapus kategori.")
  }
  revalidatePath("/", "layout")
  return { success: "Kategori dihapus." }
}

export async function setRoleAction(userId: string, role: string): Promise<ActionState> {
  const admin = await requireUser()
  if (admin.role !== "ADMIN") return { error: "Hanya admin yang dapat mengubah peran." }
  if (!ROLES.includes(role as Role)) return { error: "Peran tidak valid." }
  if (admin.id === userId) return { error: "Anda tidak dapat mengubah peran sendiri." }
  try {
    await userService.setRole(userId, role as Role)
  } catch (error) {
    return toActionError(error, "Tidak dapat mengubah peran.")
  }
  revalidatePath("/admin")
  return { success: "Peran diperbarui." }
}

