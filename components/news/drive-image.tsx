import { cn } from "@/lib/utils"
import { mediaUrl } from "@/lib/media"

// Plain <img>: the proxy route already serves compressed, immutably cached WebP.
export function DriveImage({
  driveId,
  alt,
  className,
  priority = false,
}: {
  driveId: string
  alt: string
  className?: string
  priority?: boolean
}) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={mediaUrl(driveId)}
      alt={alt}
      loading={priority ? "eager" : "lazy"}
      decoding="async"
      className={cn("bg-slate-300 object-cover", className)}
    />
  )
}
