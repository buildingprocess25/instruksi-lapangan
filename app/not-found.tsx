import Link from "next/link"

export default function NotFound() {
  return (
    <div className="flex flex-col items-center gap-4 py-24 text-center">
      <h1 className="font-heading text-4xl font-extrabold">404</h1>
      <p className="text-slate-600 dark:text-slate-400">Halaman tidak ditemukan.</p>
      <Link href="/" className="text-blue-600 hover:underline">Kembali ke beranda</Link>
    </div>
  )
}
