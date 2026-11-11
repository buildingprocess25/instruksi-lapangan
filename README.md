# Warta Warga — Social News App

Next.js (App Router) + Tailwind + shadcn/ui + Prisma + Supabase (PostgreSQL + Auth) + Google Drive (image storage).

## Setup

1. `npm install`
2. Copy `.env.example` to `.env`, fill Supabase + Google Drive service account values.
   Share the Drive folder with the service account `client_email` as **Editor**.
3. Supabase: enable Email and Google providers; add `http://localhost:3000/auth/callback` to redirect URLs.
4. `npm run db:migrate` then `npm run db:seed` (seeds navbar categories).
5. `npm run dev`

First user: sign up, then set `role = 'ADMIN'` on your row in `User` (SQL editor). Admins/moderators manage headlines and categories at `/admin`.

## Scripts

`dev`, `build`, `lint`, `typecheck`, `test`, `db:migrate`, `db:seed`.

## Notes

- Mutations: Form/Client → Server Action → `services/*` → Prisma. Business logic lives in `services/`.
- Images: `POST /api/media/upload` (sharp → WebP ≤ 5 MB → Drive), `GET /api/media/[fileId]` (immutable cached proxy).
- `/@username` is rewritten to `/profil/[username]` (`@` folders are reserved in the App Router).
- Article HTML is sanitized with DOMPurify on save and on render.
- Trust score: like +1, repost +3 for the author; ≥ 50 earns the Verified Contributor badge.
