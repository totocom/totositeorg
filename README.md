This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Supabase schema

The initial database schema is in `supabase/schema.sql`.

Run order:

1. Open Supabase Dashboard > SQL Editor.
2. Paste the full contents of `supabase/schema.sql`.
3. Run the query once before connecting the app to Supabase.

The SQL includes `sites`, `reviews`, and `state_availability` tables, indexes,
check constraints, `updated_at` triggers, `admin_users`, and RLS policies.

## Environment variables

Copy `.env.example` to `.env.local` and fill in the values for your project.
Blog AI model names are configured only through environment variables.

```bash
OPENAI_API_KEY=
ANTHROPIC_API_KEY=

OPENAI_BLOG_PLANNER_MODEL=
OPENAI_BLOG_VALIDATOR_MODEL=
ANTHROPIC_BLOG_WRITER_MODEL=

BLOG_PROMPT_VERSION=blog-v1
BLOG_GENERATION_MAX_REVIEWS=20
BLOG_GENERATION_MAX_SCAM_REPORTS=20
```

`BLOG_PROMPT_VERSION` must match the prompt files under `prompts/blog`.
For the current prompt set, generated posts and jobs are saved with
`prompt_version = "blog-v1"`.

When updating an existing Supabase project, run the latest
`supabase/schema.sql` again in SQL Editor. The file uses `create table if not
exists`, `add column if not exists`, and `drop policy if exists` for repeatable
schema updates, including `sites.user_id`, `reviews.user_id`, and owner read
policies.

### Register an admin email

Create the user through Supabase Auth first. Then run this in Supabase SQL
Editor, replacing the email with the admin account email:

```sql
insert into public.admin_users (email)
values ('관리자이메일@example.com');
```

After registration, log in with that email to access `/admin` and perform
approve/reject actions.

### Backfill site slugs

If you already have rows in `public.sites` before adding `slug`, run this once
after `supabase/schema.sql`:

```sql
update public.sites
set slug = regexp_replace(
  trim(both '-' from lower(regexp_replace(name, '[^a-zA-Z0-9]+', '-', 'g'))),
  '-+',
  '-',
  'g'
) || '-' || substr(id::text, 1, 8)
where slug is null;
```

New site submissions generate a name-based slug with a short suffix
automatically.

### Slug rules

`sites.slug` is required and unique. It is used in public URLs such as
`/sites/example-slug`.

Rules:

- Use lowercase letters, numbers, and hyphens only.
- Do not start or end with a hyphen.
- Keep it stable after publishing because changing it changes the public URL.
- Admins can edit slugs in `/admin`, but should do so carefully.

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
