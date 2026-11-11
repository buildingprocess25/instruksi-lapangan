import "server-only"

import type { Role, User } from "@prisma/client"
import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { cache } from "react"

import { isLocalMode } from "@/lib/env"
import { localDb } from "@/lib/local-db"
import { prisma } from "@/lib/prisma"
import { toUsername, withSuffix } from "@/lib/slug"
import { createClient } from "@/lib/supabase/server"

async function uniqueUsername(base: string): Promise<string> {
  const candidate = toUsername(base)
  const taken = await prisma.user.findUnique({ where: { username: candidate } })
  return taken ? withSuffix(candidate).replace("-", "").slice(0, 26) : candidate
}

// Maps the Supabase Auth session to the Prisma User row (created on first sight).
export const getCurrentUser = cache(async (): Promise<User | null> => {
  if (isLocalMode) {
    const cookieStore = await cookies()
    const localId = cookieStore.get("local_user_id")?.value
    if (localId === "guest") return null
    if (localId) {
      const found = localDb.getUserById(localId)
      if (found) return found
    }
    return localDb.getUserById("user-admin-1")
  }

  const supabase = await createClient()
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser()
  if (!authUser?.email) return null

  const existing = await prisma.user.findUnique({ where: { id: authUser.id } })
  if (existing) return existing

  const meta = authUser.user_metadata as { full_name?: string; name?: string }
  const fullName = meta.full_name ?? meta.name ?? authUser.email.split("@")[0]

  try {
    return await prisma.user.create({
      data: {
        id: authUser.id,
        email: authUser.email,
        fullName,
        username: await uniqueUsername(authUser.email.split("@")[0]),
      },
    })
  } catch {
    // Concurrent first requests: another one created the row already.
    return prisma.user.findUnique({ where: { id: authUser.id } })
  }
})

export async function requireUser(): Promise<User> {
  const user = await getCurrentUser()
  if (!user) redirect("/masuk")
  return user
}

export function hasRole(user: Pick<User, "role">, ...roles: Role[]): boolean {
  return roles.includes(user.role)
}

export async function requireStaff(): Promise<User> {
  const user = await requireUser()
  if (!hasRole(user, "ADMIN", "MODERATOR")) redirect("/")
  return user
}
