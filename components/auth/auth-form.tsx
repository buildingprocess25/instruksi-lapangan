"use client"

import Link from "next/link"
import { useActionState } from "react"

import { signInAction, signInWithGoogleAction, signUpAction } from "@/actions/auth.actions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export function AuthForm({ mode, next }: { mode: "masuk" | "daftar"; next: string }) {
  const [state, formAction, pending] = useActionState(mode === "masuk" ? signInAction : signUpAction, undefined)
  const isLogin = mode === "masuk"

  return (
    <div className="mx-auto flex w-full max-w-sm flex-col gap-6 py-8">
      <h1 className="font-heading text-2xl font-extrabold">{isLogin ? "Masuk" : "Buat akun"}</h1>

      <form action={formAction} className="flex flex-col gap-4">
        <input type="hidden" name="next" value={next} />
        {!isLogin && (
          <div className="flex flex-col gap-2">
            <Label htmlFor="fullName">Nama lengkap</Label>
            <Input id="fullName" name="fullName" required minLength={2} autoComplete="name" />
          </div>
        )}
        <div className="flex flex-col gap-2">
          <Label htmlFor="email">Email</Label>
          <Input id="email" name="email" type="email" required autoComplete="email" />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="password">Kata sandi</Label>
          <Input id="password" name="password" type="password" required minLength={8} autoComplete={isLogin ? "current-password" : "new-password"} />
        </div>
        {state?.error && <p role="alert" className="text-sm text-destructive">{state.error}</p>}
        {state?.success && <p role="status" className="text-sm text-emerald-600">{state.success}</p>}
        <Button type="submit" disabled={pending}>
          {isLogin ? "Masuk" : "Daftar"}
        </Button>
      </form>

      <form action={signInWithGoogleAction}>
        <input type="hidden" name="next" value={next} />
        <Button type="submit" variant="outline" className="w-full">
          Lanjutkan dengan Google
        </Button>
      </form>

      <p className="text-center text-sm text-slate-600 dark:text-slate-400">
        {isLogin ? "Belum punya akun? " : "Sudah punya akun? "}
        <Link href={isLogin ? "/daftar" : "/masuk"} className="font-medium text-blue-600 hover:underline">
          {isLogin ? "Daftar" : "Masuk"}
        </Link>
      </p>
    </div>
  )
}
