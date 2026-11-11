import type { Metadata } from "next"

import { ProfileForm } from "@/components/profile/profile-form"
import { requireUser } from "@/lib/auth"

export const metadata: Metadata = { title: "Pengaturan Profil" }
export const dynamic = "force-dynamic"

export default async function SettingsPage() {
  const user = await requireUser()
  return (
    <div>
      <h1 className="font-heading mb-6 text-3xl font-extrabold tracking-tight">Pengaturan Profil</h1>
      <ProfileForm
        initial={{
          fullName: user.fullName,
          username: user.username,
          bio: user.bio ?? "",
          avatarDriveId: user.avatarDriveId ?? "",
        }}
      />
    </div>
  )
}
