"use server"

import { revalidatePath } from "next/cache"

import { requireUser } from "@/lib/auth"
import { toActionError, type ActionState } from "@/lib/errors"
import { userService } from "@/services/user.service"

export async function updateProfileAction(_: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser()
  try {
    await userService.updateProfile(user, {
      fullName: String(formData.get("fullName") ?? ""),
      username: String(formData.get("username") ?? ""),
      bio: String(formData.get("bio") ?? ""),
      avatarDriveId: String(formData.get("avatarDriveId") ?? "") || undefined,
    })
  } catch (error) {
    return toActionError(error, "Tidak dapat memperbarui profil.")
  }
  revalidatePath("/", "layout")
  return { success: "Profil diperbarui." }
}
