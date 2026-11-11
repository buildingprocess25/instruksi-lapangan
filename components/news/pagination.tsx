import Link from "next/link"

import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export function Pagination({ page, pageCount, basePath, query = {} }: { page: number; pageCount: number; basePath: string; query?: Record<string, string | undefined> }) {
  if (pageCount <= 1) return null

  const href = (p: number) => {
    const params = new URLSearchParams()
    for (const [k, v] of Object.entries(query)) if (v) params.set(k, v)
    if (p > 1) params.set("page", String(p))
    const qs = params.toString()
    return qs ? `${basePath}?${qs}` : basePath
  }

  return (
    <nav aria-label="Halaman" className="mt-10 flex items-center justify-center gap-4 text-sm">
      {page > 1 && (
        <Link href={href(page - 1)} className={cn(buttonVariants({ variant: "outline", size: "sm" }))}>
          Sebelumnya
        </Link>
      )}
      <span className="text-slate-600 dark:text-slate-400">
        Halaman {page} dari {pageCount}
      </span>
      {page < pageCount && (
        <Link href={href(page + 1)} className={cn(buttonVariants({ variant: "outline", size: "sm" }))}>
          Berikutnya
        </Link>
      )}
    </nav>
  )
}
