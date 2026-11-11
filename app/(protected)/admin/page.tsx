import type { Metadata } from "next"
import Link from "next/link"

import { CategoryForm, HeadlineSelect, RoleSelect } from "@/components/admin/admin-controls"
import { requireStaff } from "@/lib/auth"
import { articleService } from "@/services/article.service"
import { categoryService } from "@/services/category.service"
import { userService } from "@/services/user.service"

export const metadata: Metadata = { title: "Panel Moderator" }
export const dynamic = "force-dynamic"

export default async function AdminPage() {
  const staff = await requireStaff()
  const isAdmin = staff.role === "ADMIN"
  const [articles, categories, users] = await Promise.all([
    articleService.listForHeadlineAdmin(),
    categoryService.list(),
    isAdmin ? userService.listUsers() : Promise.resolve([]),
  ])

  return (
    <div className="flex flex-col gap-10">
      <h1 className="font-heading text-3xl font-extrabold tracking-tight">Panel Moderator</h1>

      <section aria-labelledby="headline" className="flex flex-col gap-3">
        <h2 id="headline" className="text-xl font-bold">Headline Bento Grid</h2>
        <p className="text-sm text-slate-600 dark:text-slate-400">Satu berita utama, satu tengah, maksimal tiga di daftar kanan.</p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <tbody>
              {articles.map((a) => (
                <tr key={a.id} className="border-b">
                  <td className="py-2 pr-4"><Link href={`/berita/${a.slug}`} className="hover:underline">{a.title}</Link></td>
                  <td className="py-2"><HeadlineSelect articleId={a.id} value={a.headlinePosition} /></td>
                </tr>
              ))}
              {articles.length === 0 && <tr><td className="py-4 text-slate-600">Belum ada berita terbit.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>

      <section aria-labelledby="kategori" className="flex flex-col gap-3">
        <h2 id="kategori" className="text-xl font-bold">Kategori Navbar</h2>
        {categories.map((c) => <CategoryForm key={c.id} category={c} />)}
        <h3 className="mt-2 text-sm font-semibold">Tambah kategori</h3>
        <CategoryForm />
      </section>

      {isAdmin && (
        <section aria-labelledby="pengguna" className="flex flex-col gap-3">
          <h2 id="pengguna" className="text-xl font-bold">Pengguna</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <tbody>
                {users.map((u) => (
                  <tr key={u.id} className="border-b">
                    <td className="py-2 pr-4"><Link href={`/@${u.username}`} className="hover:underline">{u.fullName} (@{u.username})</Link></td>
                    <td className="py-2 pr-4 text-slate-600">{u.email}</td>
                    <td className="py-2 pr-4">{u.trustScore}</td>
                    <td className="py-2"><RoleSelect userId={u.id} value={u.role} disabled={u.id === staff.id} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  )
}
