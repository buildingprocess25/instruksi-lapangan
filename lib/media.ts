export const DRIVE_ID_PATTERN = /^[A-Za-z0-9_-]{6,100}$/

export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024

export function mediaUrl(driveId: string): string {
  return `/api/media/${driveId}`
}
