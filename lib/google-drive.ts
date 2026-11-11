import { google } from "googleapis"
import { Readable } from "node:stream"

function getDrive() {
  const email = process.env.GOOGLE_DRIVE_CLIENT_EMAIL
  const key = process.env.GOOGLE_DRIVE_PRIVATE_KEY
  if (!email || !key) throw new Error("Google Drive credentials are not configured")

  const auth = new google.auth.JWT({
    email,
    key: key.replace(/\\n/g, "\n"),
    scopes: ["https://www.googleapis.com/auth/drive"],
  })
  return google.drive({ version: "v3", auth })
}

export async function uploadWebp(buffer: Buffer, name: string): Promise<string> {
  const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID
  if (!folderId) throw new Error("GOOGLE_DRIVE_FOLDER_ID is not configured")

  const { data } = await getDrive().files.create({
    requestBody: { name, parents: [folderId] },
    media: { mimeType: "image/webp", body: Readable.from(buffer) },
    fields: "id",
    supportsAllDrives: true,
  })
  if (!data.id) throw new Error("Google Drive did not return a file id")
  return data.id
}

export async function streamFile(fileId: string): Promise<Readable> {
  const { data } = await getDrive().files.get(
    { fileId, alt: "media", supportsAllDrives: true },
    { responseType: "stream" }
  )
  return data
}

// Best effort: a failed cleanup must never fail the user-facing operation.
export async function deleteFile(fileId: string | null | undefined): Promise<void> {
  if (!fileId) return
  try {
    await getDrive().files.delete({ fileId, supportsAllDrives: true })
  } catch {}
}
