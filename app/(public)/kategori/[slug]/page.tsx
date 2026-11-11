import type { Metadata } from "next"
import { notFound } from "next/navigation"

import { ArticleGrid } from "@/components/news/article-card"
import { Pagination } from "@/components/news/pagination"
import { articleService } from "@/services/article.service"
import { categoryService } from "@/services/category.service"

export const dynamic = "force-dynamic"

type Props = {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ page?: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const category = await categoryService.getBySlug(slug)
  return { title: category ? category.name : "Kategori" }
}

export default async function CategoryPage({ params, searchParams }: Props) {
  const [{ slug }, { page }] = await Promise.all([params, searchParams])
  const category = await categoryService.getBySlug(slug)
  if (!category) notFound()

  const result = await articleService.listPublished({ categorySlug: slug, page: Number(page) })

  return (
    <div>
      <h1 className="font-heading mb-2 text-3xl font-extrabold tracking-tight">{category.name}</h1>
      {category.description && <p className="mb-6 text-slate-600 dark:text-slate-400">{category.description}</p>}
      <ArticleGrid articles={result.items} empty="Belum ada berita di kategori ini." />
      <Pagination page={result.page} pageCount={result.pageCount} basePath={`/kategori/${slug}`} />
    </div>
  )
}
