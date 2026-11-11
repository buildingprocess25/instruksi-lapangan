import { NextResponse, type NextRequest } from "next/server"

import { getCurrentUser } from "@/lib/auth"
import { createClient } from "@/lib/supabase/server"

export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl
  const code = searchParams.get("code")
  const rawNext = searchParams.get("next") ?? "/"
  const next = rawNext.startsWith("/") && !rawNext.startsWith("//") ? rawNext : "/"

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      await getCurrentUser()
      return NextResponse.redirect(`${origin}${next}`)
    }
  }
  return NextResponse.redirect(`${origin}/masuk?error=callback`)
}
