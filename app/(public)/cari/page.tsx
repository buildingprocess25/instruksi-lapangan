import type { Metadata } from "next"

import { ArticleGrid } from "@/components/news/article-card"
import { Pagination } from "@/components/news/pagination"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { articleService } from "@/services/article.service"

export const metadata: Metadata = { title: "Cari Berita" }
export const dynamic = "force-dynamic"

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>
}) {
  const { q, page } = await searchParams
  const term = q?.trim() ?? ""
  const result = term ? await articleService.listPublished({ q: term, page: Number(page) }) : null

  return (
    <div>
      <h1 className="font-heading mb-4 text-3xl font-extrabold tracking-tight">Cari Berita</h1>
      <form action="/cari" className="mb-8 flex max-w-xl gap-2">
        <Input name="q" defaultValue={term} placeholder="Cari judul atau isi berita..." aria-label="Kata kunci" />
        <Button type="submit">Cari</Button>
      </form>
      {result ? (
        <>
          <p className="mb-6 text-sm text-slate-600 dark:text-slate-400">{result.total} hasil untuk &quot;{term}&quot;</p>
          <ArticleGrid articles={result.items} empty="Tidak ada berita yang cocok." />
          <Pagination page={result.page} pageCount={result.pageCount} basePath="/cari" query={{ q: term }} />
        </>
      ) : (
        <p className="text-sm text-slate-600 dark:text-slate-400">Masukkan kata kunci untuk mencari berita.</p>
      )}
    </div>
  )
}
