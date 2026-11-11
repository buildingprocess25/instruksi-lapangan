"use client"

import { useTransition } from "react"
import { toast } from "sonner"

import { toggleFollowAction } from "@/actions/social.actions"
import { Button } from "@/components/ui/button"

export function FollowButton({ targetId, username, following }: { targetId: string; username: string; following: boolean }) {
  const [pending, startTransition] = useTransition()

  return (
    <Button
      variant={following ? "outline" : "default"}
      size="sm"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          const result = await toggleFollowAction(targetId, username)
          if (result?.error) toast.error(result.error)
        })
      }
    >
      {following ? "Mengikuti" : "Ikuti"}
    </Button>
  )
}
