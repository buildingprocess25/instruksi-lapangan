import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  // "@" folders are reserved for parallel routes, so /@username maps to /profil/username.
  async rewrites() {
    return [{ source: "/@:username", destination: "/profil/:username" }]
  },
}

export default nextConfig