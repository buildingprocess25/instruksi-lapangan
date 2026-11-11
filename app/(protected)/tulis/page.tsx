import type { Metadata } from "next"

import { NewsEditorForm } from "@/components/news/news-editor-form"
import { requireUser } from "@/lib/auth"
import { categoryService } from "@/services/category.service"

export const metadata: Metadata = { title: "Tulis Berita" }
export const dynamic = "force-dynamic"

export default async function WritePage() {
  await requireUser()
  const categories = await categoryService.list()
  return (
    <div>
      <h1 className="font-heading mx-auto mb-6 max-w-3xl text-3xl font-extrabold tracking-tight">Tulis Berita</h1>
      <NewsEditorForm categories={categories} />
    </div>
  )
}
