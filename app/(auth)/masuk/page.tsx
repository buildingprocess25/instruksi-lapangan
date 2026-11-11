import type { Metadata } from "next"
import { redirect } from "next/navigation"

import { AuthForm } from "@/components/auth/auth-form"
import { getCurrentUser } from "@/lib/auth"

export const metadata: Metadata = { title: "Masuk" }

export default async function SignInPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next = "/" } = await searchParams
  if (await getCurrentUser()) redirect("/")
  return <AuthForm mode="masuk" next={next} />
}
