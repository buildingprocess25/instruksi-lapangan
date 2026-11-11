import { Suspense } from "react"

import { ArticleGrid } from "@/components/news/article-card"
import { HeroBentoGrid } from "@/components/news/hero-bento-grid"
import { HomeSkeleton } from "@/components/news/home-skeleton"
import { articleService } from "@/services/article.service"

export const dynamic = "force-dynamic"

async function Home() {
  const { main, middle, right, more } = await articleService.getHome()
  const empty = !main && !middle && right.length === 0

  return (
    <div className="flex flex-col gap-10">
      <HeroBentoGrid main={main} middle={middle} right={right} />
      <section aria-labelledby="terbaru">
        <h2 id="terbaru" className="font-heading mb-6 text-2xl font-extrabold tracking-tight lg:text-3xl">
          Berita Terbaru
        </h2>
        <ArticleGrid
          articles={more}
          empty={empty ? "Belum ada berita. Jadilah yang pertama menulis!" : "Tidak ada berita lainnya."}
        />
      </section>
    </div>
  )
}

export default function Page() {
  return (
    <Suspense fallback={<HomeSkeleton />}>
      <Home />
    </Suspense>
  )
}
