"use server"

import { cookies, headers } from "next/headers"
import { redirect } from "next/navigation"
import { z } from "zod"

import { getCurrentUser } from "@/lib/auth"
import { isLocalMode } from "@/lib/env"
import type { ActionState } from "@/lib/errors"
import { localDb } from "@/lib/local-db"
import { toUsername } from "@/lib/slug"
import { createClient } from "@/lib/supabase/server"

const credentials = z.object({
  email: z.string().trim().email("Email tidak valid."),
  password: z.string().min(8, "Kata sandi minimal 8 karakter."),
})

const registration = credentials.extend({
  fullName: z.string().trim().min(2, "Nama minimal 2 karakter.").max(60),
})

function safeNext(value: FormDataEntryValue | null): string {
  const next = typeof value === "string" ? value : "/"
  return next.startsWith("/") && !next.startsWith("//") ? next : "/"
}

async function origin(): Promise<string> {
  const h = await headers()
  const host = h.get("x-forwarded-host") ?? h.get("host")
  const proto = h.get("x-forwarded-proto") ?? (host?.startsWith("localhost") ? "http" : "https")
  return `${proto}://${host}`
}

export async function signInAction(_: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = credentials.safeParse(Object.fromEntries(formData))
  if (!parsed.success) return { error: parsed.error.issues[0].message }

  if (isLocalMode) {
    const user = localDb.getUserByEmail(parsed.data.email) ?? localDb.getUserById("user-admin-1")
    if (user) {
      const c = await cookies()
      c.set("local_user_id", user.id, { path: "/" })
      redirect(safeNext(formData.get("next")))
    }
    return { error: "Email atau kata sandi salah." }
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithPassword(parsed.data)
  if (error) return { error: "Email atau kata sandi salah." }

  await getCurrentUser()
  redirect(safeNext(formData.get("next")))
}

export async function signUpAction(_: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = registration.safeParse(Object.fromEntries(formData))
  if (!parsed.success) return { error: parsed.error.issues[0].message }

  if (isLocalMode) {
    const now = new Date()
    const newUser = localDb.createUser({
      id: `user-${Date.now()}`,
      email: parsed.data.email,
      fullName: parsed.data.fullName,
      username: toUsername(parsed.data.email.split("@")[0]),
      bio: null,
      avatarDriveId: null,
      role: "USER",
      isVerified: false,
      trustScore: 0,
      createdAt: now,
      updatedAt: now,
    })
    const c = await cookies()
    c.set("local_user_id", newUser.id, { path: "/" })
    redirect("/")
  }

  const supabase = await createClient()
  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      data: { full_name: parsed.data.fullName },
      emailRedirectTo: `${await origin()}/auth/callback`,
    },
  })
  if (error) return { error: "Tidak dapat mendaftar. Periksa data Anda atau coba lagi." }

  if (!data.session) return { success: "Pendaftaran berhasil. Periksa email Anda untuk konfirmasi." }

  await getCurrentUser()
  redirect("/")
}

export async function signInWithGoogleAction(formData: FormData) {
  if (isLocalMode) {
    const user = localDb.getUserById("user-admin-1")
    if (user) {
      const c = await cookies()
      c.set("local_user_id", user.id, { path: "/" })
    }
    redirect(safeNext(formData.get("next")))
  }

  const supabase = await createClient()
  const next = safeNext(formData.get("next"))
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: `${await origin()}/auth/callback?next=${encodeURIComponent(next)}` },
  })
  if (error || !data.url) redirect("/masuk?error=oauth")
  redirect(data.url)
}

export async function signOutAction() {
  if (isLocalMode) {
    const c = await cookies()
    c.set("local_user_id", "guest", { path: "/" })
    redirect("/")
  }

  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect("/")
}
