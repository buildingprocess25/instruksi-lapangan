"use client"

import Link from "next/link"
import { useOptimistic, useTransition } from "react"
import { toast } from "sonner"

import { toggleBookmarkAction, toggleLikeAction } from "@/actions/social.actions"
import { RepostMenu } from "@/components/social/repost-modal"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { BookmarkIcon, HeartIcon, MessageCircleIcon } from "lucide-react"

type Props = {
  articleId: string
  slug: string
  isAuthor: boolean
  signedIn: boolean
  counts: { likes: number; reposts: number; comments: number }
  state: { liked: boolean; bookmarked: boolean; reposted: boolean; quoteText: string | null }
}

export function ActionBar({ articleId, slug, isAuthor, signedIn, counts, state }: Props) {
  const [pending, startTransition] = useTransition()
  const [optimistic, setOptimistic] = useOptimistic(
    { liked: state.liked, likes: counts.likes, bookmarked: state.bookmarked },
    (current, action: "like" | "bookmark") =>
      action === "like"
        ? { ...current, liked: !current.liked, likes: current.likes + (current.liked ? -1 : 1) }
        : { ...current, bookmarked: !current.bookmarked }
  )

  function run(kind: "like" | "bookmark") {
    startTransition(async () => {
      setOptimistic(kind)
      const result = await (kind === "like" ? toggleLikeAction(articleId, slug) : toggleBookmarkAction(articleId, slug))
      if (result?.error) toast.error(result.error)
    })
  }

  if (!signedIn) {
    return (
      <div className="flex flex-wrap items-center gap-3 border-y py-3 text-sm text-slate-600 dark:text-slate-400">
        <span>{counts.likes} suka</span>
        <span>{counts.reposts} repost</span>
        <span>{counts.comments} komentar</span>
        <Link href={`/masuk?next=/berita/${slug}`} className="ml-auto font-medium text-blue-600 hover:underline">
          Masuk untuk berinteraksi
        </Link>
      </div>
    )
  }

  return (
    <div className="flex flex-wrap items-center gap-2 border-y py-3">
      <Button
        variant={optimistic.liked ? "default" : "outline"}
        size="sm"
        disabled={pending}
        aria-pressed={optimistic.liked}
        onClick={() => run("like")}
      >
        <HeartIcon className={cn(optimistic.liked && "fill-current")} /> {optimistic.likes}
      </Button>
      <RepostMenu
        articleId={articleId}
        slug={slug}
        isAuthor={isAuthor}
        reposted={state.reposted}
        quoteText={state.quoteText}
        count={counts.reposts}
      />
      <a href="#komentar" className="inline-flex h-8 items-center gap-1.5 rounded-4xl border px-3 text-sm font-medium hover:bg-accent">
        <MessageCircleIcon className="size-4" /> {counts.comments}
      </a>
      <Button
        variant={optimistic.bookmarked ? "default" : "outline"}
        size="sm"
        className="ml-auto"
        disabled={pending}
        aria-pressed={optimistic.bookmarked}
        onClick={() => run("bookmark")}
      >
        <BookmarkIcon className={cn(optimistic.bookmarked && "fill-current")} />
        {optimistic.bookmarked ? "Tersimpan" : "Simpan"}
      </Button>
    </div>
  )
}
