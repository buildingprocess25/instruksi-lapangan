import Link from "next/link"

import { ArticleMeta } from "@/components/news/article-card"
import { DriveImage } from "@/components/news/drive-image"
import type { ArticleCard } from "@/services/article.service"

type Props = {
  main?: ArticleCard
  middle?: ArticleCard
  right: ArticleCard[]
}

export function HeroBentoGrid({ main, middle, right }: Props) {
  if (!main && !middle && right.length === 0) return null

  return (
    <section aria-label="Headline" className="rounded-3xl bg-slate-100 p-6 lg:p-8 dark:bg-muted">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {main && (
          <article className="lg:col-span-5">
            <Link href={`/berita/${main.slug}`} className="block overflow-hidden rounded-2xl">
              <DriveImage driveId={main.thumbnailDriveId} alt={main.title} priority className="aspect-[4/3] w-full rounded-2xl" />
            </Link>
            <h2 className="font-heading mt-4 text-2xl leading-tight font-bold lg:text-3xl">
              <Link href={`/berita/${main.slug}`} className="hover:underline">
                {main.title}
              </Link>
            </h2>
            <div className="mt-3">
              <ArticleMeta article={main} />
            </div>
          </article>
        )}

        {middle && (
          <article className="lg:col-span-4">
            <Link href={`/berita/${middle.slug}`} className="block overflow-hidden rounded-2xl">
              <DriveImage driveId={middle.thumbnailDriveId} alt={middle.title} priority className="aspect-[16/10] w-full rounded-2xl" />
            </Link>
            <h2 className="font-heading mt-4 text-xl font-bold">
              <Link href={`/berita/${middle.slug}`} className="hover:underline">
                {middle.title}
              </Link>
            </h2>
            {middle.excerpt && <p className="mt-2 line-clamp-4 text-sm text-slate-600 dark:text-slate-400">{middle.excerpt}</p>}
          </article>
        )}

        {right.length > 0 && (
          <div className="flex flex-col justify-between gap-4 lg:col-span-3">
            {right.map((a) => (
              <article key={a.id} className="flex items-center gap-4">
                <Link href={`/berita/${a.slug}`} className="shrink-0">
                  <DriveImage driveId={a.thumbnailDriveId} alt={a.title} className="size-24 rounded-xl" />
                </Link>
                <h3 className="text-sm font-semibold">
                  <Link href={`/berita/${a.slug}`} className="line-clamp-3 hover:underline">
                    {a.title}
                  </Link>
                </h3>
              </article>
            ))}
          </div>
        )}
      </div>
    </section>
  )
}
