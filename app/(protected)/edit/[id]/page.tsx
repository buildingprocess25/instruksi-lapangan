import type { Metadata } from "next"
import { notFound } from "next/navigation"

import { NewsEditorForm } from "@/components/news/news-editor-form"
import { requireUser } from "@/lib/auth"
import { articleService } from "@/services/article.service"
import { categoryService } from "@/services/category.service"

export const metadata: Metadata = { title: "Edit Berita" }
export const dynamic = "force-dynamic"

export default async function EditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const user = await requireUser()
  const [article, categories] = await Promise.all([articleService.getById(id), categoryService.list()])
  if (!article || (article.authorId !== user.id && user.role !== "ADMIN")) notFound()

  return (
    <div>
      <h1 className="font-heading mx-auto mb-6 max-w-3xl text-3xl font-extrabold tracking-tight">Edit Berita</h1>
      <NewsEditorForm
        categories={categories}
        articleId={article.id}
        initial={{
          title: article.title,
          excerpt: article.excerpt ?? "",
          content: article.content,
          keyTakeaways: article.keyTakeaways,
          categoryId: article.categoryId,
          thumbnailDriveId: article.thumbnailDriveId,
          imageCaption: article.imageCaption ?? "",
          sourceUrl: article.sourceUrl ?? "",
          type: article.type,
        }}
      />
    </div>
  )
}
