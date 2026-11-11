"use client"

import { useState, useTransition } from "react"
import { toast } from "sonner"

import {
  addCommentAction,
  deleteCommentAction,
  editCommentAction,
} from "@/actions/social.actions"
import { UserAvatar, UserLink } from "@/components/news/user-bits"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Textarea } from "@/components/ui/textarea"
import { formatDateTime } from "@/lib/format"
import type { CommentNode } from "@/services/social.service"

type Viewer = { id: string; isStaff: boolean } | null
type Ctx = { articleId: string; slug: string; viewer: Viewer }

function Composer({
  ctx,
  parentId,
  initial = "",
  commentId,
  placeholder,
  onDone,
}: {
  ctx: Ctx
  parentId?: string
  initial?: string
  commentId?: string
  placeholder: string
  onDone?: () => void
}) {
  const [value, setValue] = useState(initial)
  const [pending, startTransition] = useTransition()

  function submit() {
    startTransition(async () => {
      const result = commentId
        ? await editCommentAction(commentId, ctx.slug, value)
        : await addCommentAction(ctx.articleId, ctx.slug, value, parentId)
      if (result?.error) return void toast.error(result.error)
      setValue("")
      onDone?.()
    })
  }

  return (
    <div className="flex flex-col gap-2">
      <Textarea
        value={value}
        onChange={(e) => setValue(e.target.value)}
        maxLength={2000}
        rows={3}
        placeholder={placeholder}
        aria-label={placeholder}
      />
      <div className="flex justify-end gap-2">
        {onDone && (
          <Button variant="ghost" size="sm" onClick={onDone} disabled={pending}>
            Batal
          </Button>
        )}
        <Button size="sm" onClick={submit} disabled={pending || !value.trim()}>
          {commentId ? "Simpan" : "Kirim"}
        </Button>
      </div>
    </div>
  )
}

function CommentItem({ node, ctx, depth }: { node: CommentNode; ctx: Ctx; depth: number }) {
  const [mode, setMode] = useState<"view" | "reply" | "edit">("view")
  const [pending, startTransition] = useTransition()
  const own = ctx.viewer?.id === node.user.id
  const canDelete = own || ctx.viewer?.isStaff

  function remove() {
    if (!confirm("Hapus komentar ini beserta balasannya?")) return
    startTransition(async () => {
      const result = await deleteCommentAction(node.id, ctx.slug)
      if (result?.error) toast.error(result.error)
    })
  }

  return (
    <li className="flex gap-3">
      <UserAvatar user={node.user} size="sm" />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <UserLink user={node.user} />
          <time className="text-xs text-slate-600 dark:text-slate-400" dateTime={node.createdAt.toISOString()}>
            {formatDateTime(node.createdAt)}
          </time>
          {node.isEdited && <span className="text-xs text-slate-500">(diedit)</span>}
        </div>

        {mode === "edit" ? (
          <div className="mt-2">
            <Composer ctx={ctx} commentId={node.id} initial={node.content} placeholder="Ubah komentar" onDone={() => setMode("view")} />
          </div>
        ) : (
          <p className="mt-1 text-sm break-words whitespace-pre-wrap">{node.content}</p>
        )}

        {mode === "view" && ctx.viewer && (
          <div className="mt-1 flex gap-1">
            <Button variant="ghost" size="xs" onClick={() => setMode("reply")}>
              Balas
            </Button>
            {own && (
              <Button variant="ghost" size="xs" onClick={() => setMode("edit")}>
                Edit
              </Button>
            )}
            {canDelete && (
              <Button variant="ghost" size="xs" onClick={remove} disabled={pending}>
                Hapus
              </Button>
            )}
          </div>
        )}

        {mode === "reply" && (
          <div className="mt-2">
            <Composer ctx={ctx} parentId={node.id} placeholder="Tulis balasan" onDone={() => setMode("view")} />
          </div>
        )}

        {node.replies.length > 0 && (
          <ul className={depth >= 4 ? "mt-4 flex flex-col gap-4" : "mt-4 flex flex-col gap-4 border-l pl-4"}>
            {node.replies.map((reply) => (
              <CommentItem key={reply.id} node={reply} ctx={ctx} depth={depth + 1} />
            ))}
          </ul>
        )}
      </div>
    </li>
  )
}

export function CommentList({ comments, ...ctx }: Ctx & { comments: CommentNode[] }) {
  return (
    <div className="flex flex-col gap-6">
      {ctx.viewer ? (
        <Composer ctx={ctx} placeholder="Tulis komentar..." />
      ) : (
        <p className="text-sm text-slate-600 dark:text-slate-400">Masuk untuk ikut berdiskusi.</p>
      )}
      <Separator />
      {comments.length === 0 ? (
        <p className="text-sm text-slate-600 dark:text-slate-400">Belum ada komentar.</p>
      ) : (
        <ul className="flex flex-col gap-6">
          {comments.map((c) => (
            <CommentItem key={c.id} node={c} ctx={ctx} depth={0} />
          ))}
        </ul>
      )}
    </div>
  )
}
