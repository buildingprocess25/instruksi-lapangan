"use client"

import { Button } from "@/components/ui/button"

export default function Error({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="flex flex-col items-center gap-4 py-24 text-center">
      <h1 className="font-heading text-2xl font-extrabold">Terjadi kesalahan</h1>
      <p className="text-slate-600 dark:text-slate-400">Tidak dapat memuat halaman ini. Coba lagi.</p>
      <Button onClick={reset}>Coba lagi</Button>
    </div>
  )
}
