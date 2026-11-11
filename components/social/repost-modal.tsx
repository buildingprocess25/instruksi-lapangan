"use client"

import { useState, useTransition } from "react"
import { toast } from "sonner"

import { repostAction, undoRepostAction } from "@/actions/social.actions"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Textarea } from "@/components/ui/textarea"
import { Repeat2Icon } from "lucide-react"

type Props = {
  articleId: string
  slug: string
  isAuthor: boolean
  reposted: boolean
  quoteText: string | null
  count: number
}

export function RepostMenu({ articleId, slug, isAuthor, reposted, quoteText, count }: Props) {
  const [open, setOpen] = useState(false)
  const [quote, setQuote] = useState(quoteText ?? "")
  const [pending, startTransition] = useTransition()

  function submit(text?: string) {
    startTransition(async () => {
      const result = await repostAction(articleId, slug, text)
      if (result?.error) toast.error(result.error)
      else {
        toast.success(text ? "Kutipan opini dikirim." : "Berita di-repost.")
        setOpen(false)
      }
    })
  }

  function undo() {
    startTransition(async () => {
      const result = await undoRepostAction(articleId, slug)
      if (result?.error) toast.error(result.error)
      else toast.success("Repost dibatalkan.")
    })
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              variant={reposted ? "default" : "outline"}
              size="sm"
              disabled={isAuthor || pending}
              title={isAuthor ? "Tidak dapat me-repost berita sendiri" : undefined}
              className={reposted ? "bg-emerald-600 text-white hover:bg-emerald-700" : undefined}
            />
          }
        >
          <Repeat2Icon /> {count}
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          {!reposted && <DropdownMenuItem onClick={() => submit()}>Repost langsung</DropdownMenuItem>}
          <DropdownMenuItem onClick={() => setOpen(true)}>
            {quoteText ? "Ubah kutipan opini" : "Kutipan opini"}
          </DropdownMenuItem>
          {reposted && (
            <DropdownMenuItem variant="destructive" onClick={undo}>
              Batalkan repost
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Kutipan opini</DialogTitle>
            <DialogDescription>Tambahkan sudut pandang Anda di atas berita ini.</DialogDescription>
          </DialogHeader>
          <Textarea
            value={quote}
            onChange={(e) => setQuote(e.target.value)}
            maxLength={500}
            rows={4}
            placeholder="Tulis opini atau analisis singkat..."
            aria-label="Kutipan opini"
          />
          <DialogFooter>
            <Button disabled={pending || !quote.trim()} onClick={() => submit(quote)}>
              Kirim
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
