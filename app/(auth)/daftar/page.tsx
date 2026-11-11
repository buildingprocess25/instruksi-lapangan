import type { Metadata } from "next"
import { redirect } from "next/navigation"

import { AuthForm } from "@/components/auth/auth-form"
import { getCurrentUser } from "@/lib/auth"

export const metadata: Metadata = { title: "Daftar" }

export default async function SignUpPage() {
  if (await getCurrentUser()) redirect("/")
  return <AuthForm mode="daftar" next="/" />
}
