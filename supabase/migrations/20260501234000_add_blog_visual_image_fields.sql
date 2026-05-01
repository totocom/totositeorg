alter table public.sites
  add column if not exists logo_url text null;

alter table public.blog_posts
  add column if not exists featured_image_url text null;

alter table public.blog_posts
  add column if not exists featured_image_alt text null;

alter table public.blog_posts
  add column if not exists featured_image_caption text null;

alter table public.blog_posts
  add column if not exists featured_image_captured_at timestamptz null;

alter table public.blog_posts
  add column if not exists site_logo_url text null;

alter table public.blog_posts
  add column if not exists site_logo_alt text null;

alter table public.blog_posts
  drop constraint if exists blog_posts_featured_image_alt_not_blank;

alter table public.blog_posts
  add constraint blog_posts_featured_image_alt_not_blank check (
    featured_image_alt is null
    or length(trim(featured_image_alt)) > 0
  );

alter table public.blog_posts
  drop constraint if exists blog_posts_featured_image_caption_not_blank;

alter table public.blog_posts
  add constraint blog_posts_featured_image_caption_not_blank check (
    featured_image_caption is null
    or length(trim(featured_image_caption)) > 0
  );

alter table public.blog_posts
  drop constraint if exists blog_posts_site_logo_alt_not_blank;

alter table public.blog_posts
  add constraint blog_posts_site_logo_alt_not_blank check (
    site_logo_alt is null
    or length(trim(site_logo_alt)) > 0
  );
