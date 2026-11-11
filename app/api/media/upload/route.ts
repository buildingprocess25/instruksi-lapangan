import fs from "node:fs"
import path from "node:path"
import { NextResponse, type NextRequest } from "next/server"
import sharp from "sharp"

import { getCurrentUser } from "@/lib/auth"
import { isLocalMode } from "@/lib/env"
import { uploadWebp } from "@/lib/google-drive"
import { MAX_UPLOAD_BYTES } from "@/lib/media"

export const runtime = "nodejs"

const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif", "image/avif"])
const LOCAL_MEDIA_DIR = path.join(process.cwd(), ".local-media")

export async function POST(request: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "Anda harus masuk terlebih dahulu." }, { status: 401 })

  const form = await request.formData().catch(() => null)
  const file = form?.get("file")
  if (!(file instanceof File)) return NextResponse.json({ error: "File tidak ditemukan." }, { status: 400 })
  if (!ALLOWED_TYPES.has(file.type)) return NextResponse.json({ error: "Format gambar tidak didukung." }, { status: 415 })
  if (file.size > MAX_UPLOAD_BYTES) return NextResponse.json({ error: "Ukuran gambar maksimal 5 MB." }, { status: 413 })

  const kind = form?.get("kind") === "avatar" ? "avatar" : "thumbnail"

  try {
    const webp = await sharp(Buffer.from(await file.arrayBuffer()))
      .rotate()
      .resize({ width: kind === "avatar" ? 400 : 1600, height: kind === "avatar" ? 400 : undefined, fit: kind === "avatar" ? "cover" : "inside", withoutEnlargement: true })
      .webp({ quality: 80 })
      .toBuffer()

    if (isLocalMode) {
      if (!fs.existsSync(LOCAL_MEDIA_DIR)) {
        fs.mkdirSync(LOCAL_MEDIA_DIR, { recursive: true })
      }
      const fileId = `local-${Date.now()}-${crypto.randomUUID().slice(0, 8)}`
      fs.writeFileSync(path.join(LOCAL_MEDIA_DIR, `${fileId}.webp`), webp)
      return NextResponse.json({ fileId })
    }

    const fileId = await uploadWebp(webp, `${kind}-${user.id}-${Date.now()}.webp`)
    return NextResponse.json({ fileId })
  } catch {
    return NextResponse.json({ error: "Gagal mengunggah gambar." }, { status: 500 })
  }
}
