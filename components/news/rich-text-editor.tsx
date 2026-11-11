"use client"

import StarterKit from "@tiptap/starter-kit"
import { EditorContent, useEditor } from "@tiptap/react"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export function RichTextEditor({ value, onChange }: { value: string; onChange: (html: string) => void }) {
  const editor = useEditor({
    extensions: [StarterKit.configure({ link: { openOnClick: false } })],
    content: value,
    immediatelyRender: false,
    onUpdate: ({ editor }) => onChange(editor.isEmpty ? "" : editor.getHTML()),
    editorProps: {
      attributes: {
        class: "prose prose-slate dark:prose-invert min-h-64 max-w-none rounded-b-2xl px-4 py-3 outline-none",
        "aria-label": "Isi berita",
      },
    },
  })

  if (!editor) return <div className="min-h-64 rounded-2xl border" />

  const tools = [
    { label: "B", title: "Tebal", active: editor.isActive("bold"), run: () => editor.chain().focus().toggleBold().run() },
    { label: "I", title: "Miring", active: editor.isActive("italic"), run: () => editor.chain().focus().toggleItalic().run() },
    { label: "H2", title: "Subjudul", active: editor.isActive("heading", { level: 2 }), run: () => editor.chain().focus().toggleHeading({ level: 2 }).run() },
    { label: "• List", title: "Daftar", active: editor.isActive("bulletList"), run: () => editor.chain().focus().toggleBulletList().run() },
    { label: "1. List", title: "Daftar bernomor", active: editor.isActive("orderedList"), run: () => editor.chain().focus().toggleOrderedList().run() },
    { label: "Kutipan", title: "Kutipan", active: editor.isActive("blockquote"), run: () => editor.chain().focus().toggleBlockquote().run() },
  ]

  return (
    <div className="rounded-2xl border focus-within:ring-[3px] focus-within:ring-ring/50">
      <div role="toolbar" aria-label="Format teks" className="flex flex-wrap gap-1 border-b p-2">
        {tools.map((t) => (
          <Button
            key={t.title}
            type="button"
            size="xs"
            variant={t.active ? "default" : "ghost"}
            title={t.title}
            aria-pressed={t.active}
            className={cn(t.label === "B" && "font-bold", t.label === "I" && "italic")}
            onClick={t.run}
          >
            {t.label}
          </Button>
        ))}
      </div>
      <EditorContent editor={editor} />
    </div>
  )
}
