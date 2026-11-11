export function slugify(text: string): string {
  const slug = text
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80)
    .replace(/-+$/, "")
  return slug || "berita"
}

export function withSuffix(slug: string): string {
  return `${slug}-${crypto.randomUUID().slice(0, 6)}`
}

export function toUsername(raw: string): string {
  const name = raw.toLowerCase().replace(/[^a-z0-9_]/g, "").slice(0, 20)
  return name.length >= 3 ? name : `${name}user`.slice(0, 20)
}
