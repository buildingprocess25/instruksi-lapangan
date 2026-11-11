import type { Metadata } from "next"
import { Inter, Plus_Jakarta_Sans } from "next/font/google"

import "./globals.css"
import { Navbar } from "@/components/layout/navbar"
import { ThemeProvider } from "@/components/theme-provider"
import { Toaster } from "@/components/ui/sonner"
import { cn } from "@/lib/utils"

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" })
const jakarta = Plus_Jakarta_Sans({ subsets: ["latin"], variable: "--font-jakarta" })

export const metadata: Metadata = {
  title: { default: "Warta Warga", template: "%s | Warta Warga" },
  description: "Portal berita sosial dan jurnalisme warga: tulis, repost, dan diskusikan berita.",
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"),
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="id"
      suppressHydrationWarning
      className={cn("antialiased", inter.variable, jakarta.variable, "font-sans")}
    >
      <body>
        <ThemeProvider>
          <Navbar />
          <main className="mx-auto w-full max-w-7xl px-4 py-6 lg:px-8">{children}</main>
          <Toaster richColors />
        </ThemeProvider>
      </body>
    </html>
  )
}