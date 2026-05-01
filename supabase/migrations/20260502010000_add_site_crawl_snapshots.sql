create extension if not exists pgcrypto;

create table if not exists public.site_crawl_snapshots (
  id uuid primary key default gen_random_uuid(),
  site_id uuid not null references public.sites(id) on delete cascade,
  source_type text not null default 'manual_html',
  html_input_type text not null default 'unknown',
  source_url text null,
  final_url text null,
  domain text null,
  page_title text null,
  meta_description text null,
  h1 text null,
  observed_menu_labels jsonb not null default '[]'::jsonb,
  observed_account_features jsonb not null default '[]'::jsonb,
  observed_betting_features jsonb not null default '[]'::jsonb,
  observed_payment_flags jsonb not null default '[]'::jsonb,
  observed_notice_items jsonb not null default '[]'::jsonb,
  observed_event_items jsonb not null default '[]'::jsonb,
  observed_footer_text jsonb not null default '[]'::jsonb,
  observed_badges jsonb not null default '[]'::jsonb,
  image_candidates_json jsonb not null default '{"og_images":[],"twitter_images":[],"favicon_candidates":[],"logo_candidates":[],"image_alts":[]}'::jsonb,
  favicon_candidates_json jsonb not null default '[]'::jsonb,
  logo_candidates_json jsonb not null default '[]'::jsonb,
  promotional_flags_json jsonb not null default '{}'::jsonb,
  excluded_terms_json jsonb not null default '[]'::jsonb,
  screenshot_url text null,
  screenshot_thumb_url text null,
  favicon_url text null,
  logo_url text null,
  html_sha256 text null,
  visible_text_sha256 text null,
  raw_html_storage_path text null,
  snapshot_status text not null default 'draft',
  ai_detail_description_md text null,
  ai_observation_summary_json jsonb not null default '{}'::jsonb,
  collected_at timestamptz not null default now(),
  created_by uuid null references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.site_crawl_snapshots
  add column if not exists id uuid default gen_random_uuid();

update public.site_crawl_snapshots
set id = gen_random_uuid()
where id is null;

alter table public.site_crawl_snapshots
  alter column id set default gen_random_uuid();

alter table public.site_crawl_snapshots
  alter column id set not null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.site_crawl_snapshots'::regclass
      and contype = 'p'
  ) then
    alter table public.site_crawl_snapshots
      add constraint site_crawl_snapshots_pkey primary key (id);
  end if;
end $$;

alter table public.site_crawl_snapshots
  add column if not exists site_id uuid;

alter table public.site_crawl_snapshots
  add column if not exists source_type text not null default 'manual_html';

alter table public.site_crawl_snapshots
  add column if not exists html_input_type text not null default 'unknown';

alter table public.site_crawl_snapshots
  add column if not exists source_url text null;

alter table public.site_crawl_snapshots
  add column if not exists final_url text null;

alter table public.site_crawl_snapshots
  add column if not exists domain text null;

alter table public.site_crawl_snapshots
  add column if not exists page_title text null;

alter table public.site_crawl_snapshots
  add column if not exists meta_description text null;

alter table public.site_crawl_snapshots
  add column if not exists h1 text null;

alter table public.site_crawl_snapshots
  add column if not exists observed_menu_labels jsonb not null default '[]'::jsonb;

alter table public.site_crawl_snapshots
  add column if not exists observed_account_features jsonb not null default '[]'::jsonb;

alter table public.site_crawl_snapshots
  add column if not exists observed_betting_features jsonb not null default '[]'::jsonb;

alter table public.site_crawl_snapshots
  add column if not exists observed_payment_flags jsonb not null default '[]'::jsonb;

alter table public.site_crawl_snapshots
  add column if not exists observed_notice_items jsonb not null default '[]'::jsonb;

alter table public.site_crawl_snapshots
  add column if not exists observed_event_items jsonb not null default '[]'::jsonb;

alter table public.site_crawl_snapshots
  add column if not exists observed_footer_text jsonb not null default '[]'::jsonb;

alter table public.site_crawl_snapshots
  add column if not exists observed_badges jsonb not null default '[]'::jsonb;

alter table public.site_crawl_snapshots
  add column if not exists image_candidates_json jsonb not null default '{"og_images":[],"twitter_images":[],"favicon_candidates":[],"logo_candidates":[],"image_alts":[]}'::jsonb;

