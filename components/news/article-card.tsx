import Link from "next/link"

import { DriveImage } from "@/components/news/drive-image"
import { UserLink } from "@/components/news/user-bits"
import { Badge } from "@/components/ui/badge"
import { formatDate } from "@/lib/format"
import type { ArticleCard } from "@/services/article.service"
import { MessageCircleIcon, Repeat2Icon } from "lucide-react"

export function ArticleMeta({ article }: { article: ArticleCard }) {
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-600 dark:text-slate-400">
      <UserLink user={article.author} />
      {article.publishedAt && <time dateTime={article.publishedAt.toISOString()}>{formatDate(article.publishedAt)}</time>}
      <span className="inline-flex items-center gap-1">
        <Repeat2Icon className="size-3.5" /> {article._count.reposts}
      </span>
      <span className="inline-flex items-center gap-1">
        <MessageCircleIcon className="size-3.5" /> {article._count.comments}
      </span>
    </div>
  )
}

export function ArticleCardView({ article }: { article: ArticleCard }) {
  return (
    <article className="group flex flex-col gap-3">
      <Link href={`/berita/${article.slug}`} className="block overflow-hidden rounded-2xl">
        <DriveImage
          driveId={article.thumbnailDriveId}
          alt={article.imageCaption ?? article.title}
          className="aspect-[16/10] w-full transition-transform duration-300 group-hover:scale-105"
        />
      </Link>
      <div className="flex flex-col gap-2">
        <Badge variant="secondary" render={<Link href={`/kategori/${article.category.slug}`} />} className="w-fit">
          {article.category.name}
        </Badge>
        <h3 className="font-heading text-lg leading-snug font-bold">
          <Link href={`/berita/${article.slug}`} className="hover:underline">
            {article.title}
          </Link>
        </h3>
        {article.excerpt && <p className="line-clamp-2 text-sm text-slate-600 dark:text-slate-400">{article.excerpt}</p>}
        <ArticleMeta article={article} />
      </div>
    </article>
  )
}

export function ArticleGrid({ articles, empty = "Belum ada berita." }: { articles: ArticleCard[]; empty?: string }) {
  if (articles.length === 0) {
    return <p className="rounded-2xl bg-slate-100 p-8 text-center text-sm text-slate-600 dark:bg-muted dark:text-slate-400">{empty}</p>
  }
  return (
    <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
      {articles.map((a) => (
        <ArticleCardView key={a.id} article={a} />
      ))}
    </div>
  )
}
