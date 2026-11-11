import Link from "next/link"

import { DriveImage } from "@/components/news/drive-image"
import { UserAvatar, UserLink } from "@/components/news/user-bits"
import { Badge } from "@/components/ui/badge"
import { formatDate } from "@/lib/format"
import { sanitizeHtml } from "@/lib/sanitize"
import type { articleService } from "@/services/article.service"
import { ExternalLinkIcon } from "lucide-react"

type Article = NonNullable<Awaited<ReturnType<typeof articleService.getBySlug>>>

export function EditorialReader({ article }: { article: Article }) {
  return (
    <article>
      <header className="mb-6 flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary" render={<Link href={`/kategori/${article.category.slug}`} />}>
            {article.category.name}
          </Badge>
          <Badge variant="outline">{article.type === "CITIZEN_REPORT" ? "Laporan Langsung" : "Saduran / Opini"}</Badge>
          {article.status === "DRAFT" && <Badge variant="destructive">Draft</Badge>}
        </div>
        <h1 className="font-heading text-3xl font-extrabold tracking-tight lg:text-4xl">{article.title}</h1>
        <div className="flex items-center gap-3 text-sm text-slate-600 dark:text-slate-400">
          <UserAvatar user={article.author} />
          <div className="flex flex-col">
            <UserLink user={article.author} />
            {article.publishedAt && <time dateTime={article.publishedAt.toISOString()}>{formatDate(article.publishedAt)}</time>}
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 items-start gap-8 lg:grid-cols-12">
        <figure className="lg:sticky lg:top-24 lg:col-span-5">
          <DriveImage
            driveId={article.thumbnailDriveId}
            alt={article.imageCaption ?? article.title}
            priority
            className="aspect-[4/3] w-full rounded-2xl"
          />
          {article.imageCaption && (
            <figcaption className="mt-2 text-xs text-slate-600 dark:text-slate-400">{article.imageCaption}</figcaption>
          )}
        </figure>

        <div className="flex flex-col gap-4 lg:col-span-7">
          {article.excerpt && <p className="text-lg font-medium text-slate-700 dark:text-slate-300">{article.excerpt}</p>}
          {article.keyTakeaways.length > 0 && (
            <section aria-labelledby="takeaways" className="rounded-2xl bg-slate-100 p-5 dark:bg-muted">
              <h2 id="takeaways" className="font-heading mb-2 text-sm font-bold tracking-wide uppercase">
                Poin Inti Berita
              </h2>
              <ul className="list-disc space-y-1 pl-5 text-sm">
                {article.keyTakeaways.map((point, i) => (
                  <li key={i}>{point}</li>
                ))}
              </ul>
            </section>
          )}
          {article.sourceUrl && (
            <a
              href={article.sourceUrl}
              target="_blank"
              rel="noopener noreferrer nofollow"
              className="inline-flex w-fit items-center gap-1 text-sm text-blue-600 hover:underline"
            >
              Sumber referensi <ExternalLinkIcon className="size-3.5" />
            </a>
          )}
        </div>
      </div>

      <div
        className="prose prose-slate dark:prose-invert mt-8 max-w-none"
        dangerouslySetInnerHTML={{ __html: sanitizeHtml(article.content) }}
      />
    </article>
  )
}
