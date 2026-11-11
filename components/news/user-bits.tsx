import Link from "next/link"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { initials } from "@/lib/format"
import { mediaUrl } from "@/lib/media"
import { BadgeCheckIcon } from "lucide-react"

type Person = { username: string; fullName: string; avatarDriveId: string | null; isVerified?: boolean }

export function UserAvatar({ user, size = "default" }: { user: Omit<Person, "isVerified">; size?: "default" | "sm" | "lg" }) {
  return (
    <Avatar size={size}>
      {user.avatarDriveId && <AvatarImage src={mediaUrl(user.avatarDriveId)} alt={user.fullName} />}
      <AvatarFallback>{initials(user.fullName)}</AvatarFallback>
    </Avatar>
  )
}

export function UserLink({ user }: { user: Person }) {
  return (
    <Link href={`/@${user.username}`} className="inline-flex items-center gap-1 font-medium hover:underline">
      {user.fullName}
      {user.isVerified && (
        <BadgeCheckIcon className="size-3.5 text-emerald-600" aria-label="Verified Contributor" />
      )}
    </Link>
  )
}
