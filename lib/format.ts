const TIME_ZONE = "Asia/Jakarta"

export function formatDate(value: Date | string): string {
  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "long",
    timeZone: TIME_ZONE,
  }).format(new Date(value))
}

export function formatDateTime(value: Date | string): string {
  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: TIME_ZONE,
  }).format(new Date(value))
}

export function initials(name: string): string {
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join("") || "?"
  )
}

export function stripHtml(html: string): string {
  return html
    .replace(/<\/(?:p|div|h[1-6]|li|blockquote)>|<br\s*\/?>/gi, " ")
    .replace(/<[^>]*>/g, "")
    .replace(/\s+/g, " ")
    .trim()
}
