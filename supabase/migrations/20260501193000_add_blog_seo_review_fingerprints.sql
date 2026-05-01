create extension if not exists pgcrypto;

alter table public.blog_posts
  add column if not exists h1 text not null default '';

alter table public.blog_posts
  add column if not exists seo_review_status text not null default 'not_reviewed';

alter table public.blog_posts
  add column if not exists duplicate_risk text not null default 'unknown';

alter table public.blog_posts
  add column if not exists unique_fact_score integer not null default 0;

alter table public.blog_posts
  add column if not exists content_angle text not null default '';

alter table public.blog_posts
  add column if not exists normalized_title_pattern text not null default '';

alter table public.blog_posts
  add column if not exists normalized_h2_pattern text not null default '';

alter table public.blog_posts
  alter column h1 set default '';

alter table public.blog_posts
  alter column seo_review_status set default 'not_reviewed';

alter table public.blog_posts
  alter column duplicate_risk set default 'unknown';

alter table public.blog_posts
  alter column unique_fact_score set default 0;

alter table public.blog_posts
  alter column content_angle set default '';

alter table public.blog_posts
  alter column normalized_title_pattern set default '';

alter table public.blog_posts
  alter column normalized_h2_pattern set default '';

update public.blog_posts
set seo_review_status = 'not_reviewed'
where seo_review_status is null
  or seo_review_status not in ('not_reviewed', 'passed', 'warning', 'failed');

update public.blog_posts
set duplicate_risk = 'unknown'
where duplicate_risk is null
  or duplicate_risk not in ('unknown', 'low', 'medium', 'high', 'failed');

update public.blog_posts
set unique_fact_score = 0
where unique_fact_score is null
  or unique_fact_score < 0;

update public.blog_posts
set content_angle = ''
where content_angle is null;

update public.blog_posts
set normalized_title_pattern = ''
where normalized_title_pattern is null;

update public.blog_posts
set normalized_h2_pattern = ''
where normalized_h2_pattern is null;

update public.blog_posts
set h1 = title
where (h1 is null or length(trim(h1)) = 0)
  and title is not null
  and length(trim(title)) > 0;

alter table public.blog_posts
  alter column h1 set not null;

alter table public.blog_posts
  alter column seo_review_status set not null;

alter table public.blog_posts
  alter column duplicate_risk set not null;

alter table public.blog_posts
  alter column unique_fact_score set not null;

alter table public.blog_posts
  alter column content_angle set not null;

alter table public.blog_posts
  alter column normalized_title_pattern set not null;

alter table public.blog_posts
  alter column normalized_h2_pattern set not null;

do $$
begin
  alter table public.blog_posts
    drop constraint if exists blog_posts_seo_review_status_allowed;

  alter table public.blog_posts
    add constraint blog_posts_seo_review_status_allowed check (
      seo_review_status in ('not_reviewed', 'passed', 'warning', 'failed')
    );

  alter table public.blog_posts
    drop constraint if exists blog_posts_duplicate_risk_allowed;

  alter table public.blog_posts
    add constraint blog_posts_duplicate_risk_allowed check (
      duplicate_risk in ('unknown', 'low', 'medium', 'high', 'failed')
    );

  alter table public.blog_posts
    drop constraint if exists blog_posts_unique_fact_score_non_negative;

  alter table public.blog_posts
    add constraint blog_posts_unique_fact_score_non_negative check (
      unique_fact_score >= 0
    );
end $$;

create table if not exists public.blog_content_fingerprints (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.blog_posts(id) on delete cascade,
  site_id uuid not null references public.sites(id) on delete cascade,
  title_pattern text not null default '',
  h2_pattern text not null default '',
  content_hash text not null,
  normalized_content_hash text not null,
  unique_fact_score integer not null default 0,
  similarity_score numeric(5,4) not null default 0,
  created_at timestamptz not null default now(),

  constraint blog_content_fingerprints_content_hash_not_blank check (
    length(trim(content_hash)) > 0
  ),
  constraint blog_content_fingerprints_normalized_hash_not_blank check (
    length(trim(normalized_content_hash)) > 0
  ),
  constraint blog_content_fingerprints_unique_fact_score_non_negative check (
    unique_fact_score >= 0
  ),
  constraint blog_content_fingerprints_similarity_score_range check (
    similarity_score >= 0
    and similarity_score <= 1
  )
);

create index if not exists blog_posts_seo_review_status_idx
  on public.blog_posts (seo_review_status);

create index if not exists blog_posts_duplicate_risk_idx
  on public.blog_posts (duplicate_risk);

create index if not exists blog_posts_normalized_title_pattern_idx
  on public.blog_posts (normalized_title_pattern);

create index if not exists blog_content_fingerprints_post_id_idx
  on public.blog_content_fingerprints (post_id);

create index if not exists blog_content_fingerprints_site_id_idx
  on public.blog_content_fingerprints (site_id);

create index if not exists blog_content_fingerprints_title_pattern_idx
  on public.blog_content_fingerprints (title_pattern);

create index if not exists blog_content_fingerprints_h2_pattern_idx
  on public.blog_content_fingerprints (h2_pattern);

create index if not exists blog_content_fingerprints_content_hash_idx
  on public.blog_content_fingerprints (content_hash);

create index if not exists blog_content_fingerprints_normalized_hash_idx
  on public.blog_content_fingerprints (normalized_content_hash);

create index if not exists blog_content_fingerprints_created_at_idx
  on public.blog_content_fingerprints (created_at desc);

alter table public.blog_content_fingerprints enable row level security;

drop policy if exists "Admins can manage blog content fingerprints"
  on public.blog_content_fingerprints;
create policy "Admins can manage blog content fingerprints"
on public.blog_content_fingerprints
for all
using (public.is_admin())
with check (public.is_admin());
