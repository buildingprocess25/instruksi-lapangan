import { CommentList } from "@/components/social/comment-section"
import { UserAvatar, UserLink } from "@/components/news/user-bits"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { formatDateTime } from "@/lib/format"
import { socialService } from "@/services/social.service"

export async function DiscussionTabs({
  articleId,
  slug,
  viewer,
}: {
  articleId: string
  slug: string
  viewer: { id: string; isStaff: boolean } | null
}) {
  const [comments, reposts] = await Promise.all([
    socialService.getComments(articleId),
    socialService.getReposts(articleId),
  ])

  return (
    <section id="komentar" aria-label="Diskusi" className="mt-8">
      <Tabs defaultValue="komentar">
        <TabsList>
          <TabsTrigger value="komentar">Komentar</TabsTrigger>
          <TabsTrigger value="repost">Repost &amp; Opini ({reposts.length})</TabsTrigger>
        </TabsList>
        <TabsContent value="komentar" className="pt-4">
          <CommentList comments={comments} articleId={articleId} slug={slug} viewer={viewer} />
        </TabsContent>
        <TabsContent value="repost" className="pt-4">
          {reposts.length === 0 ? (
            <p className="text-sm text-slate-600 dark:text-slate-400">Belum ada yang me-repost.</p>
          ) : (
            <ul className="flex flex-col gap-4">
              {reposts.map((r) => (
                <li key={r.id} className="flex gap-3">
                  <UserAvatar user={r.user} size="sm" />
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2 text-sm">
                      <UserLink user={r.user} />
                      <time className="text-xs text-slate-600 dark:text-slate-400" dateTime={r.createdAt.toISOString()}>
                        {formatDateTime(r.createdAt)}
                      </time>
                    </div>
                    {r.quoteText ? (
                      <p className="mt-1 text-sm break-words whitespace-pre-wrap">{r.quoteText}</p>
                    ) : (
                      <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">me-repost berita ini</p>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </TabsContent>
      </Tabs>
    </section>
  )
}