update public.site_crawl_snapshots
set image_candidates_json = case
  when jsonb_typeof(image_candidates_json) = 'object' then
    '{"og_images":[],"twitter_images":[],"favicon_candidates":[],"logo_candidates":[],"image_alts":[]}'::jsonb
      || image_candidates_json
  when jsonb_typeof(image_candidates_json) = 'array' then
    jsonb_build_object(
      'og_images',
      image_candidates_json,
      'twitter_images',
      '[]'::jsonb,
      'favicon_candidates',
      '[]'::jsonb,
      'logo_candidates',
      '[]'::jsonb,
      'image_alts',
      '[]'::jsonb
    )
  else
    '{"og_images":[],"twitter_images":[],"favicon_candidates":[],"logo_candidates":[],"image_alts":[]}'::jsonb
end;

alter table public.site_crawl_snapshots
  alter column image_candidates_json set default '{"og_images":[],"twitter_images":[],"favicon_candidates":[],"logo_candidates":[],"image_alts":[]}'::jsonb;

alter table public.site_crawl_snapshots
  add column if not exists favicon_candidates_json jsonb not null default '[]'::jsonb;

alter table public.site_crawl_snapshots
  add column if not exists logo_candidates_json jsonb not null default '[]'::jsonb;

alter table public.site_crawl_snapshots
  add column if not exists promotional_flags_json jsonb not null default '{}'::jsonb;

alter table public.site_crawl_snapshots
  add column if not exists excluded_terms_json jsonb not null default '[]'::jsonb;

alter table public.site_crawl_snapshots
  add column if not exists screenshot_url text null;

alter table public.site_crawl_snapshots
  add column if not exists screenshot_thumb_url text null;

alter table public.site_crawl_snapshots
  add column if not exists favicon_url text null;

alter table public.site_crawl_snapshots
  add column if not exists logo_url text null;

alter table public.site_crawl_snapshots
  add column if not exists html_sha256 text null;

alter table public.site_crawl_snapshots
  add column if not exists visible_text_sha256 text null;

alter table public.site_crawl_snapshots
  add column if not exists raw_html_storage_path text null;

alter table public.site_crawl_snapshots
  add column if not exists snapshot_status text not null default 'draft';

alter table public.site_crawl_snapshots
  add column if not exists ai_detail_description_md text null;

alter table public.site_crawl_snapshots
  add column if not exists ai_observation_summary_json jsonb not null default '{}'::jsonb;

alter table public.site_crawl_snapshots
  add column if not exists collected_at timestamptz not null default now();

alter table public.site_crawl_snapshots
  add column if not exists created_by uuid null references auth.users(id)
  on delete set null;

alter table public.site_crawl_snapshots
  add column if not exists created_at timestamptz not null default now();

alter table public.site_crawl_snapshots
  add column if not exists updated_at timestamptz not null default now();

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'site_crawl_snapshots_site_id_fkey'
      and conrelid = 'public.site_crawl_snapshots'::regclass
  ) then
    alter table public.site_crawl_snapshots
      add constraint site_crawl_snapshots_site_id_fkey
      foreign key (site_id)
      references public.sites(id)
      on delete cascade;
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'site_crawl_snapshots_created_by_fkey'
      and conrelid = 'public.site_crawl_snapshots'::regclass
  ) then
    alter table public.site_crawl_snapshots
      add constraint site_crawl_snapshots_created_by_fkey
      foreign key (created_by)
      references auth.users(id)
      on delete set null;
  end if;
end $$;

alter table public.site_crawl_snapshots
  drop constraint if exists site_crawl_snapshots_source_type_allowed;

alter table public.site_crawl_snapshots
  add constraint site_crawl_snapshots_source_type_allowed check (
    source_type in ('manual_html', 'crawler')
  );

alter table public.site_crawl_snapshots
  drop constraint if exists site_crawl_snapshots_html_input_type_allowed;

alter table public.site_crawl_snapshots
  add constraint site_crawl_snapshots_html_input_type_allowed check (
    html_input_type in ('source_html', 'rendered_html', 'unknown')
  );

alter table public.site_crawl_snapshots
  drop constraint if exists site_crawl_snapshots_status_allowed;

alter table public.site_crawl_snapshots
  add constraint site_crawl_snapshots_status_allowed check (
    snapshot_status in ('draft', 'extracted', 'ai_generated', 'approved', 'rejected')
  );

alter table public.site_crawl_snapshots
  drop constraint if exists site_crawl_snapshots_source_url_format;

alter table public.site_crawl_snapshots
  add constraint site_crawl_snapshots_source_url_format check (
    source_url is null
    or source_url ~* '^https?://'
  );

