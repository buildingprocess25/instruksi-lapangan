import fs from "node:fs"
import path from "node:path"
import { Readable } from "node:stream"

import { isLocalMode } from "@/lib/env"
import { streamFile } from "@/lib/google-drive"
import { DRIVE_ID_PATTERN } from "@/lib/media"

export const runtime = "nodejs"

const LOCAL_MEDIA_DIR = path.join(process.cwd(), ".local-media")

function generateSvgPlaceholder(fileId: string): string {
  const isAvatar = fileId.includes("avatar")
  if (isAvatar) {
    const letter = fileId.includes("budi") ? "B" : "A"
    return `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 200 200">
      <defs>
        <linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#2563EB" />
          <stop offset="100%" stop-color="#1E40AF" />
        </linearGradient>
      </defs>
      <circle cx="100" cy="100" r="100" fill="url(#g)" />
      <text x="100" y="118" font-family="system-ui, sans-serif" font-size="72" font-weight="bold" fill="#ffffff" text-anchor="middle">${letter}</text>
    </svg>`
  }

  const hue = Math.abs(fileId.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0) % 360)
  return `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600" viewBox="0 0 800 600">
    <defs>
      <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="hsl(${hue}, 45%, 35%)" />
        <stop offset="100%" stop-color="hsl(${(hue + 40) % 360}, 50%, 20%)" />
      </linearGradient>
    </defs>
    <rect width="800" height="600" fill="url(#bg)" />
    <circle cx="400" cy="270" r="48" fill="#ffffff" fill-opacity="0.15" />
    <path d="M380 255h40v30h-40z M375 295h50v6h-50z" fill="#ffffff" fill-opacity="0.7" />
    <text x="400" y="360" font-family="system-ui, sans-serif" font-size="28" font-weight="700" fill="#ffffff" fill-opacity="0.9" text-anchor="middle">Warta Warga</text>
    <text x="400" y="392" font-family="system-ui, sans-serif" font-size="16" fill="#ffffff" fill-opacity="0.6" text-anchor="middle">Citizen Journalism &amp; Social News</text>
  </svg>`
}

export async function GET(_: Request, { params }: { params: Promise<{ fileId: string }> }) {
  const { fileId } = await params
  if (!DRIVE_ID_PATTERN.test(fileId)) return new Response("Not found", { status: 404 })

  if (isLocalMode) {
    const localFilePath = path.join(LOCAL_MEDIA_DIR, `${fileId}.webp`)
    if (fs.existsSync(localFilePath)) {
      const buffer = fs.readFileSync(localFilePath)
      return new Response(buffer, {
        headers: {
          "Content-Type": "image/webp",
          "Cache-Control": "public, max-age=31536000, s-maxage=31536000, immutable",
        },
      })
    }
    // Return SVG placeholder for mock or missing local files
    const svg = generateSvgPlaceholder(fileId)
    return new Response(svg, {
      headers: {
        "Content-Type": "image/svg+xml",
        "Cache-Control": "public, max-age=31536000, s-maxage=31536000, immutable",
      },
    })
  }

  try {
    const stream = await streamFile(fileId)
    return new Response(Readable.toWeb(stream) as ReadableStream, {
      headers: {
        "Content-Type": "image/webp",
        "Cache-Control": "public, max-age=31536000, s-maxage=31536000, immutable",
      },
    })
  } catch {
    return new Response("Not found", { status: 404 })
  }
}
