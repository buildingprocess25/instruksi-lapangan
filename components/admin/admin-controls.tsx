"use client"

import { useActionState, useEffect, useTransition } from "react"
import { toast } from "sonner"

import { deleteCategoryAction, saveCategoryAction, setHeadlineAction, setRoleAction } from "@/actions/admin.actions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

const selectClass = "h-8 rounded-4xl border border-input bg-input/30 px-2 text-sm"

export function HeadlineSelect({ articleId, value }: { articleId: string; value: string }) {
  const [pending, startTransition] = useTransition()
  return (
    <select
      aria-label="Posisi headline"
      className={selectClass}
      defaultValue={value}
      disabled={pending}
      onChange={(e) =>
        startTransition(async () => {
          const r = await setHeadlineAction(articleId, e.target.value)
          if (r?.error) toast.error(r.error)
          else toast.success(r?.success ?? "Tersimpan.")
        })
      }
    >
      <option value="NONE">Tidak ada</option>
      <option value="MAIN_LEFT">Utama (kiri)</option>
      <option value="MIDDLE_CENTER">Tengah</option>
      <option value="RIGHT_LIST">Daftar kanan</option>
    </select>
  )
}

export function RoleSelect({ userId, value, disabled }: { userId: string; value: string; disabled: boolean }) {
  const [pending, startTransition] = useTransition()
  return (
    <select
      aria-label="Peran"
      className={selectClass}
      defaultValue={value}
      disabled={disabled || pending}
      onChange={(e) =>
        startTransition(async () => {
          const r = await setRoleAction(userId, e.target.value)
          if (r?.error) toast.error(r.error)
          else toast.success(r?.success ?? "Tersimpan.")
        })
      }
    >
      <option value="USER">User</option>
      <option value="MODERATOR">Moderator</option>
      <option value="ADMIN">Admin</option>
    </select>
  )
}

export function CategoryForm({ category }: { category?: { id: string; name: string; description: string | null; orderIndex: number } }) {
  const [state, action, pending] = useActionState(saveCategoryAction, undefined)
  const [removing, startRemove] = useTransition()

  useEffect(() => {
    if (state?.error) toast.error(state.error)
    if (state?.success) toast.success(state.success)
  }, [state])

  return (
    <form action={action} className="flex flex-wrap items-center gap-2">
      {category && <input type="hidden" name="id" value={category.id} />}
      <Input name="name" required placeholder="Nama kategori" aria-label="Nama kategori" defaultValue={category?.name} className="w-44" />
      <Input name="description" placeholder="Deskripsi" aria-label="Deskripsi" defaultValue={category?.description ?? ""} className="w-56" />
      <Input name="orderIndex" type="number" min={0} aria-label="Urutan" defaultValue={category?.orderIndex ?? 0} className="w-20" />
      <Button type="submit" size="sm" disabled={pending}>{category ? "Simpan" : "Tambah"}</Button>
      {category && (
        <Button
          type="button"
          size="sm"
          variant="destructive"
          disabled={removing}
          onClick={() => {
            if (!confirm(`Hapus kategori "${category.name}"?`)) return
            startRemove(async () => {
              const r = await deleteCategoryAction(category.id)
              if (r?.error) toast.error(r.error)
              else toast.success(r?.success ?? "Dihapus.")
            })
          }}
        >
          Hapus
        </Button>
      )}
    </form>
  )
}