alter table public.site_crawl_snapshots
  drop constraint if exists site_crawl_snapshots_final_url_format;

alter table public.site_crawl_snapshots
  add constraint site_crawl_snapshots_final_url_format check (
    final_url is null
    or final_url ~* '^https?://'
  );

alter table public.site_crawl_snapshots
  drop constraint if exists site_crawl_snapshots_json_shapes;

alter table public.site_crawl_snapshots
  add constraint site_crawl_snapshots_json_shapes check (
    jsonb_typeof(observed_menu_labels) = 'array'
    and jsonb_typeof(observed_account_features) = 'array'
    and jsonb_typeof(observed_betting_features) = 'array'
    and jsonb_typeof(observed_payment_flags) = 'array'
    and jsonb_typeof(observed_notice_items) = 'array'
    and jsonb_typeof(observed_event_items) = 'array'
    and jsonb_typeof(observed_footer_text) = 'array'
    and jsonb_typeof(observed_badges) = 'array'
    and jsonb_typeof(image_candidates_json) = 'object'
    and jsonb_typeof(favicon_candidates_json) = 'array'
    and jsonb_typeof(logo_candidates_json) = 'array'
    and jsonb_typeof(promotional_flags_json) = 'object'
    and jsonb_typeof(excluded_terms_json) = 'array'
    and jsonb_typeof(ai_observation_summary_json) = 'object'
  );

alter table public.sites
  add column if not exists latest_crawl_snapshot_id uuid null;

alter table public.sites
  add column if not exists content_crawled_at timestamptz null;

alter table public.sites
  add column if not exists description_source_snapshot_id uuid null;

alter table public.sites
  add column if not exists description_generated_at timestamptz null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'sites_latest_crawl_snapshot_id_fkey'
      and conrelid = 'public.sites'::regclass
  ) then
    alter table public.sites
      add constraint sites_latest_crawl_snapshot_id_fkey
      foreign key (latest_crawl_snapshot_id)
      references public.site_crawl_snapshots(id)
      on delete set null;
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'sites_description_source_snapshot_id_fkey'
      and conrelid = 'public.sites'::regclass
  ) then
    alter table public.sites
      add constraint sites_description_source_snapshot_id_fkey
      foreign key (description_source_snapshot_id)
      references public.site_crawl_snapshots(id)
      on delete set null;
  end if;
end $$;

create index if not exists site_crawl_snapshots_site_id_idx
  on public.site_crawl_snapshots (site_id);

create index if not exists site_crawl_snapshots_source_type_idx
  on public.site_crawl_snapshots (source_type);

create index if not exists site_crawl_snapshots_status_idx
  on public.site_crawl_snapshots (snapshot_status);

create index if not exists site_crawl_snapshots_collected_at_idx
  on public.site_crawl_snapshots (collected_at desc);

create index if not exists site_crawl_snapshots_site_status_collected_idx
  on public.site_crawl_snapshots (site_id, snapshot_status, collected_at desc);

create index if not exists sites_latest_crawl_snapshot_id_idx
  on public.sites (latest_crawl_snapshot_id);

create index if not exists sites_description_source_snapshot_id_idx
  on public.sites (description_source_snapshot_id);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_site_crawl_snapshots_updated_at
  on public.site_crawl_snapshots;
create trigger set_site_crawl_snapshots_updated_at
before update on public.site_crawl_snapshots
for each row
execute function public.set_updated_at();

create or replace view public.site_crawl_snapshot_public as
select
  id,
  site_id,
  source_type,
  html_input_type,
  source_url,
  final_url,
  domain,
  page_title,
  meta_description,
  h1,
  observed_menu_labels,
  observed_account_features,
  observed_betting_features,
  observed_payment_flags,
  observed_notice_items,
  observed_event_items,
  observed_footer_text,
  observed_badges,
  screenshot_url,
  screenshot_thumb_url,
  favicon_url,
  logo_url,
  ai_detail_description_md,
  ai_observation_summary_json,
  collected_at,
  created_at,
  updated_at
from public.site_crawl_snapshots
where snapshot_status = 'approved';

grant select on public.site_crawl_snapshot_public to anon, authenticated;
grant select, insert, update, delete on public.site_crawl_snapshots to authenticated;
revoke all on public.site_crawl_snapshots from anon;

alter table public.site_crawl_snapshots enable row level security;

drop policy if exists "Admins can manage site crawl snapshots"
  on public.site_crawl_snapshots;
create policy "Admins can manage site crawl snapshots"
on public.site_crawl_snapshots
for all
using (public.is_admin())
with check (public.is_admin());
