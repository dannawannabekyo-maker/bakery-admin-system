# Bakery Order & Administration System

Next.js 15 (App Router) + Supabase. A customer storefront (shop, cart, checkout)
plus role-based **admin**, **sales**, and **production** dashboards.

## Setup

```bash
npm install
cp .env.local.example .env.local   # fill in your Supabase URL + keys
npm run db:seed                    # apply migrations + seed data
npm run user:create owner@example.com "Str0ng!Pass" ADMIN "Owner"
npm run dev
```

## Stack

- Next.js 15, React 19, TypeScript, Tailwind v4
- Supabase (Postgres, Auth, Storage, RLS)
- Schema, triggers, RLS, and storage buckets as SQL migrations in `supabase/migrations/`

## Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Start the dev server |
| `npm run build` | Production build |
| `npm run db:push` | Apply SQL migrations |
| `npm run db:seed` | Apply migrations + `supabase/seed.sql` |
| `npm run user:create` | Create/promote a user via the Supabase Admin API |
