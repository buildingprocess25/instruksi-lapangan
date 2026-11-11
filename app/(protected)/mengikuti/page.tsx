import type { Metadata } from "next"

import { ArticleCardView } from "@/components/news/article-card"
import { requireUser } from "@/lib/auth"
import { formatDateTime } from "@/lib/format"
import { userService } from "@/services/user.service"

export const metadata: Metadata = { title: "Feed Mengikuti" }
export const dynamic = "force-dynamic"

export default async function FollowingFeedPage() {
  const user = await requireUser()
  const feed = await userService.getFollowingFeed(user.id)

  return (
    <div>
      <h1 className="font-heading mb-6 text-3xl font-extrabold tracking-tight">Feed Mengikuti</h1>
      {feed.length === 0 ? (
        <p className="text-sm text-slate-600 dark:text-slate-400">Ikuti penulis untuk melihat berita dan repost mereka di sini.</p>
      ) : (
        <ul className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {feed.map((item) => (
            <li key={item.id} className="flex flex-col gap-2">
              {item.kind === "repost" && (
                <div className="text-xs text-slate-600 dark:text-slate-400">
                  <strong>{item.reposter.fullName}</strong> me-repost · {formatDateTime(item.at)}
                  {item.quoteText && <p className="mt-1 border-l-4 border-emerald-600 pl-3 text-sm text-foreground whitespace-pre-wrap">{item.quoteText}</p>}
                </div>
              )}
              <ArticleCardView article={item.article} />
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
