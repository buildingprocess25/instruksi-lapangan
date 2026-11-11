"use client"

import { useRef, useState } from "react"
import { toast } from "sonner"

import { DriveImage } from "@/components/news/drive-image"
import { Button } from "@/components/ui/button"
import { MAX_UPLOAD_BYTES } from "@/lib/media"

export function ImageUploader({
  value,
  onChange,
  kind = "thumbnail",
}: {
  value: string
  onChange: (driveId: string) => void
  kind?: "thumbnail" | "avatar"
}) {
  const input = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)

  async function upload(file: File) {
    if (file.size > MAX_UPLOAD_BYTES) return void toast.error("Ukuran gambar maksimal 5 MB.")
    setUploading(true)
    try {
      const body = new FormData()
      body.set("file", file)
      body.set("kind", kind)
      const res = await fetch("/api/media/upload", { method: "POST", body })
      const json = (await res.json()) as { fileId?: string; error?: string }
      if (!res.ok || !json.fileId) throw new Error(json.error ?? "Gagal mengunggah gambar.")
      onChange(json.fileId)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gagal mengunggah gambar.")
    } finally {
      setUploading(false)
      if (input.current) input.current.value = ""
    }
  }

  return (
    <div className="flex flex-col gap-2">
      {value ? (
        <DriveImage
          driveId={value}
          alt="Pratinjau gambar"
          className={kind === "avatar" ? "size-24 rounded-full" : "aspect-[4/3] w-full max-w-sm rounded-2xl"}
        />
      ) : (
        <div
          className={
            (kind === "avatar" ? "size-24 rounded-full" : "aspect-[4/3] w-full max-w-sm rounded-2xl") +
            " flex items-center justify-center bg-slate-200 text-xs text-slate-600 dark:bg-muted"
          }
        >
          Belum ada gambar
        </div>
      )}
      <input
        ref={input}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif,image/avif"
        className="sr-only"
        aria-label="Pilih gambar"
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) void upload(file)
        }}
      />
      <Button type="button" variant="outline" size="sm" className="w-fit" disabled={uploading} onClick={() => input.current?.click()}>
        {uploading ? "Mengunggah..." : value ? "Ganti gambar" : "Unggah gambar"}
      </Button>
    </div>
  )
}
