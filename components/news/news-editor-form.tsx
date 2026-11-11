"use client"

import { useEffect, useRef, useState, useTransition } from "react"
import { toast } from "sonner"

import { createArticleAction, deleteArticleAction, updateArticleAction } from "@/actions/article.actions"
import { ImageUploader } from "@/components/news/image-uploader"
import { RichTextEditor } from "@/components/news/rich-text-editor"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import type { ArticleInput } from "@/services/article.service"

type Values = Omit<ArticleInput, "status">

const EMPTY: Values = {
  title: "",
  excerpt: "",
  content: "",
  keyTakeaways: ["", "", ""],
  categoryId: "",
  thumbnailDriveId: "",
  imageCaption: "",
  sourceUrl: "",
  type: "CITIZEN_REPORT",
}

const DRAFT_KEY = "news-editor-draft"
const selectClass =
  "h-9 w-full rounded-4xl border border-input bg-input/30 px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"

export function NewsEditorForm({
  categories,
  articleId,
  initial,
}: {
  categories: { id: string; name: string }[]
  articleId?: string
  initial?: Values
}) {
  const [values, setValues] = useState<Values>(() => ({
    ...(initial ?? EMPTY),
    keyTakeaways: [...(initial?.keyTakeaways ?? []), "", "", ""].slice(0, 3),
  }))
  const [pending, startTransition] = useTransition()
  const restored = useRef(false)

  // Autosave only unsaved new articles; edits are already persisted server-side.
  useEffect(() => {
    if (articleId || restored.current) return
    restored.current = true
    const saved = localStorage.getItem(DRAFT_KEY)
    if (saved) {
      try {
        // eslint-disable-next-line react-hooks/set-state-in-effect -- localStorage is unavailable during SSR, so restore after mount
        setValues({ ...EMPTY, ...(JSON.parse(saved) as Values) })
        toast.info("Draft otomatis dipulihkan.")
      } catch {
        localStorage.removeItem(DRAFT_KEY)
      }
    }
  }, [articleId])

  useEffect(() => {
    if (articleId || !restored.current) return
    const t = setTimeout(() => localStorage.setItem(DRAFT_KEY, JSON.stringify(values)), 800)
    return () => clearTimeout(t)
  }, [values, articleId])

  function set<K extends keyof Values>(key: K, value: Values[K]) {
    setValues((v) => ({ ...v, [key]: value }))
  }

  function submit(status: "DRAFT" | "PUBLISHED") {
    startTransition(async () => {
      const payload = { ...values, status }
      const result = articleId ? await updateArticleAction(articleId, payload) : await createArticleAction(payload)
      if (result?.error) return void toast.error(result.error)
      localStorage.removeItem(DRAFT_KEY)
    })
  }

  function remove() {
    if (!articleId || !confirm("Hapus berita ini secara permanen?")) return
    startTransition(async () => {
      const result = await deleteArticleAction(articleId)
      if (result?.error) toast.error(result.error)
    })
  }

  return (
    <form
      className="mx-auto flex max-w-3xl flex-col gap-6"
      onSubmit={(e) => {
        e.preventDefault()
        submit("PUBLISHED")
      }}
    >
      <div className="flex flex-col gap-2">
        <Label htmlFor="title">Judul</Label>
        <Input id="title" required maxLength={255} value={values.title} onChange={(e) => set("title", e.target.value)} />
      </div>

      <div className="grid gap-6 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <Label htmlFor="category">Kategori</Label>
          <select id="category" required className={selectClass} value={values.categoryId} onChange={(e) => set("categoryId", e.target.value)}>
            <option value="" disabled>Pilih kategori</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="type">Jenis berita</Label>
          <select id="type" className={selectClass} value={values.type} onChange={(e) => set("type", e.target.value as Values["type"])}>
            <option value="CITIZEN_REPORT">Laporan Langsung (Citizen Report)</option>
            <option value="OPINION">Saduran / Opini</option>
          </select>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <Label>Gambar thumbnail (maks. 5 MB, otomatis WebP)</Label>
        <ImageUploader value={values.thumbnailDriveId} onChange={(id) => set("thumbnailDriveId", id)} />
        <Input aria-label="Keterangan gambar" placeholder="Keterangan gambar (opsional)" maxLength={200} value={values.imageCaption ?? ""} onChange={(e) => set("imageCaption", e.target.value)} />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="excerpt">Ringkasan singkat</Label>
        <Textarea id="excerpt" rows={2} maxLength={300} value={values.excerpt ?? ""} onChange={(e) => set("excerpt", e.target.value)} />
      </div>

      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1 text-sm font-medium">3 Poin Inti Berita</legend>
        {values.keyTakeaways.map((point, i) => (
          <Input
            key={i}
            aria-label={`Poin inti ${i + 1}`}
            placeholder={`Poin ${i + 1}`}
            maxLength={200}
            value={point}
            onChange={(e) => set("keyTakeaways", values.keyTakeaways.map((p, j) => (j === i ? e.target.value : p)))}
          />
        ))}
      </fieldset>

      <div className="flex flex-col gap-2">
        <Label>Isi berita</Label>
        <RichTextEditor value={values.content} onChange={(html) => set("content", html)} />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="sourceUrl">Tautan sumber (opsional)</Label>
        <Input id="sourceUrl" type="url" placeholder="https://" maxLength={500} value={values.sourceUrl ?? ""} onChange={(e) => set("sourceUrl", e.target.value)} />
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" disabled={pending}>Terbitkan</Button>
        <Button type="button" variant="outline" disabled={pending} onClick={() => submit("DRAFT")}>
          Simpan draft
        </Button>
        {articleId && (
          <Button type="button" variant="destructive" className="ml-auto" disabled={pending} onClick={remove}>
            Hapus
          </Button>
        )}
      </div>
    </form>
  )
}
