"use client"

import { useActionState, useEffect, useState } from "react"
import { toast } from "sonner"

import { updateProfileAction } from "@/actions/user.actions"
import { ImageUploader } from "@/components/news/image-uploader"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"

export function ProfileForm({
  initial,
}: {
  initial: { fullName: string; username: string; bio: string; avatarDriveId: string }
}) {
  const [state, action, pending] = useActionState(updateProfileAction, undefined)
  const [avatar, setAvatar] = useState(initial.avatarDriveId)

  useEffect(() => {
    if (state?.error) toast.error(state.error)
    if (state?.success) toast.success(state.success)
  }, [state])

  return (
    <form action={action} className="flex max-w-xl flex-col gap-5">
      <input type="hidden" name="avatarDriveId" value={avatar} />
      <div className="flex flex-col gap-2">
        <Label>Foto profil</Label>
        <ImageUploader kind="avatar" value={avatar} onChange={setAvatar} />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="fullName">Nama lengkap</Label>
        <Input id="fullName" name="fullName" required minLength={2} maxLength={60} defaultValue={initial.fullName} />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="username">Username</Label>
        <Input id="username" name="username" required pattern="[a-z0-9_]{3,20}" defaultValue={initial.username} />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="bio">Bio</Label>
        <Textarea id="bio" name="bio" rows={3} maxLength={300} defaultValue={initial.bio} />
      </div>
      <Button type="submit" disabled={pending} className="w-fit">
        Simpan
      </Button>
    </form>
  )
}
