import type { Metadata } from "next"

import { ArticleGrid } from "@/components/news/article-card"
import { requireUser } from "@/lib/auth"
import { articleService } from "@/services/article.service"

export const metadata: Metadata = { title: "Bookmark" }
export const dynamic = "force-dynamic"

export default async function BookmarkPage() {
  const user = await requireUser()
  const bookmarks = await articleService.listBookmarked(user.id)
  return (
    <div>
      <h1 className="font-heading mb-6 text-3xl font-extrabold tracking-tight">Berita Tersimpan</h1>
      <ArticleGrid articles={bookmarks.map((b) => b.article)} empty="Belum ada berita tersimpan." />
    </div>
  )
}
