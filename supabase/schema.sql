-- Supabase schema for the Korean online betting/casino review information platform.
--
-- How to run:
-- 1. Open Supabase Dashboard > SQL Editor.
-- 2. Paste this entire file into a new query.
-- 3. Run it once for a fresh project before connecting the app client.
--
-- Notes:
-- - Admin users are matched by email in public.admin_users.
-- - Register admin emails manually in SQL Editor after creating auth users.

create extension if not exists pgcrypto;

create table if not exists public.sites (
  id uuid primary key default gen_random_uuid(),
  user_id uuid null references auth.users(id) on delete set null,
  slug text null,
  name text not null,
  name_ko text null,
  name_en text null,
  url text not null,
  domains text[] not null default '{}',
  screenshot_url text null,
  screenshot_thumb_url text null,
  favicon_url text null,
  -- TODO: category is no longer exposed in the site registration UI.
  -- Keep the column temporarily for existing data compatibility.
  category text not null default '기타 베팅',
  available_states text[] not null default '{}',
  -- TODO: license_info is no longer exposed in the site registration UI.
  -- Keep the column temporarily for existing data compatibility.
  license_info text not null default '관리자 등록 사이트',
  status text not null default 'pending',
  description text not null,
  contact_telegram text null,
  telegram_chat_id text null,
  telegram_notify_enabled boolean not null default false,
  telegram_notified_at timestamptz null,
  resolved_ips text[] not null default '{}',
  dns_checked_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint sites_url_unique unique (url),
  constraint sites_slug_unique unique (slug),
  constraint sites_name_not_blank check (length(trim(name)) > 0),
  constraint sites_slug_format check (
    slug is null
    or slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'
  ),
  constraint sites_url_format check (url ~* '^https?://'),
  constraint sites_available_states_not_empty check (
    cardinality(available_states) > 0
  ),
  constraint sites_status_allowed check (
    status in ('pending', 'approved', 'rejected')
  ),
  constraint sites_description_length check (
    length(trim(description)) >= 10
  )
);

create table if not exists public.reviews (
  id uuid primary key default gen_random_uuid(),
  site_id uuid not null references public.sites(id) on delete cascade,
  user_id uuid null references auth.users(id) on delete set null,
  rating integer not null,
  title text not null,
  experience text not null,
  issue_type text not null,
  reviewer_name text null,
  reviewer_email text null,
  status text not null default 'pending',
  helpful_count integer not null default 0,
  not_helpful_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint reviews_rating_range check (rating between 1 and 5),
  constraint reviews_title_not_blank check (length(trim(title)) > 0),
  constraint reviews_experience_length check (
    length(trim(experience)) >= 30
  ),
  constraint reviews_issue_type_allowed check (
    issue_type in (
      'general',
      'payment',
      'kyc',
      'support',
      'app_ux',
      'bonus_terms',
      'account_limit',
      'other'
    )
  ),
  constraint reviews_email_format check (
    reviewer_email is null
    or reviewer_email = ''
    or reviewer_email ~* '^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$'
  ),
  constraint reviews_status_allowed check (
    status in ('pending', 'approved', 'rejected')
  ),
  constraint reviews_helpful_count_non_negative check (
    helpful_count >= 0
  ),
  constraint reviews_not_helpful_count_non_negative check (
    not_helpful_count >= 0
  )
);

create table if not exists public.scam_reports (
  id uuid primary key default gen_random_uuid(),
  site_id uuid not null references public.sites(id) on delete cascade,
  user_id uuid null references auth.users(id) on delete set null,
  incident_date date not null,
  usage_period text not null,
  main_category text not null,
  category_items text[] not null default '{}',
  category_etc_text text null,
  damage_types text[] not null default '{}',
  damage_type_etc_text text null,
  damage_amount numeric null,
  damage_amount_unknown boolean not null default false,
  situation_description text not null,
  deposit_bank_name text null,
  deposit_account_number text null,
  deposit_account_holder text null,
  deposit_amount numeric null,
  deposit_date date null,
  evidence_image_urls text[] not null default '{}',
  evidence_note text null,
  contact_telegram text null,
  is_contact_public boolean not null default false,
  privacy_masking_agreement boolean not null default false,
  false_report_agreement boolean not null default false,
  review_status text not null default 'pending',
  is_published boolean not null default false,
  admin_memo text null,
  reject_reason text null,
  duplicate_report_id uuid null references public.scam_reports(id) on delete set null,
  representative_image_url text null,
  submitter_ip text null,
  user_agent text null,
  reviewed_at timestamptz null,
  approved_at timestamptz null,
  published_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint scam_reports_usage_period_not_blank check (length(trim(usage_period)) > 0),
  constraint scam_reports_main_category_not_blank check (length(trim(main_category)) > 0),
  constraint scam_reports_damage_types_not_empty check (cardinality(damage_types) > 0),
  constraint scam_reports_damage_amount_required check (
    damage_amount_unknown = true
    or damage_amount is not null
  ),
  constraint scam_reports_description_length check (
    length(trim(situation_description)) >= 50
  ),
  constraint scam_reports_privacy_agreed check (privacy_masking_agreement = true),
  constraint scam_reports_false_report_agreed check (false_report_agreement = true),
  constraint scam_reports_review_status_allowed check (
    review_status in ('pending', 'approved', 'rejected')
  )
);

alter table public.sites
  add column if not exists user_id uuid null references auth.users(id)
  on delete set null;

alter table public.sites
  add column if not exists slug text null;

alter table public.sites
  add column if not exists name_ko text null;

alter table public.sites
  add column if not exists name_en text null;

alter table public.sites
  add column if not exists domains text[] not null default '{}';

alter table public.sites
  add column if not exists screenshot_url text null;

alter table public.sites
  add column if not exists screenshot_thumb_url text null;

alter table public.sites
  add column if not exists favicon_url text null;

alter table public.sites
  add column if not exists contact_telegram text null;

alter table public.sites
  add column if not exists telegram_chat_id text null;

alter table public.sites
  add column if not exists telegram_notify_enabled boolean not null default false;

alter table public.sites
  add column if not exists telegram_notified_at timestamptz null;

alter table public.sites
  add column if not exists resolved_ips text[] not null default '{}';

alter table public.sites
  add column if not exists dns_checked_at timestamptz null;

alter table public.sites
  alter column category set default '기타 베팅';

alter table public.sites
  alter column license_info set default '관리자 등록 사이트';

update public.sites
set domains = array[url]
where cardinality(domains) = 0;

update public.sites
set category = '기타 베팅'
where category is null
  or length(trim(category)) = 0;

update public.sites
set license_info = '관리자 등록 사이트'
where license_info is null
  or length(trim(license_info)) = 0;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'sites_slug_unique'
      and conrelid = 'public.sites'::regclass
  ) then
    alter table public.sites
      add constraint sites_slug_unique unique (slug);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'sites_slug_format'
      and conrelid = 'public.sites'::regclass
  ) then
    alter table public.sites
      add constraint sites_slug_format check (
        slug is null
        or slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'
      );
  end if;
end $$;

do $$
begin
  alter table public.sites
    drop constraint if exists sites_category_allowed;

  alter table public.sites
    drop constraint if exists sites_license_info_not_blank;
end $$;

alter table public.reviews
  add column if not exists user_id uuid null references auth.users(id)
  on delete set null;

alter table public.reviews
  add column if not exists helpful_count integer not null default 0;

alter table public.reviews
  add column if not exists not_helpful_count integer not null default 0;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'reviews_helpful_count_non_negative'
      and conrelid = 'public.reviews'::regclass
  ) then
    alter table public.reviews
      add constraint reviews_helpful_count_non_negative check (
        helpful_count >= 0
      );
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'reviews_not_helpful_count_non_negative'
      and conrelid = 'public.reviews'::regclass
  ) then
    alter table public.reviews
      add constraint reviews_not_helpful_count_non_negative check (
        not_helpful_count >= 0
      );
  end if;
end $$;

alter table public.reviews
  drop constraint if exists reviews_state_used_not_blank;

alter table public.reviews
  drop column if exists state_used;

alter table public.scam_reports
  add column if not exists site_id uuid not null references public.sites(id)
  on delete cascade;

alter table public.scam_reports
  drop column if exists site_name;

alter table public.scam_reports
  drop column if exists used_domain;

create table if not exists public.state_availability (
  id uuid primary key default gen_random_uuid(),
  site_id uuid not null references public.sites(id) on delete cascade,
  state_code text not null,
  state_name text not null,
  availability_status text not null,
  regulator_info text null,
  updated_at timestamptz not null default now(),

  constraint state_availability_site_state_unique unique (site_id, state_code),
  constraint state_availability_state_code_format check (
    state_code ~ '^[A-Z]{2}$'
  ),
  constraint state_availability_state_name_not_blank check (
    length(trim(state_name)) > 0
  ),
  constraint state_availability_status_allowed check (
    availability_status in (
      'available',
      'limited',
      'not_available',
      'unknown'
    )
  )
);

create table if not exists public.admin_users (
  id uuid primary key default gen_random_uuid(),
  email text unique not null,
  created_at timestamptz not null default now(),

  constraint admin_users_email_format check (
    email ~* '^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$'
  )
);

create table if not exists public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  username text unique not null,
  nickname text not null,
  signup_ip text null,
  signup_user_agent text null,
  telegram_verified_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint profiles_username_format check (
    username ~ '^[a-z0-9_]{4,20}$'
  ),
  constraint profiles_nickname_not_blank check (
    length(trim(nickname)) > 0
  ),
  constraint profiles_nickname_length check (
    char_length(trim(nickname)) between 2 and 20
  )
);

create table if not exists public.admin_ip_allowlist (
  ip_address text primary key,
  label text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint admin_ip_allowlist_ip_not_blank check (
    length(trim(ip_address)) > 0
  )
);

alter table public.profiles
  add column if not exists signup_ip text null;

alter table public.profiles
  add column if not exists signup_user_agent text null;

create table if not exists public.telegram_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  chat_id text unique not null,
  username text null,
  first_name text null,
  last_name text null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint telegram_subscriptions_user_unique unique (user_id),
  constraint telegram_subscriptions_chat_id_not_blank check (
    length(trim(chat_id)) > 0
  )
);

create table if not exists public.telegram_signup_codes (
  id uuid primary key default gen_random_uuid(),
  verification_code text unique not null,
  chat_id text not null,
  username text null,
  first_name text null,
  last_name text null,
  expires_at timestamptz not null,
  consumed_at timestamptz null,
  created_at timestamptz not null default now(),

  constraint telegram_signup_codes_code_format check (
    verification_code ~ '^[A-Z0-9]{8}$'
  ),
  constraint telegram_signup_codes_chat_id_not_blank check (
    length(trim(chat_id)) > 0
  )
);

create table if not exists public.site_telegram_subscriptions (
  id uuid primary key default gen_random_uuid(),
  site_id uuid not null references public.sites(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),

  constraint site_telegram_subscriptions_site_user_unique unique (site_id, user_id)
);

create table if not exists public.domain_whois_cache (
  domain text primary key,
  payload jsonb not null,
  fetched_at timestamptz not null default now(),
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint domain_whois_cache_domain_format check (
    domain ~ '^[a-z0-9.-]+\.[a-z]{2,}$'
  )
);

create table if not exists public.site_dns_records (
  id uuid primary key default gen_random_uuid(),
  site_id uuid not null references public.sites(id) on delete cascade,
  domain_url text not null,
  domain text not null,
  a_records text[] not null default '{}',
  aaaa_records text[] not null default '{}',
  cname_records text[] not null default '{}',
  mx_records text[] not null default '{}',
  ns_records text[] not null default '{}',
  txt_records text[] not null default '{}',
  soa_record text not null default '',
  error_message text not null default '',
  checked_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint site_dns_records_site_domain_unique unique (site_id, domain),
  constraint site_dns_records_domain_url_not_blank check (
    length(trim(domain_url)) > 0
  ),
  constraint site_dns_records_domain_not_blank check (
    length(trim(domain)) > 0
  )
);

create table if not exists public.site_domain_submissions (
  id uuid primary key default gen_random_uuid(),
  site_id uuid not null references public.sites(id) on delete cascade,
  user_id uuid null references auth.users(id) on delete set null,
  domain_url text not null,
  status text not null default 'pending',
  admin_memo text null,
  reviewed_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint site_domain_submissions_domain_url_format check (
    domain_url ~* '^https?://'
  ),
  constraint site_domain_submissions_status_allowed check (
    status in ('pending', 'approved', 'rejected')
  )
);

create table if not exists public.review_helpfulness_votes (
  id uuid primary key default gen_random_uuid(),
  review_id uuid not null references public.reviews(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  vote smallint not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint review_helpfulness_votes_review_user_unique unique (review_id, user_id),
  constraint review_helpfulness_votes_vote_allowed check (vote in (-1, 1))
);

create table if not exists public.blog_posts (
  id uuid primary key default gen_random_uuid(),
  site_id uuid not null references public.sites(id) on delete cascade,
  slug text not null unique,
  status text not null default 'draft',
  title text not null,
  h1 text not null default '',
  meta_title text null,
  meta_description text null,
  primary_keyword text null,
  secondary_keywords text[] not null default '{}',
  body_md text not null default '',
  faq_json jsonb not null default '[]'::jsonb,
  checklist_json jsonb not null default '[]'::jsonb,
  source_snapshot_id uuid null,
  ai_provider text null,
  ai_model text null,
  prompt_version text null,
  legal_review_status text not null default 'not_reviewed',
  seo_review_status text not null default 'not_reviewed',
  duplicate_risk text not null default 'unknown',
  unique_fact_score integer not null default 0,
  content_angle text not null default '',
  normalized_title_pattern text not null default '',
  normalized_h2_pattern text not null default '',
  admin_warnings text[] not null default '{}',
  reviewed_by uuid null references auth.users(id) on delete set null,
  published_at timestamptz null,

  -- Compatibility columns used by the existing blog manager and public pages.
  category text not null default '운영 정보',
  primary_category text not null default 'site-reports',
  secondary_categories text[] not null default '{}',
  tags text[] not null default '{}',
  priority text not null default '중',
  description text not null default '',
  search_intent text not null default '',
  reader_question text not null default '',
  recommended_title_pattern text not null default '',
  summary text not null default '',
  content_updated_at date not null default current_date,
  reading_minutes integer not null default 3,
  internal_links jsonb not null default '[]'::jsonb,
  sections jsonb not null default '[]'::jsonb,
  checklist text[] not null default '{}',
  faqs jsonb not null default '[]'::jsonb,
  source_site_id uuid null references public.sites(id) on delete set null,
  source_snapshot jsonb not null default '{}'::jsonb,
  ai_generated_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint blog_posts_slug_format check (
    slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'
  ),
  constraint blog_posts_status_allowed check (
    status in ('draft', 'published', 'archived')
  ),
  constraint blog_posts_legal_review_status_allowed check (
    legal_review_status in ('not_reviewed', 'needs_review', 'approved')
  ),
  constraint blog_posts_seo_review_status_allowed check (
    seo_review_status in ('not_reviewed', 'passed', 'warning', 'failed')
  ),
  constraint blog_posts_duplicate_risk_allowed check (
    duplicate_risk in ('unknown', 'low', 'medium', 'high', 'failed')
  ),
  constraint blog_posts_needs_review_not_published check (
    not (
      status = 'published'
      and legal_review_status = 'needs_review'
    )
  ),
  constraint blog_posts_priority_allowed check (
    priority in ('상', '중', '하')
  ),
  constraint blog_posts_primary_category_allowed check (
    primary_category in (
      'site-reports',
      'domain-dns',
      'scam-reports',
      'user-reviews',
      'change-history',
      'verification-guide',
      'checklists',
      'announcements'
    )
  ),
  constraint blog_posts_secondary_categories_allowed check (
    secondary_categories <@ array[
      'site-reports',
      'domain-dns',
      'scam-reports',
      'user-reviews',
      'change-history',
      'verification-guide',
      'checklists',
      'announcements'
    ]::text[]
  ),
  constraint blog_posts_title_not_blank check (length(trim(title)) > 0),
  constraint blog_posts_unique_fact_score_non_negative check (
    unique_fact_score >= 0
  ),
  constraint blog_posts_meta_title_not_blank check (
    meta_title is null
    or length(trim(meta_title)) > 0
  ),
  constraint blog_posts_faq_json_array check (
    jsonb_typeof(faq_json) = 'array'
  ),
  constraint blog_posts_checklist_json_array check (
    jsonb_typeof(checklist_json) = 'array'
  ),
  constraint blog_posts_reading_minutes_positive check (reading_minutes > 0),
  constraint blog_posts_internal_links_array check (
    jsonb_typeof(internal_links) = 'array'
  ),
  constraint blog_posts_sections_array check (
    jsonb_typeof(sections) = 'array'
  ),
  constraint blog_posts_faqs_array check (
    jsonb_typeof(faqs) = 'array'
  ),
  constraint blog_posts_source_snapshot_object check (
    jsonb_typeof(source_snapshot) = 'object'
  )
);

alter table public.blog_posts
  add column if not exists site_id uuid null references public.sites(id)
  on delete cascade;

alter table public.blog_posts
  add column if not exists source_site_id uuid null references public.sites(id)
  on delete set null;

alter table public.blog_posts
  add column if not exists meta_description text null;

alter table public.blog_posts
  add column if not exists h1 text not null default '';

alter table public.blog_posts
  add column if not exists body_md text not null default '';

alter table public.blog_posts
  add column if not exists faq_json jsonb not null default '[]'::jsonb;

alter table public.blog_posts
  add column if not exists checklist_json jsonb not null default '[]'::jsonb;

alter table public.blog_posts
  add column if not exists source_snapshot_id uuid null;

alter table public.blog_posts
  add column if not exists ai_provider text null;

alter table public.blog_posts
  add column if not exists prompt_version text null;

alter table public.blog_posts
  add column if not exists legal_review_status text not null default 'not_reviewed';

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
  add column if not exists admin_warnings text[] not null default '{}';

alter table public.blog_posts
  add column if not exists reviewed_by uuid null references auth.users(id)
  on delete set null;

alter table public.blog_posts
  add column if not exists source_snapshot jsonb not null default '{}'::jsonb;

alter table public.blog_posts
  add column if not exists ai_generated_at timestamptz null;

alter table public.blog_posts
  add column if not exists ai_model text null;

alter table public.blog_posts
  add column if not exists primary_category text not null default 'site-reports';

alter table public.blog_posts
  add column if not exists secondary_categories text[] not null default '{}';

alter table public.blog_posts
  add column if not exists tags text[] not null default '{}';

alter table public.blog_posts
  alter column meta_title drop not null;

alter table public.blog_posts
  alter column primary_keyword drop not null;

alter table public.blog_posts
  alter column h1 set default '';

alter table public.blog_posts
  alter column category set default '운영 정보';

alter table public.blog_posts
  alter column primary_category set default 'site-reports';

alter table public.blog_posts
  alter column secondary_categories set default '{}';

alter table public.blog_posts
  alter column tags set default '{}';

alter table public.blog_posts
  alter column description set default '';

alter table public.blog_posts
  alter column legal_review_status set default 'not_reviewed';

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

alter table public.blog_posts
  alter column body_md set default '';

alter table public.blog_posts
  alter column faq_json set default '[]'::jsonb;

alter table public.blog_posts
  alter column checklist_json set default '[]'::jsonb;

alter table public.blog_posts
  alter column published_at type timestamptz
  using published_at::timestamptz;

update public.blog_posts
set site_id = source_site_id
where site_id is null
  and source_site_id is not null;

update public.blog_posts
set meta_description = description
where meta_description is null
  and description is not null
  and length(trim(description)) > 0;

update public.blog_posts
set h1 = title
where (h1 is null or length(trim(h1)) = 0)
  and title is not null
  and length(trim(title)) > 0;

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

update public.blog_posts
set faq_json = faqs
where jsonb_typeof(faqs) = 'array'
  and faq_json = '[]'::jsonb
  and faqs <> '[]'::jsonb;

update public.blog_posts
set checklist_json = coalesce(
  (
    select jsonb_agg(
      jsonb_build_object(
        'item',
        checklist_item,
        'reason',
        ''
      )
    )
    from unnest(checklist) as checklist_item
    where length(trim(checklist_item)) > 0
  ),
  '[]'::jsonb
)
where checklist_json = '[]'::jsonb
  and cardinality(checklist) > 0;

do $$
begin
  drop trigger if exists set_blog_post_primary_category_id_on_change
    on public.blog_posts;

  drop trigger if exists sync_blog_post_taxonomy_on_change
    on public.blog_posts;

  alter table public.blog_posts
    drop constraint if exists blog_posts_primary_category_allowed;

  alter table public.blog_posts
    drop constraint if exists blog_posts_secondary_categories_allowed;
end $$;

update public.blog_posts
set primary_category = case
  when source_site_id is not null or site_id is not null then 'site-reports'
  when category = '검증 기준' then 'verification-guide'
  when category = '피해 예방' then 'scam-reports'
  when category = '후기 해석' then 'user-reviews'
  when category = '운영 정보' then 'domain-dns'
  when category = '토토사이트 정보 리포트' then 'site-reports'
  when category = '도메인·DNS 분석' then 'domain-dns'
  when category = '먹튀 제보 현황' then 'scam-reports'
  when category = '이용자 리뷰 요약' then 'user-reviews'
  when category = '변경 이력 리포트' then 'change-history'
  when category = '검증 기준 안내' then 'verification-guide'
  when category = '이용 전 체크리스트' then 'checklists'
  when category = '공지 및 운영 안내' then 'announcements'
  else primary_category
end
where primary_category is null
  or primary_category = 'site-reports';

update public.blog_posts
set primary_category = 'scam-reports'
where primary_category = 'public-reports';

update public.blog_posts
set secondary_categories = array_replace(
  secondary_categories,
  'public-reports',
  'scam-reports'
)
where secondary_categories @> array['public-reports']::text[];

update public.blog_posts
set tags = array_remove(tags, 'public-reports')
where tags @> array['public-reports']::text[];

update public.blog_posts
set primary_category = case
  when primary_category in (
    'site-reports',
    'domain-dns',
    'scam-reports',
    'user-reviews',
    'change-history',
    'verification-guide',
    'checklists',
    'announcements'
  ) then primary_category
  when primary_category = 'public-reports' then 'scam-reports'
  when primary_category = '검증 기준' then 'verification-guide'
  when primary_category = '피해 예방' then 'scam-reports'
  when primary_category = '후기 해석' then 'user-reviews'
  when primary_category = '운영 정보' then 'domain-dns'
  when primary_category = '토토사이트 정보 리포트' then 'site-reports'
  when primary_category = '도메인·DNS 분석' then 'domain-dns'
  when primary_category = '먹튀 제보 현황' then 'scam-reports'
  when primary_category = '이용자 리뷰 요약' then 'user-reviews'
  when primary_category = '변경 이력 리포트' then 'change-history'
  when primary_category = '검증 기준 안내' then 'verification-guide'
  when primary_category = '이용 전 체크리스트' then 'checklists'
  when primary_category = '공지 및 운영 안내' then 'announcements'
  when category = '검증 기준' then 'verification-guide'
  when category = '피해 예방' then 'scam-reports'
  when category = '후기 해석' then 'user-reviews'
  when category = '운영 정보' then 'domain-dns'
  when category = '토토사이트 정보 리포트' then 'site-reports'
  when category = '도메인·DNS 분석' then 'domain-dns'
  when category = '먹튀 제보 현황' then 'scam-reports'
  when category = '이용자 리뷰 요약' then 'user-reviews'
  when category = '변경 이력 리포트' then 'change-history'
  when category = '검증 기준 안내' then 'verification-guide'
  when category = '이용 전 체크리스트' then 'checklists'
  when category = '공지 및 운영 안내' then 'announcements'
  else 'site-reports'
end
where primary_category is null
  or primary_category not in (
    'site-reports',
    'domain-dns',
    'scam-reports',
    'user-reviews',
    'change-history',
    'verification-guide',
    'checklists',
    'announcements'
  );

update public.blog_posts
set secondary_categories = coalesce(
  (
    select array_agg(distinct normalized_secondary_category)
    from (
      select case
        when secondary_category = 'public-reports' then 'scam-reports'
        else secondary_category
      end as normalized_secondary_category
      from unnest(secondary_categories) as secondary_category
    ) as normalized_secondary_categories
    where normalized_secondary_category in (
      'site-reports',
      'domain-dns',
      'scam-reports',
      'user-reviews',
      'change-history',
      'verification-guide',
      'checklists',
      'announcements'
    )
  ),
  '{}'::text[]
)
where exists (
    select 1
    from unnest(secondary_categories) as secondary_category
    where secondary_category is null
      or secondary_category = 'public-reports'
      or secondary_category not in (
        'site-reports',
        'domain-dns',
        'scam-reports',
        'user-reviews',
        'change-history',
        'verification-guide',
        'checklists',
        'announcements'
      )
  );

do $$
begin
  alter table public.blog_posts
    drop constraint if exists blog_posts_status_allowed;

  alter table public.blog_posts
    add constraint blog_posts_status_allowed check (
      status in ('draft', 'published', 'archived')
    );

  alter table public.blog_posts
    drop constraint if exists blog_posts_legal_review_status_allowed;

  update public.blog_posts
  set legal_review_status = case legal_review_status
    when 'not_required' then 'not_reviewed'
    when 'reviewed' then 'approved'
    when 'approved' then 'approved'
    when 'needs_review' then 'needs_review'
    else 'not_reviewed'
  end;

  alter table public.blog_posts
    add constraint blog_posts_legal_review_status_allowed check (
      legal_review_status in ('not_reviewed', 'needs_review', 'approved')
    );

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

  alter table public.blog_posts
    drop constraint if exists blog_posts_needs_review_not_published;

  alter table public.blog_posts
    add constraint blog_posts_needs_review_not_published check (
      not (
        status = 'published'
        and legal_review_status = 'needs_review'
      )
    );

  alter table public.blog_posts
    drop constraint if exists blog_posts_meta_title_not_blank;

  alter table public.blog_posts
    add constraint blog_posts_meta_title_not_blank check (
      meta_title is null
      or length(trim(meta_title)) > 0
    );

  alter table public.blog_posts
    drop constraint if exists blog_posts_description_not_blank;

  alter table public.blog_posts
    add constraint blog_posts_description_not_blank check (
      description = ''
      or length(trim(description)) > 0
    );

  alter table public.blog_posts
    drop constraint if exists blog_posts_primary_category_allowed;

  update public.blog_posts
  set primary_category = lower(trim(primary_category))
  where primary_category is not null
    and primary_category <> lower(trim(primary_category));

  update public.blog_posts
  set primary_category = case
    when primary_category in (
      'site-reports',
      'domain-dns',
      'scam-reports',
      'user-reviews',
      'change-history',
      'verification-guide',
      'checklists',
      'announcements'
    ) then primary_category
    when primary_category in ('public-reports', 'public_reports') then 'scam-reports'
    when primary_category = '검증 기준' then 'verification-guide'
    when primary_category = '피해 예방' then 'scam-reports'
    when primary_category = '후기 해석' then 'user-reviews'
    when primary_category = '운영 정보' then 'domain-dns'
    when primary_category = '토토사이트 정보 리포트' then 'site-reports'
    when primary_category = '도메인·dns 분석' then 'domain-dns'
    when primary_category = '먹튀 제보 현황' then 'scam-reports'
    when primary_category = '이용자 리뷰 요약' then 'user-reviews'
    when primary_category = '변경 이력 리포트' then 'change-history'
    when primary_category = '검증 기준 안내' then 'verification-guide'
    when primary_category = '이용 전 체크리스트' then 'checklists'
    when primary_category = '공지 및 운영 안내' then 'announcements'
    when category = '검증 기준' then 'verification-guide'
    when category = '피해 예방' then 'scam-reports'
    when category = '후기 해석' then 'user-reviews'
    when category = '운영 정보' then 'domain-dns'
    when category = '토토사이트 정보 리포트' then 'site-reports'
    when category = '도메인·DNS 분석' then 'domain-dns'
    when category = '먹튀 제보 현황' then 'scam-reports'
    when category = '이용자 리뷰 요약' then 'user-reviews'
    when category = '변경 이력 리포트' then 'change-history'
    when category = '검증 기준 안내' then 'verification-guide'
    when category = '이용 전 체크리스트' then 'checklists'
    when category = '공지 및 운영 안내' then 'announcements'
    else 'site-reports'
  end
  where primary_category is null
    or primary_category not in (
      'site-reports',
      'domain-dns',
      'scam-reports',
      'user-reviews',
      'change-history',
      'verification-guide',
      'checklists',
      'announcements'
    );

  alter table public.blog_posts
    add constraint blog_posts_primary_category_allowed check (
      primary_category in (
        'site-reports',
        'domain-dns',
        'scam-reports',
        'user-reviews',
        'change-history',
        'verification-guide',
        'checklists',
        'announcements'
      )
    );

  alter table public.blog_posts
    drop constraint if exists blog_posts_secondary_categories_allowed;

  update public.blog_posts
  set secondary_categories = coalesce(
    (
      select array_agg(distinct normalized_secondary_category)
      from (
        select case
          when secondary_category_slug in ('public-reports', 'public_reports')
            then 'scam-reports'
          when secondary_category_slug = '검증 기준' then 'verification-guide'
          when secondary_category_slug = '피해 예방' then 'scam-reports'
          when secondary_category_slug = '후기 해석' then 'user-reviews'
          when secondary_category_slug = '운영 정보' then 'domain-dns'
          when secondary_category_slug = '토토사이트 정보 리포트' then 'site-reports'
          when secondary_category_slug = '도메인·dns 분석' then 'domain-dns'
          when secondary_category_slug = '먹튀 제보 현황' then 'scam-reports'
          when secondary_category_slug = '이용자 리뷰 요약' then 'user-reviews'
          when secondary_category_slug = '변경 이력 리포트' then 'change-history'
          when secondary_category_slug = '검증 기준 안내' then 'verification-guide'
          when secondary_category_slug = '이용 전 체크리스트' then 'checklists'
          when secondary_category_slug = '공지 및 운영 안내' then 'announcements'
          else secondary_category_slug
        end as normalized_secondary_category
        from (
          select lower(trim(secondary_category)) as secondary_category_slug
          from unnest(coalesce(secondary_categories, '{}'::text[])) as secondary_category
          where secondary_category is not null
            and length(trim(secondary_category)) > 0
        ) as raw_secondary_categories
      ) as normalized_secondary_categories
      where normalized_secondary_category in (
          'site-reports',
          'domain-dns',
          'scam-reports',
          'user-reviews',
          'change-history',
          'verification-guide',
          'checklists',
          'announcements'
        )
        and normalized_secondary_category <> primary_category
    ),
    '{}'::text[]
  );

  alter table public.blog_posts
    add constraint blog_posts_secondary_categories_allowed check (
      secondary_categories <@ array[
        'site-reports',
        'domain-dns',
        'scam-reports',
        'user-reviews',
        'change-history',
        'verification-guide',
        'checklists',
        'announcements'
      ]::text[]
    );

  if not exists (
    select 1
    from pg_constraint
    where conname = 'blog_posts_source_snapshot_object'
      and conrelid = 'public.blog_posts'::regclass
  ) then
    alter table public.blog_posts
      add constraint blog_posts_source_snapshot_object check (
        jsonb_typeof(source_snapshot) = 'object'
      );
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'blog_posts_faq_json_array'
      and conrelid = 'public.blog_posts'::regclass
  ) then
    alter table public.blog_posts
      add constraint blog_posts_faq_json_array check (
        jsonb_typeof(faq_json) = 'array'
      );
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'blog_posts_checklist_json_array'
      and conrelid = 'public.blog_posts'::regclass
  ) then
    alter table public.blog_posts
      add constraint blog_posts_checklist_json_array check (
        jsonb_typeof(checklist_json) = 'array'
      );
  end if;
end $$;

create table if not exists public.blog_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  description text null,
  meta_title text null,
  meta_description text null,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint blog_categories_name_not_blank check (length(trim(name)) > 0),
  constraint blog_categories_slug_format check (
    slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'
  ),
  constraint blog_categories_meta_title_not_blank check (
    meta_title is null
    or length(trim(meta_title)) > 0
  ),
  constraint blog_categories_meta_description_not_blank check (
    meta_description is null
    or length(trim(meta_description)) > 0
  )
);

alter table public.blog_posts
  add column if not exists primary_category_id uuid null
  references public.blog_categories(id)
  on delete set null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'blog_posts_primary_category_id_fkey'
      and conrelid = 'public.blog_posts'::regclass
  ) then
    alter table public.blog_posts
      add constraint blog_posts_primary_category_id_fkey
      foreign key (primary_category_id)
      references public.blog_categories(id)
      on delete set null;
  end if;
end $$;

create table if not exists public.blog_post_categories (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.blog_posts(id) on delete cascade,
  category_id uuid not null references public.blog_categories(id) on delete cascade,
  is_primary boolean not null default false,
  created_at timestamptz not null default now(),

  constraint blog_post_categories_post_category_unique unique (post_id, category_id)
);

create table if not exists public.blog_tags (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  description text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint blog_tags_name_not_blank check (length(trim(name)) > 0),
  constraint blog_tags_slug_format check (
    slug ~ '^[a-z0-9가-힣]+(?:-[a-z0-9가-힣]+)*$'
  ),
  constraint blog_tags_description_not_blank check (
    description is null
    or length(trim(description)) > 0
  )
);

create table if not exists public.blog_post_tags (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.blog_posts(id) on delete cascade,
  tag_id uuid not null references public.blog_tags(id) on delete cascade,
  created_at timestamptz not null default now(),

  constraint blog_post_tags_post_tag_unique unique (post_id, tag_id)
);

create or replace function public.normalize_blog_taxonomy_slug(value text)
returns text
language sql
immutable
as $$
  select trim(both '-' from regexp_replace(
    regexp_replace(lower(trim(coalesce(value, ''))), '[^a-z0-9가-힣]+', '-', 'g'),
    '-+',
    '-',
    'g'
  ));
$$;

do $$
declare
  old_category_id uuid;
  new_category_id uuid;
begin
  select id
  into old_category_id
  from public.blog_categories
  where slug = 'public-reports'
  limit 1;

  select id
  into new_category_id
  from public.blog_categories
  where slug = 'scam-reports'
  limit 1;

  if old_category_id is not null and new_category_id is null then
    update public.blog_categories
    set
      slug = 'scam-reports',
      updated_at = now()
    where id = old_category_id;
  elsif old_category_id is not null
    and new_category_id is not null
    and old_category_id <> new_category_id then
    update public.blog_posts
    set primary_category_id = new_category_id
    where primary_category_id = old_category_id;

    insert into public.blog_post_categories (
      post_id,
      category_id,
      is_primary,
      created_at
    )
    select
      post_id,
      new_category_id,
      is_primary,
      created_at
    from public.blog_post_categories
    where category_id = old_category_id
    on conflict (post_id, category_id) do update
    set is_primary = excluded.is_primary;

    delete from public.blog_post_categories
    where category_id = old_category_id;

    delete from public.blog_categories
    where id = old_category_id;
  end if;
end $$;

insert into public.blog_categories (
  name,
  slug,
  description,
  meta_title,
  meta_description,
  sort_order,
  is_active
)
values
  (
    '토토사이트 정보 리포트',
    'site-reports',
    '이 카테고리는 개별 사이트의 도메인, DNS, WHOIS, 승인된 리뷰와 먹튀 피해 제보 현황을 종합 정리한 정보 리포트를 모아둔 페이지입니다.',
    '토토사이트 정보 리포트 | 도메인·DNS·먹튀 제보 현황',
    '개별 토토사이트별 도메인, DNS, WHOIS, 승인 리뷰와 먹튀 제보 현황을 정리한 정보 리포트 모음입니다.',
    1,
    true
  ),
  (
    '도메인·DNS 분석',
    'domain-dns',
    '도메인, DNS 레코드, WHOIS 등록 정보, 네임서버, IP 관측값처럼 기술적으로 확인 가능한 데이터를 기준으로 사이트별 변화를 정리합니다.',
    '도메인·DNS 분석 | WHOIS·네임서버 정보',
    '도메인, DNS 레코드, WHOIS, 네임서버, IP 관측 정보를 기준으로 정리한 분석 글 모음입니다.',
    2,
    true
  ),
  (
    '먹튀 제보 현황',
    'scam-reports',
    '승인된 먹튀 피해 제보와 관련 집계, 피해 유형, 접수 시점 정보를 모아 사이트 이용 전 확인할 수 있는 제보 현황을 정리합니다.',
    '먹튀 제보 현황 | 승인된 피해 제보 정리',
    '승인된 먹튀 제보 현황과 관련 데이터를 정리한 글 모음입니다.',
    3,
    true
  ),
  (
    '이용자 리뷰 요약',
    'user-reviews',
    '승인된 이용자 리뷰를 바탕으로 결제, 고객지원, 계정 제한, 앱 사용성 등 실제 이용 경험에서 반복되는 신호를 카테고리별로 요약합니다.',
    '이용자 리뷰 요약 | 승인 리뷰 기반 정보',
    '승인된 이용자 리뷰를 바탕으로 이용 경험과 공개 평가 데이터를 정리한 글 모음입니다.',
    4,
    true
  ),
  (
    '변경 이력 리포트',
    'change-history',
    '도메인 추가, DNS/WHOIS 갱신, 승인 리뷰와 먹튀 제보 증가처럼 사이트 정보가 바뀐 항목을 시간순으로 추적해 변화 흐름을 정리합니다.',
    '변경 이력 리포트 | 도메인·DNS·제보 업데이트',
    '사이트별 도메인, DNS, WHOIS, 리뷰, 먹튀 제보 변경 이력을 정리한 글 모음입니다.',
    5,
    true
  ),
  (
    '검증 기준 안내',
    'verification-guide',
    '리뷰 승인 기준, 먹튀 피해 제보 검토 방식, DNS/WHOIS 조회 기준 등 서비스가 확인 데이터를 수집하고 해석하는 운영 원칙을 안내합니다.',
    '검증 기준 안내 | 리뷰·제보·DNS 조회 기준',
    '리뷰 승인, 먹튀 제보 검토, DNS/WHOIS 조회 방식과 정보 해석 기준을 안내합니다.',
    6,
    true
  ),
  (
    '이용 전 체크리스트',
    'checklists',
    '사이트 이용 전 확인할 도메인, DNS, WHOIS, 승인 리뷰, 먹튀 피해 제보 항목을 단계별 체크리스트로 정리해 사전 확인 흐름을 제공합니다.',
    '이용 전 체크리스트 | 정보 확인 항목',
    '도메인, DNS, WHOIS, 먹튀 제보, 리뷰 등 이용 전 확인할 수 있는 정보 항목을 정리합니다.',
    7,
    true
  ),
  (
    '공지 및 운영 안내',
    'announcements',
    '서비스 운영 정책, 기능 업데이트, 검토 기준 변경과 같은 공지성 내용을 모아 이용자가 중요한 변경 사항을 빠르게 확인하도록 안내합니다.',
    '공지 및 운영 안내',
    '서비스 운영 정책, 기능 업데이트, 검토 기준 변경 사항을 안내합니다.',
    8,
    true
  )
on conflict (slug) do update
set
  name = excluded.name,
  description = excluded.description,
  meta_title = excluded.meta_title,
  meta_description = excluded.meta_description,
  sort_order = excluded.sort_order,
  is_active = excluded.is_active,
  updated_at = now();

update public.blog_posts
set primary_category_id = blog_categories.id
from public.blog_categories
where blog_categories.slug = coalesce(nullif(blog_posts.primary_category, ''), 'site-reports')
  and blog_posts.primary_category_id is distinct from blog_categories.id;

update public.blog_post_categories
set is_primary = false
where is_primary = true
  and exists (
    select 1
    from public.blog_posts
    where blog_posts.id = blog_post_categories.post_id
  );

insert into public.blog_post_categories (
  post_id,
  category_id,
  is_primary
)
select
  blog_posts.id,
  blog_categories.id,
  true
from public.blog_posts
join public.blog_categories
  on blog_categories.slug = coalesce(nullif(blog_posts.primary_category, ''), 'site-reports')
on conflict (post_id, category_id) do update
set is_primary = true;

insert into public.blog_post_categories (
  post_id,
  category_id,
  is_primary
)
select distinct
  blog_posts.id,
  blog_categories.id,
  false
from public.blog_posts
cross join lateral unnest(blog_posts.secondary_categories) as secondary_category_slug
join public.blog_categories
  on blog_categories.slug = secondary_category_slug
where secondary_category_slug <> coalesce(nullif(blog_posts.primary_category, ''), 'site-reports')
on conflict (post_id, category_id) do nothing;

with ranked_primary_blog_categories as (
  select
    id,
    row_number() over (
      partition by post_id
      order by created_at desc, id desc
    ) as primary_rank
  from public.blog_post_categories
  where is_primary = true
)
update public.blog_post_categories
set is_primary = false
from ranked_primary_blog_categories
where blog_post_categories.id = ranked_primary_blog_categories.id
  and ranked_primary_blog_categories.primary_rank > 1;

with raw_blog_tags as (
  select distinct
    trim(tag_value) as name
  from public.blog_posts
  cross join lateral unnest(blog_posts.tags) as tag_value
  where length(trim(tag_value)) > 0
),
normalized_blog_tags as (
  select distinct on (slug)
    name,
    slug
  from (
    select
      name,
      public.normalize_blog_taxonomy_slug(name) as slug
    from raw_blog_tags
  ) as normalized
  where length(slug) > 0
    and not exists (
      select 1
      from public.blog_categories
      where blog_categories.slug = normalized.slug
        or blog_categories.name = normalized.name
    )
  order by slug, name
)
insert into public.blog_tags (
  name,
  slug
)
select
  name,
  slug
from normalized_blog_tags
on conflict (slug) do update
set
  name = excluded.name,
  updated_at = now();

with post_blog_tags as (
  select distinct
    blog_posts.id as post_id,
    public.normalize_blog_taxonomy_slug(tag_value) as tag_slug
  from public.blog_posts
  cross join lateral unnest(blog_posts.tags) as tag_value
  where length(trim(tag_value)) > 0
)
insert into public.blog_post_tags (
  post_id,
  tag_id
)
select
  post_blog_tags.post_id,
  blog_tags.id
from post_blog_tags
join public.blog_tags
  on blog_tags.slug = post_blog_tags.tag_slug
on conflict (post_id, tag_id) do nothing;

create table if not exists public.blog_source_snapshots (
  id uuid primary key default gen_random_uuid(),
  site_id uuid not null references public.sites(id) on delete cascade,
  snapshot_at timestamptz not null default now(),

  site_json jsonb not null,
  domains_json jsonb not null default '[]'::jsonb,
  dns_records_json jsonb not null default '[]'::jsonb,
  whois_json jsonb not null default '[]'::jsonb,

  reviews_summary_json jsonb not null default '{}'::jsonb,
  scam_reports_summary_json jsonb not null default '{}'::jsonb,
  derived_facts_json jsonb not null default '{}'::jsonb,

  pii_redaction_version text not null default 'v1',
  created_at timestamptz not null default now(),

  constraint blog_source_snapshots_site_object check (
    jsonb_typeof(site_json) = 'object'
  ),
  constraint blog_source_snapshots_domains_array check (
    jsonb_typeof(domains_json) = 'array'
  ),
  constraint blog_source_snapshots_dns_records_array check (
    jsonb_typeof(dns_records_json) = 'array'
  ),
  constraint blog_source_snapshots_whois_array check (
    jsonb_typeof(whois_json) = 'array'
  ),
  constraint blog_source_snapshots_reviews_summary_object check (
    jsonb_typeof(reviews_summary_json) = 'object'
  ),
  constraint blog_source_snapshots_scam_reports_summary_object check (
    jsonb_typeof(scam_reports_summary_json) = 'object'
  ),
  constraint blog_source_snapshots_derived_facts_object check (
    jsonb_typeof(derived_facts_json) = 'object'
  ),
  constraint blog_source_snapshots_pii_redaction_version_not_blank check (
    length(trim(pii_redaction_version)) > 0
  )
);

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'blog_posts_source_snapshot_id_fkey'
      and conrelid = 'public.blog_posts'::regclass
  ) then
    alter table public.blog_posts
      add constraint blog_posts_source_snapshot_id_fkey
      foreign key (source_snapshot_id)
      references public.blog_source_snapshots(id)
      on delete set null;
  end if;
end $$;

create table if not exists public.blog_post_versions (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.blog_posts(id) on delete cascade,
  version_no integer not null,
  title text not null,
  meta_title text null,
  meta_description text null,
  body_md text not null,
  faq_json jsonb not null default '[]'::jsonb,
  checklist_json jsonb not null default '[]'::jsonb,
  change_summary text null,
  source_snapshot_id uuid null references public.blog_source_snapshots(id)
    on delete set null,
  ai_generation_job_id uuid null,
  created_by uuid null references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),

  constraint blog_post_versions_post_version_unique unique (post_id, version_no),
  constraint blog_post_versions_version_no_positive check (version_no > 0),
  constraint blog_post_versions_title_not_blank check (length(trim(title)) > 0),
  constraint blog_post_versions_body_md_not_blank check (length(trim(body_md)) > 0),
  constraint blog_post_versions_faq_json_array check (
    jsonb_typeof(faq_json) = 'array'
  ),
  constraint blog_post_versions_checklist_json_array check (
    jsonb_typeof(checklist_json) = 'array'
  )
);

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

create table if not exists public.ai_generation_jobs (
  id uuid primary key default gen_random_uuid(),
  site_id uuid not null references public.sites(id) on delete cascade,
  post_id uuid null references public.blog_posts(id) on delete set null,
  job_type text not null,
  status text not null default 'queued',
  provider text not null,
  openai_model text null,
  anthropic_model text null,
  prompt_version text not null,
  source_snapshot_id uuid null references public.blog_source_snapshots(id)
    on delete set null,
  input_tokens integer null,
  output_tokens integer null,
  error_message text null,
  idempotency_key text not null unique,
  created_by uuid null references auth.users(id) on delete set null,
  started_at timestamptz null,
  finished_at timestamptz null,
  created_at timestamptz not null default now(),

  constraint ai_generation_jobs_job_type_allowed check (
    job_type in ('create', 'update', 'validate')
  ),
  constraint ai_generation_jobs_status_allowed check (
    status in ('queued', 'running', 'succeeded', 'failed')
  ),
  constraint ai_generation_jobs_provider_allowed check (
    provider in ('openai', 'anthropic', 'mixed')
  ),
  constraint ai_generation_jobs_prompt_version_not_blank check (
    length(trim(prompt_version)) > 0
  ),
  constraint ai_generation_jobs_idempotency_key_not_blank check (
    length(trim(idempotency_key)) > 0
  ),
  constraint ai_generation_jobs_input_tokens_non_negative check (
    input_tokens is null
    or input_tokens >= 0
  ),
  constraint ai_generation_jobs_output_tokens_non_negative check (
    output_tokens is null
    or output_tokens >= 0
  )
);

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'blog_post_versions_ai_generation_job_id_fkey'
      and conrelid = 'public.blog_post_versions'::regclass
  ) then
    alter table public.blog_post_versions
      add constraint blog_post_versions_ai_generation_job_id_fkey
      foreign key (ai_generation_job_id)
      references public.ai_generation_jobs(id)
      on delete set null;
  end if;
end $$;

create index if not exists sites_status_idx
  on public.sites (status);

create index if not exists sites_user_id_idx
  on public.sites (user_id);

create index if not exists sites_slug_idx
  on public.sites (slug);

create index if not exists sites_domains_idx
  on public.sites using gin (domains);

create index if not exists sites_resolved_ips_idx
  on public.sites using gin (resolved_ips);

create index if not exists sites_category_idx
  on public.sites (category);

create index if not exists sites_created_at_idx
  on public.sites (created_at desc);

create index if not exists reviews_site_id_idx
  on public.reviews (site_id);

create index if not exists reviews_user_id_idx
  on public.reviews (user_id);

-- Existing projects may already contain duplicate user/site review rows
-- from before the unique ownership rule was added. Keep the newest row and
-- remove older duplicates so each user can own one review per site.
with ranked_duplicate_reviews as (
  select
    id,
    row_number() over (
      partition by user_id, site_id
      order by created_at desc, id desc
    ) as duplicate_rank
  from public.reviews
  where user_id is not null
)
delete from public.reviews
using ranked_duplicate_reviews
where reviews.id = ranked_duplicate_reviews.id
  and ranked_duplicate_reviews.duplicate_rank > 1;

create unique index if not exists reviews_user_site_unique_idx
  on public.reviews (user_id, site_id)
  where user_id is not null;

create index if not exists reviews_status_idx
  on public.reviews (status);

create index if not exists reviews_issue_type_idx
  on public.reviews (issue_type);

create index if not exists reviews_created_at_idx
  on public.reviews (created_at desc);

create index if not exists scam_reports_site_id_idx
  on public.scam_reports (site_id);

create index if not exists scam_reports_user_id_idx
  on public.scam_reports (user_id);

-- Existing projects may already contain duplicate user/site scam report rows.
-- Keep the newest row and remove older duplicates so each user can own one
-- scam report per site.
with ranked_duplicate_scam_reports as (
  select
    id,
    row_number() over (
      partition by user_id, site_id
      order by created_at desc, id desc
    ) as duplicate_rank
  from public.scam_reports
  where user_id is not null
)
delete from public.scam_reports
using ranked_duplicate_scam_reports
where scam_reports.id = ranked_duplicate_scam_reports.id
  and ranked_duplicate_scam_reports.duplicate_rank > 1;

create unique index if not exists scam_reports_user_site_unique_idx
  on public.scam_reports (user_id, site_id)
  where user_id is not null;

create index if not exists scam_reports_review_status_idx
  on public.scam_reports (review_status);

create index if not exists scam_reports_is_published_idx
  on public.scam_reports (is_published);

create index if not exists scam_reports_created_at_idx
  on public.scam_reports (created_at desc);

create index if not exists state_availability_site_id_idx
  on public.state_availability (site_id);

create index if not exists state_availability_state_code_idx
  on public.state_availability (state_code);

create index if not exists admin_users_email_idx
  on public.admin_users (lower(email));

create index if not exists profiles_username_idx
  on public.profiles (lower(username));

create unique index if not exists profiles_username_unique_lower_idx
  on public.profiles (lower(username));

create unique index if not exists profiles_nickname_unique_lower_idx
  on public.profiles (lower(nickname));

create index if not exists profiles_signup_ip_idx
  on public.profiles (signup_ip);

create index if not exists admin_ip_allowlist_ip_idx
  on public.admin_ip_allowlist (ip_address);

create index if not exists telegram_subscriptions_user_id_idx
  on public.telegram_subscriptions (user_id);

create index if not exists telegram_subscriptions_chat_id_idx
  on public.telegram_subscriptions (chat_id);

create index if not exists telegram_signup_codes_code_idx
  on public.telegram_signup_codes (verification_code);

create index if not exists site_telegram_subscriptions_site_id_idx
  on public.site_telegram_subscriptions (site_id);

create index if not exists site_telegram_subscriptions_user_id_idx
  on public.site_telegram_subscriptions (user_id);

create index if not exists domain_whois_cache_expires_at_idx
  on public.domain_whois_cache (expires_at);

create index if not exists site_dns_records_site_id_idx
  on public.site_dns_records (site_id);

create index if not exists site_dns_records_domain_idx
  on public.site_dns_records (domain);

create index if not exists site_dns_records_a_records_idx
  on public.site_dns_records using gin (a_records);

create index if not exists site_dns_records_aaaa_records_idx
  on public.site_dns_records using gin (aaaa_records);

create index if not exists site_domain_submissions_site_id_idx
  on public.site_domain_submissions (site_id);

create index if not exists site_domain_submissions_user_id_idx
  on public.site_domain_submissions (user_id);

create index if not exists site_domain_submissions_status_idx
  on public.site_domain_submissions (status);

create index if not exists review_helpfulness_votes_review_id_idx
  on public.review_helpfulness_votes (review_id);

create index if not exists review_helpfulness_votes_user_id_idx
  on public.review_helpfulness_votes (user_id);

create index if not exists blog_posts_status_idx
  on public.blog_posts (status);

create index if not exists blog_posts_legal_review_status_idx
  on public.blog_posts (legal_review_status);

create index if not exists blog_posts_seo_review_status_idx
  on public.blog_posts (seo_review_status);

create index if not exists blog_posts_duplicate_risk_idx
  on public.blog_posts (duplicate_risk);

create index if not exists blog_posts_normalized_title_pattern_idx
  on public.blog_posts (normalized_title_pattern);

create index if not exists blog_posts_site_id_idx
  on public.blog_posts (site_id);

create index if not exists blog_posts_category_idx
  on public.blog_posts (category);

create index if not exists blog_posts_primary_category_idx
  on public.blog_posts (primary_category);

create index if not exists blog_posts_primary_category_id_idx
  on public.blog_posts (primary_category_id);

create index if not exists blog_posts_secondary_categories_idx
  on public.blog_posts using gin (secondary_categories);

create index if not exists blog_posts_tags_idx
  on public.blog_posts using gin (tags);

create index if not exists blog_categories_slug_idx
  on public.blog_categories (slug);

create index if not exists blog_categories_active_sort_idx
  on public.blog_categories (is_active, sort_order, name);

create index if not exists blog_post_categories_post_id_idx
  on public.blog_post_categories (post_id);

create index if not exists blog_post_categories_category_id_idx
  on public.blog_post_categories (category_id);

create unique index if not exists blog_post_categories_one_primary_idx
  on public.blog_post_categories (post_id)
  where is_primary = true;

create index if not exists blog_tags_slug_idx
  on public.blog_tags (slug);

create index if not exists blog_post_tags_post_id_idx
  on public.blog_post_tags (post_id);

create index if not exists blog_post_tags_tag_id_idx
  on public.blog_post_tags (tag_id);

create index if not exists blog_posts_published_at_idx
  on public.blog_posts (published_at desc);

create index if not exists blog_posts_updated_at_idx
  on public.blog_posts (updated_at desc);

create index if not exists blog_posts_source_site_id_idx
  on public.blog_posts (source_site_id);

create index if not exists blog_posts_source_snapshot_id_idx
  on public.blog_posts (source_snapshot_id);

create unique index if not exists blog_posts_source_site_unique_idx
  on public.blog_posts (source_site_id)
  where source_site_id is not null;

create index if not exists blog_source_snapshots_site_id_idx
  on public.blog_source_snapshots (site_id);

create index if not exists blog_source_snapshots_snapshot_at_idx
  on public.blog_source_snapshots (snapshot_at desc);

create index if not exists blog_post_versions_post_id_idx
  on public.blog_post_versions (post_id);

create index if not exists blog_post_versions_source_snapshot_id_idx
  on public.blog_post_versions (source_snapshot_id);

create index if not exists blog_post_versions_ai_generation_job_id_idx
  on public.blog_post_versions (ai_generation_job_id);

create index if not exists blog_post_versions_created_at_idx
  on public.blog_post_versions (created_at desc);

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

create index if not exists ai_generation_jobs_site_id_idx
  on public.ai_generation_jobs (site_id);

create index if not exists ai_generation_jobs_post_id_idx
  on public.ai_generation_jobs (post_id);

create index if not exists ai_generation_jobs_status_idx
  on public.ai_generation_jobs (status);

create unique index if not exists ai_generation_jobs_active_site_unique_idx
  on public.ai_generation_jobs (site_id)
  where status in ('queued', 'running');

create index if not exists ai_generation_jobs_source_snapshot_id_idx
  on public.ai_generation_jobs (source_snapshot_id);

create index if not exists ai_generation_jobs_created_at_idx
  on public.ai_generation_jobs (created_at desc);

do $$
begin
  if exists (
    select 1
    from pg_class
    join pg_namespace on pg_namespace.oid = pg_class.relnamespace
    where pg_namespace.nspname = 'public'
      and pg_class.relname = 'public_profile_nicknames'
      and pg_class.relkind = 'v'
  ) then
    drop view public.public_profile_nicknames;
  end if;
end $$;

create table if not exists public.public_profile_nicknames (
  user_id uuid primary key references auth.users(id) on delete cascade,
  nickname text not null,
  updated_at timestamptz not null default now(),

  constraint public_profile_nicknames_nickname_not_blank check (
    length(trim(nickname)) > 0
  )
);

insert into public.public_profile_nicknames (user_id, nickname)
select
  profiles.user_id,
  profiles.nickname
from public.profiles
where length(trim(profiles.nickname)) > 0
on conflict (user_id) do update
set
  nickname = excluded.nickname,
  updated_at = now();

grant select on public.public_profile_nicknames to anon, authenticated;

drop view if exists public.review_helpfulness_counts;

update public.reviews
set
  helpful_count = coalesce(votes.helpful_count, 0),
  not_helpful_count = coalesce(votes.not_helpful_count, 0)
from (
  select
    review_id,
    count(*) filter (where vote = 1)::integer as helpful_count,
    count(*) filter (where vote = -1)::integer as not_helpful_count
  from public.review_helpfulness_votes
  group by review_id
) as votes
where reviews.id = votes.review_id;

update public.reviews
set
  helpful_count = 0,
  not_helpful_count = 0
where not exists (
  select 1
  from public.review_helpfulness_votes
  where review_helpfulness_votes.review_id = reviews.id
);

do $$
begin
  if exists (
    select 1
    from pg_class
    join pg_namespace on pg_namespace.oid = pg_class.relnamespace
    where pg_namespace.nspname = 'public'
      and pg_class.relname = 'site_telegram_subscription_counts'
      and pg_class.relkind = 'v'
  ) then
    drop view public.site_telegram_subscription_counts;
  end if;
end $$;

create table if not exists public.site_telegram_subscription_counts (
  site_id uuid primary key references public.sites(id) on delete cascade,
  subscriber_count integer not null default 0,
  updated_at timestamptz not null default now(),

  constraint site_telegram_subscription_counts_non_negative check (
    subscriber_count >= 0
  )
);

insert into public.site_telegram_subscription_counts (site_id, subscriber_count)
select
  site_id,
  count(*)::integer as subscriber_count
from public.site_telegram_subscriptions
group by site_id
on conflict (site_id) do update
set
  subscriber_count = excluded.subscriber_count,
  updated_at = now();

grant select on public.site_telegram_subscription_counts to anon, authenticated;

update public.sites
set slug = regexp_replace(
  trim(both '-' from lower(regexp_replace(name, '[^a-zA-Z0-9]+', '-', 'g'))),
  '-+',
  '-',
  'g'
) || '-' || substr(id::text, 1, 8)
where slug is null;

alter table public.sites
  alter column slug set not null;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_sites_updated_at on public.sites;
create trigger set_sites_updated_at
before update on public.sites
for each row
execute function public.set_updated_at();

drop trigger if exists set_reviews_updated_at on public.reviews;
create trigger set_reviews_updated_at
before update on public.reviews
for each row
execute function public.set_updated_at();

drop trigger if exists set_scam_reports_updated_at on public.scam_reports;
create trigger set_scam_reports_updated_at
before update on public.scam_reports
for each row
execute function public.set_updated_at();

drop trigger if exists set_state_availability_updated_at
  on public.state_availability;
create trigger set_state_availability_updated_at
before update on public.state_availability
for each row
execute function public.set_updated_at();

drop trigger if exists set_telegram_subscriptions_updated_at
  on public.telegram_subscriptions;
create trigger set_telegram_subscriptions_updated_at
before update on public.telegram_subscriptions
for each row
execute function public.set_updated_at();

drop trigger if exists set_profiles_updated_at on public.profiles;
create trigger set_profiles_updated_at
before update on public.profiles
for each row
execute function public.set_updated_at();

drop trigger if exists set_admin_ip_allowlist_updated_at
  on public.admin_ip_allowlist;
create trigger set_admin_ip_allowlist_updated_at
before update on public.admin_ip_allowlist
for each row
execute function public.set_updated_at();

drop trigger if exists set_domain_whois_cache_updated_at
  on public.domain_whois_cache;
create trigger set_domain_whois_cache_updated_at
before update on public.domain_whois_cache
for each row
execute function public.set_updated_at();

drop trigger if exists set_site_dns_records_updated_at
  on public.site_dns_records;
create trigger set_site_dns_records_updated_at
before update on public.site_dns_records
for each row
execute function public.set_updated_at();

drop trigger if exists set_site_domain_submissions_updated_at
  on public.site_domain_submissions;
create trigger set_site_domain_submissions_updated_at
before update on public.site_domain_submissions
for each row
execute function public.set_updated_at();

drop trigger if exists set_review_helpfulness_votes_updated_at
  on public.review_helpfulness_votes;
create trigger set_review_helpfulness_votes_updated_at
before update on public.review_helpfulness_votes
for each row
execute function public.set_updated_at();

drop trigger if exists set_blog_posts_updated_at on public.blog_posts;
create trigger set_blog_posts_updated_at
before update on public.blog_posts
for each row
execute function public.set_updated_at();

drop trigger if exists set_blog_categories_updated_at
  on public.blog_categories;
create trigger set_blog_categories_updated_at
before update on public.blog_categories
for each row
execute function public.set_updated_at();

drop trigger if exists set_blog_tags_updated_at on public.blog_tags;
create trigger set_blog_tags_updated_at
before update on public.blog_tags
for each row
execute function public.set_updated_at();

create or replace function public.set_blog_post_primary_category_id()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  selected_category public.blog_categories%rowtype;
begin
  if new.primary_category_id is not null then
    select *
    into selected_category
    from public.blog_categories
    where blog_categories.id = new.primary_category_id
    limit 1;

    if found then
      new.primary_category := selected_category.slug;
      new.category := selected_category.name;
      return new;
    end if;
  end if;

  select *
  into selected_category
  from public.blog_categories
  where blog_categories.slug = coalesce(nullif(new.primary_category, ''), 'site-reports')
  limit 1;

  if found then
    new.primary_category_id := selected_category.id;
    new.primary_category := selected_category.slug;
    new.category := selected_category.name;
  else
    new.primary_category_id := null;
  end if;

  return new;
end;
$$;

drop trigger if exists set_blog_post_primary_category_id_on_change
  on public.blog_posts;
create trigger set_blog_post_primary_category_id_on_change
before insert or update of
  primary_category,
  primary_category_id
on public.blog_posts
for each row
execute function public.set_blog_post_primary_category_id();

create or replace function public.sync_blog_post_taxonomy()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  primary_category_slug text;
  tag_name text;
  tag_slug text;
  synced_tag_id uuid;
begin
  delete from public.blog_post_categories
  where post_id = new.id;

  delete from public.blog_post_tags
  where post_id = new.id;

  primary_category_slug := coalesce(nullif(new.primary_category, ''), 'site-reports');

  insert into public.blog_post_categories (
    post_id,
    category_id,
    is_primary
  )
  select
    new.id,
    blog_categories.id,
    true
  from public.blog_categories
  where blog_categories.slug = primary_category_slug
  on conflict (post_id, category_id) do update
  set is_primary = true;

  insert into public.blog_post_categories (
    post_id,
    category_id,
    is_primary
  )
  select distinct
    new.id,
    blog_categories.id,
    false
  from unnest(new.secondary_categories) as secondary_category_slug
  join public.blog_categories
    on blog_categories.slug = secondary_category_slug
  where secondary_category_slug <> primary_category_slug
  on conflict (post_id, category_id) do nothing;

  for tag_name in
    select distinct trim(tag_value)
    from unnest(new.tags) as tag_value
    where length(trim(tag_value)) > 0
  loop
    tag_slug := public.normalize_blog_taxonomy_slug(tag_name);

    if tag_slug = '' then
      continue;
    end if;

    if exists (
      select 1
      from public.blog_categories
      where blog_categories.slug = tag_slug
        or blog_categories.name = tag_name
    ) then
      continue;
    end if;

    insert into public.blog_tags (
      name,
      slug
    )
    values (
      tag_name,
      tag_slug
    )
    on conflict (slug) do update
    set
      name = excluded.name,
      updated_at = now()
    returning id into synced_tag_id;

    insert into public.blog_post_tags (
      post_id,
      tag_id
    )
    values (
      new.id,
      synced_tag_id
    )
    on conflict (post_id, tag_id) do nothing;
  end loop;

  return new;
end;
$$;

drop trigger if exists sync_blog_post_taxonomy_on_change
  on public.blog_posts;
create trigger sync_blog_post_taxonomy_on_change
after insert or update of
  primary_category,
  primary_category_id,
  secondary_categories,
  tags
on public.blog_posts
for each row
execute function public.sync_blog_post_taxonomy();

create or replace function public.enforce_blog_post_publish_requirements()
returns trigger
language plpgsql
as $$
declare
  prohibited_phrase_check jsonb;
begin
  if new.status <> 'published' then
    return new;
  end if;

  if tg_op = 'INSERT' then
    raise exception 'blog_posts_publish_requires_draft_status';
  end if;

  if old.status = 'published' then
    return new;
  end if;

  if old.status <> 'draft' then
    raise exception 'blog_posts_publish_requires_draft_status';
  end if;

  if new.legal_review_status <> 'approved' then
    raise exception 'blog_posts_publish_requires_approved_legal_review';
  end if;

  if new.seo_review_status = 'failed' then
    raise exception 'blog_posts_publish_blocked_seo_review_failed';
  end if;

  if new.duplicate_risk = 'high' then
    raise exception 'blog_posts_publish_blocked_duplicate_risk_high';
  end if;

  if new.duplicate_risk = 'failed' then
    raise exception 'blog_posts_publish_blocked_duplicate_risk_failed';
  end if;

  if new.unique_fact_score < 5 then
    raise exception 'blog_posts_publish_requires_unique_fact_score_minimum';
  end if;

  if length(trim(coalesce(new.title, ''))) = 0 then
    raise exception 'blog_posts_publish_requires_title';
  end if;

  if length(trim(coalesce(new.meta_title, ''))) = 0 then
    raise exception 'blog_posts_publish_requires_meta_title';
  end if;

  if length(trim(coalesce(new.meta_description, ''))) = 0 then
    raise exception 'blog_posts_publish_requires_meta_description';
  end if;

  if length(trim(coalesce(new.h1, ''))) = 0 then
    raise exception 'blog_posts_publish_requires_h1';
  end if;

  if length(trim(coalesce(new.body_md, ''))) = 0 then
    raise exception 'blog_posts_publish_requires_body_md';
  end if;

  if new.primary_category_id is null then
    raise exception 'blog_posts_publish_requires_primary_category_id';
  end if;

  if new.source_snapshot_id is null then
    raise exception 'blog_posts_publish_requires_source_snapshot_id';
  end if;

  prohibited_phrase_check := case
    when jsonb_typeof(new.source_snapshot -> 'prohibitedPhraseCheck') = 'object'
      then new.source_snapshot -> 'prohibitedPhraseCheck'
    when jsonb_typeof(new.source_snapshot #> '{finalReview,prohibited_phrase_check}') = 'object'
      then new.source_snapshot #> '{finalReview,prohibited_phrase_check}'
    else null
  end;

  if prohibited_phrase_check is null
    or prohibited_phrase_check ->> 'contains_recommendation' is distinct from 'false'
    or prohibited_phrase_check ->> 'contains_signup_cta' is distinct from 'false'
    or prohibited_phrase_check ->> 'contains_bonus_or_event_promo' is distinct from 'false'
    or prohibited_phrase_check ->> 'contains_absolute_safety_claim' is distinct from 'false'
    or prohibited_phrase_check ->> 'contains_uncited_claims' is distinct from 'false'
    or prohibited_phrase_check ->> 'contains_access_facilitation' is distinct from 'false' then
    raise exception 'blog_posts_publish_requires_clean_prohibited_phrase_check';
  end if;

  return new;
end;
$$;

drop trigger if exists enforce_blog_post_publish_requirements_on_change
  on public.blog_posts;
create trigger enforce_blog_post_publish_requirements_on_change
before insert or update of
  status,
  legal_review_status,
  seo_review_status,
  duplicate_risk,
  unique_fact_score,
  title,
  meta_title,
  meta_description,
  h1,
  body_md,
  primary_category_id,
  source_snapshot_id,
  source_snapshot
on public.blog_posts
for each row
execute function public.enforce_blog_post_publish_requirements();

drop trigger if exists set_public_profile_nicknames_updated_at
  on public.public_profile_nicknames;
create trigger set_public_profile_nicknames_updated_at
before update on public.public_profile_nicknames
for each row
execute function public.set_updated_at();

drop trigger if exists set_site_telegram_subscription_counts_updated_at
  on public.site_telegram_subscription_counts;
create trigger set_site_telegram_subscription_counts_updated_at
before update on public.site_telegram_subscription_counts
for each row
execute function public.set_updated_at();

create or replace function public.sync_public_profile_nickname()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'DELETE' then
    delete from public.public_profile_nicknames
    where user_id = old.user_id;

    return old;
  end if;

  insert into public.public_profile_nicknames (
    user_id,
    nickname
  )
  values (
    new.user_id,
    new.nickname
  )
  on conflict (user_id) do update
  set
    nickname = excluded.nickname,
    updated_at = now();

  return new;
end;
$$;

drop trigger if exists sync_public_profile_nickname_on_change
  on public.profiles;
create trigger sync_public_profile_nickname_on_change
after insert or update or delete on public.profiles
for each row
execute function public.sync_public_profile_nickname();

create or replace function public.update_site_telegram_subscription_count()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    insert into public.site_telegram_subscription_counts (
      site_id,
      subscriber_count
    )
    values (
      new.site_id,
      1
    )
    on conflict (site_id) do update
    set
      subscriber_count = public.site_telegram_subscription_counts.subscriber_count + 1,
      updated_at = now();

    return new;
  end if;

  if tg_op = 'UPDATE' then
    if old.site_id = new.site_id then
      return new;
    end if;

    update public.site_telegram_subscription_counts
    set
      subscriber_count = greatest(0, subscriber_count - 1),
      updated_at = now()
    where site_id = old.site_id;

    insert into public.site_telegram_subscription_counts (
      site_id,
      subscriber_count
    )
    values (
      new.site_id,
      1
    )
    on conflict (site_id) do update
    set
      subscriber_count = public.site_telegram_subscription_counts.subscriber_count + 1,
      updated_at = now();

    return new;
  end if;

  if tg_op = 'DELETE' then
    update public.site_telegram_subscription_counts
    set
      subscriber_count = greatest(0, subscriber_count - 1),
      updated_at = now()
    where site_id = old.site_id;

    return old;
  end if;

  return null;
end;
$$;

drop trigger if exists update_site_telegram_subscription_count_on_change
  on public.site_telegram_subscriptions;
create trigger update_site_telegram_subscription_count_on_change
after insert or update or delete on public.site_telegram_subscriptions
for each row
execute function public.update_site_telegram_subscription_count();

create or replace function public.update_review_helpfulness_counts()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    update public.reviews
    set
      helpful_count = greatest(
        0,
        helpful_count + case when new.vote = 1 then 1 else 0 end
      ),
      not_helpful_count = greatest(
        0,
        not_helpful_count + case when new.vote = -1 then 1 else 0 end
      )
    where id = new.review_id;

    return new;
  end if;

  if tg_op = 'UPDATE' then
    if old.review_id = new.review_id then
      update public.reviews
      set
        helpful_count = greatest(
          0,
          helpful_count
            - case when old.vote = 1 then 1 else 0 end
            + case when new.vote = 1 then 1 else 0 end
        ),
        not_helpful_count = greatest(
          0,
          not_helpful_count
            - case when old.vote = -1 then 1 else 0 end
            + case when new.vote = -1 then 1 else 0 end
        )
      where id = new.review_id;
    else
      update public.reviews
      set
        helpful_count = greatest(
          0,
          helpful_count - case when old.vote = 1 then 1 else 0 end
        ),
        not_helpful_count = greatest(
          0,
          not_helpful_count - case when old.vote = -1 then 1 else 0 end
        )
      where id = old.review_id;

      update public.reviews
      set
        helpful_count = greatest(
          0,
          helpful_count + case when new.vote = 1 then 1 else 0 end
        ),
        not_helpful_count = greatest(
          0,
          not_helpful_count + case when new.vote = -1 then 1 else 0 end
        )
      where id = new.review_id;
    end if;

    return new;
  end if;

  if tg_op = 'DELETE' then
    update public.reviews
    set
      helpful_count = greatest(
        0,
        helpful_count - case when old.vote = 1 then 1 else 0 end
      ),
      not_helpful_count = greatest(
        0,
        not_helpful_count - case when old.vote = -1 then 1 else 0 end
      )
    where id = old.review_id;

    return old;
  end if;

  return null;
end;
$$;

drop trigger if exists update_review_helpfulness_counts_on_change
  on public.review_helpfulness_votes;
create trigger update_review_helpfulness_counts_on_change
after insert or update or delete on public.review_helpfulness_votes
for each row
execute function public.update_review_helpfulness_counts();

create or replace function public.handle_new_user_profile()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  requested_username text;
  requested_nickname text;
  signup_code text;
  signup_telegram public.telegram_signup_codes%rowtype;
  existing_telegram_user_id uuid;
  signup_ip text;
  signup_user_agent text;
begin
  requested_username := lower(coalesce(new.raw_user_meta_data ->> 'username', ''));
  requested_username := regexp_replace(requested_username, '[^a-z0-9_]+', '', 'g');

  if requested_username is null or length(requested_username) < 4 then
    requested_username := 'user_' || substr(new.id::text, 1, 8);
  end if;

  requested_username := left(requested_username, 20);

  requested_nickname := trim(coalesce(new.raw_user_meta_data ->> 'nickname', ''));

  if requested_nickname = '' then
    requested_nickname := split_part(coalesce(new.email, 'user'), '@', 1);
  end if;

  if char_length(requested_nickname) < 2 then
    requested_nickname := 'user';
  end if;

  requested_nickname := left(requested_nickname, 20);
  signup_ip := nullif(trim(coalesce(new.raw_user_meta_data ->> 'signup_ip', '')), '');
  signup_user_agent := nullif(
    left(trim(coalesce(new.raw_user_meta_data ->> 'signup_user_agent', '')), 500),
    ''
  );

  if signup_ip is not null
    and not exists (
      select 1
      from public.admin_ip_allowlist
      where admin_ip_allowlist.ip_address = signup_ip
    )
    and exists (
      select 1
      from public.profiles
      where profiles.signup_ip = signup_ip
      limit 1
    ) then
    raise exception 'signup_ip_already_used';
  end if;

  insert into public.profiles (
    user_id,
    username,
    nickname,
    signup_ip,
    signup_user_agent
  )
  values (
    new.id,
    requested_username,
    requested_nickname,
    signup_ip,
    signup_user_agent
  )
  on conflict (user_id) do nothing;

  signup_code := upper(coalesce(new.raw_user_meta_data ->> 'telegram_signup_code', ''));

  if signup_code ~ '^[A-Z0-9]{8}$' then
    select *
    into signup_telegram
    from public.telegram_signup_codes
    where verification_code = signup_code
      and consumed_at is null
      and expires_at > now()
    limit 1;

    if found then
      select user_id
      into existing_telegram_user_id
      from public.telegram_subscriptions
      where chat_id = signup_telegram.chat_id
        and user_id <> new.id
      limit 1;

      if found then
        return new;
      end if;

      update public.profiles
      set telegram_verified_at = now()
      where user_id = new.id;

      delete from public.telegram_subscriptions
      where user_id = new.id;

      insert into public.telegram_subscriptions (
        user_id,
        chat_id,
        username,
        first_name,
        last_name,
        is_active
      )
      values (
        new.id,
        signup_telegram.chat_id,
        signup_telegram.username,
        signup_telegram.first_name,
        signup_telegram.last_name,
        true
      );

      update public.telegram_signup_codes
      set consumed_at = now()
      where id = signup_telegram.id;
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created_create_profile on auth.users;
create trigger on_auth_user_created_create_profile
after insert on auth.users
for each row
execute function public.handle_new_user_profile();

insert into public.profiles (user_id, username, nickname)
select
  auth_users.id,
  'user_' || substr(auth_users.id::text, 1, 8),
  case
    when char_length(split_part(coalesce(auth_users.email, 'user'), '@', 1)) < 2
      then 'user'
    else left(split_part(coalesce(auth_users.email, 'user'), '@', 1), 20)
  end
from auth.users as auth_users
where not exists (
  select 1
  from public.profiles
  where profiles.user_id = auth_users.id
)
on conflict do nothing;

alter table public.sites enable row level security;
alter table public.reviews enable row level security;
alter table public.scam_reports enable row level security;
alter table public.state_availability enable row level security;
alter table public.admin_users enable row level security;
alter table public.profiles enable row level security;
alter table public.admin_ip_allowlist enable row level security;
alter table public.telegram_subscriptions enable row level security;
alter table public.telegram_signup_codes enable row level security;
alter table public.site_telegram_subscriptions enable row level security;
alter table public.domain_whois_cache enable row level security;
alter table public.site_dns_records enable row level security;
alter table public.site_domain_submissions enable row level security;
alter table public.review_helpfulness_votes enable row level security;
alter table public.blog_posts enable row level security;
alter table public.blog_categories enable row level security;
alter table public.blog_post_categories enable row level security;
alter table public.blog_tags enable row level security;
alter table public.blog_post_tags enable row level security;
alter table public.blog_source_snapshots enable row level security;
alter table public.blog_post_versions enable row level security;
alter table public.blog_content_fingerprints enable row level security;
alter table public.ai_generation_jobs enable row level security;
alter table public.public_profile_nicknames enable row level security;
alter table public.site_telegram_subscription_counts enable row level security;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.admin_users
    where lower(admin_users.email) = lower(auth.jwt() ->> 'email')
  );
$$;

-- RLS policy draft:
-- Public visitors should only read approved sites.
drop policy if exists "Public can read approved sites" on public.sites;
create policy "Public can read approved sites"
on public.sites
for select
using (status = 'approved');

-- Public visitors should only read approved reviews for approved sites.
drop policy if exists "Public can read approved reviews" on public.reviews;
create policy "Public can read approved reviews"
on public.reviews
for select
using (
  status = 'approved'
  and exists (
    select 1
    from public.sites
    where sites.id = reviews.site_id
      and sites.status = 'approved'
  )
);

drop policy if exists "Public can read published scam reports" on public.scam_reports;
create policy "Public can read published scam reports"
on public.scam_reports
for select
using (
  review_status = 'approved'
  and is_published = true
  and exists (
    select 1
    from public.sites
    where sites.id = scam_reports.site_id
      and sites.status = 'approved'
  )
);

-- Public visitors should only read state availability for approved sites.
drop policy if exists "Public can read availability for approved sites"
  on public.state_availability;
create policy "Public can read availability for approved sites"
on public.state_availability
for select
using (
  exists (
    select 1
    from public.sites
    where sites.id = state_availability.site_id
      and sites.status = 'approved'
  )
);

drop policy if exists "Public can read dns records for approved sites"
  on public.site_dns_records;
create policy "Public can read dns records for approved sites"
on public.site_dns_records
for select
using (
  exists (
    select 1
    from public.sites
    where sites.id = site_dns_records.site_id
      and sites.status = 'approved'
  )
);

drop policy if exists "Public can read profile nicknames"
  on public.public_profile_nicknames;
create policy "Public can read profile nicknames"
on public.public_profile_nicknames
for select
using (true);

drop policy if exists "Public can read site telegram subscription counts"
  on public.site_telegram_subscription_counts;
create policy "Public can read site telegram subscription counts"
on public.site_telegram_subscription_counts
for select
using (
  exists (
    select 1
    from public.sites
    where sites.id = site_telegram_subscription_counts.site_id
      and sites.status = 'approved'
  )
);

drop policy if exists "Public can read published blog posts"
  on public.blog_posts;
create policy "Public can read published blog posts"
on public.blog_posts
for select
using (status = 'published');

drop policy if exists "Public can read active blog categories"
  on public.blog_categories;
create policy "Public can read active blog categories"
on public.blog_categories
for select
using (is_active = true);

drop policy if exists "Public can read published blog post categories"
  on public.blog_post_categories;
create policy "Public can read published blog post categories"
on public.blog_post_categories
for select
using (
  exists (
    select 1
    from public.blog_posts
    where blog_posts.id = blog_post_categories.post_id
      and blog_posts.status = 'published'
  )
  and exists (
    select 1
    from public.blog_categories
    where blog_categories.id = blog_post_categories.category_id
      and blog_categories.is_active = true
  )
);

drop policy if exists "Public can read published blog tags"
  on public.blog_tags;
create policy "Public can read published blog tags"
on public.blog_tags
for select
using (
  exists (
    select 1
    from public.blog_post_tags
    join public.blog_posts
      on blog_posts.id = blog_post_tags.post_id
    where blog_post_tags.tag_id = blog_tags.id
      and blog_posts.status = 'published'
  )
);

drop policy if exists "Public can read published blog post tags"
  on public.blog_post_tags;
create policy "Public can read published blog post tags"
on public.blog_post_tags
for select
using (
  exists (
    select 1
    from public.blog_posts
    where blog_posts.id = blog_post_tags.post_id
      and blog_posts.status = 'published'
  )
);

-- Authenticated submissions: allow logged-in users to submit pending items.
-- Consider adding captcha/rate limiting at the application or edge layer.
drop policy if exists "Public can submit pending sites" on public.sites;
drop policy if exists "Authenticated users can submit pending sites" on public.sites;
create policy "Authenticated users can submit pending sites"
on public.sites
for insert
with check (
  status = 'pending'
  and user_id = auth.uid()
);

drop policy if exists "Public can submit pending reviews" on public.reviews;
create policy "Public can submit pending reviews"
on public.reviews
for insert
with check (
  status = 'pending'
  and (
    user_id is null
    or user_id = auth.uid()
  )
);

drop policy if exists "Public can submit pending scam reports" on public.scam_reports;
create policy "Public can submit pending scam reports"
on public.scam_reports
for insert
with check (
  review_status = 'pending'
  and is_published = false
  and (
    user_id is null
    or user_id = auth.uid()
  )
);

-- Authenticated users can read their own submissions regardless of status.
drop policy if exists "Users can read own sites" on public.sites;
create policy "Users can read own sites"
on public.sites
for select
using (user_id = auth.uid());

drop policy if exists "Users can read own reviews" on public.reviews;
create policy "Users can read own reviews"
on public.reviews
for select
using (user_id = auth.uid());

drop policy if exists "Users can update own reviews for reapproval"
  on public.reviews;
create policy "Users can update own reviews for reapproval"
on public.reviews
for update
using (user_id = auth.uid())
with check (
  user_id = auth.uid()
  and status = 'pending'
);

drop policy if exists "Users can read own scam reports" on public.scam_reports;
create policy "Users can read own scam reports"
on public.scam_reports
for select
using (user_id = auth.uid());

drop policy if exists "Users can update own scam reports for reapproval"
  on public.scam_reports;
create policy "Users can update own scam reports for reapproval"
on public.scam_reports
for update
using (user_id = auth.uid())
with check (
  user_id = auth.uid()
  and review_status = 'pending'
  and is_published = false
);

drop policy if exists "Authenticated users can submit site domains"
  on public.site_domain_submissions;
create policy "Authenticated users can submit site domains"
on public.site_domain_submissions
for insert
with check (
  status = 'pending'
  and user_id = auth.uid()
);

drop policy if exists "Users can read own site domain submissions"
  on public.site_domain_submissions;
create policy "Users can read own site domain submissions"
on public.site_domain_submissions
for select
using (user_id = auth.uid());

drop policy if exists "Users can read own review helpfulness votes"
  on public.review_helpfulness_votes;
create policy "Users can read own review helpfulness votes"
on public.review_helpfulness_votes
for select
using (user_id = auth.uid());

drop policy if exists "Users can insert own review helpfulness votes"
  on public.review_helpfulness_votes;
create policy "Users can insert own review helpfulness votes"
on public.review_helpfulness_votes
for insert
with check (
  user_id = auth.uid()
  and exists (
    select 1
    from public.reviews
    where reviews.id = review_helpfulness_votes.review_id
      and reviews.status = 'approved'
      and (
        reviews.user_id is null
        or reviews.user_id <> auth.uid()
      )
  )
);

drop policy if exists "Users can update own review helpfulness votes"
  on public.review_helpfulness_votes;
create policy "Users can update own review helpfulness votes"
on public.review_helpfulness_votes
for update
using (user_id = auth.uid())
with check (
  user_id = auth.uid()
  and exists (
    select 1
    from public.reviews
    where reviews.id = review_helpfulness_votes.review_id
      and reviews.status = 'approved'
      and (
        reviews.user_id is null
        or reviews.user_id <> auth.uid()
      )
  )
);

drop policy if exists "Users can delete own review helpfulness votes"
  on public.review_helpfulness_votes;
create policy "Users can delete own review helpfulness votes"
on public.review_helpfulness_votes
for delete
using (user_id = auth.uid());

-- Admin lookup policy:
-- Authenticated users can read their own admin_users row to let the client
-- determine whether the current email is an admin.
drop policy if exists "Users can read own admin row" on public.admin_users;
create policy "Users can read own admin row"
on public.admin_users
for select
using (lower(email) = lower(auth.jwt() ->> 'email'));

drop policy if exists "Users can read own profile" on public.profiles;
create policy "Users can read own profile"
on public.profiles
for select
using (user_id = auth.uid());

drop policy if exists "Users can update own profile" on public.profiles;
create policy "Users can update own profile"
on public.profiles
for update
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists "Users can read own telegram subscription"
  on public.telegram_subscriptions;
create policy "Users can read own telegram subscription"
on public.telegram_subscriptions
for select
using (user_id = auth.uid());

drop policy if exists "Users can read own site telegram subscriptions"
  on public.site_telegram_subscriptions;
create policy "Users can read own site telegram subscriptions"
on public.site_telegram_subscriptions
for select
using (user_id = auth.uid());

drop policy if exists "Users can insert own site telegram subscriptions"
  on public.site_telegram_subscriptions;
create policy "Users can insert own site telegram subscriptions"
on public.site_telegram_subscriptions
for insert
with check (user_id = auth.uid());

drop policy if exists "Users can delete own site telegram subscriptions"
  on public.site_telegram_subscriptions;
create policy "Users can delete own site telegram subscriptions"
on public.site_telegram_subscriptions
for delete
using (user_id = auth.uid());

-- Admin moderation policies:
-- Admins can read and update all sites/reviews for moderation.
drop policy if exists "Admins can read all sites" on public.sites;
create policy "Admins can read all sites"
on public.sites
for select
using (public.is_admin());

drop policy if exists "Admins can update sites" on public.sites;
create policy "Admins can update sites"
on public.sites
for update
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "Admins can delete sites" on public.sites;
create policy "Admins can delete sites"
on public.sites
for delete
using (public.is_admin());

drop policy if exists "Admins can insert sites" on public.sites;
create policy "Admins can insert sites"
on public.sites
for insert
with check (public.is_admin());

drop policy if exists "Admins can read all reviews" on public.reviews;
create policy "Admins can read all reviews"
on public.reviews
for select
using (public.is_admin());

drop policy if exists "Admins can update reviews" on public.reviews;
create policy "Admins can update reviews"
on public.reviews
for update
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "Admins can delete reviews" on public.reviews;
create policy "Admins can delete reviews"
on public.reviews
for delete
using (public.is_admin());

drop policy if exists "Admins can read all scam reports" on public.scam_reports;
create policy "Admins can read all scam reports"
on public.scam_reports
for select
using (public.is_admin());

drop policy if exists "Admins can update scam reports" on public.scam_reports;
create policy "Admins can update scam reports"
on public.scam_reports
for update
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "Admins can delete scam reports" on public.scam_reports;
create policy "Admins can delete scam reports"
on public.scam_reports
for delete
using (public.is_admin());

drop policy if exists "Admins can manage state availability"
  on public.state_availability;
create policy "Admins can manage state availability"
on public.state_availability
for all
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "Admins can read telegram subscriptions"
  on public.telegram_subscriptions;
create policy "Admins can read telegram subscriptions"
on public.telegram_subscriptions
for select
using (public.is_admin());

drop policy if exists "Admins can manage site telegram subscriptions"
  on public.site_telegram_subscriptions;
create policy "Admins can manage site telegram subscriptions"
on public.site_telegram_subscriptions
for all
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "Admins can read profiles" on public.profiles;
create policy "Admins can read profiles"
on public.profiles
for select
using (public.is_admin());

drop policy if exists "Admins can manage admin IP allowlist"
  on public.admin_ip_allowlist;
create policy "Admins can manage admin IP allowlist"
on public.admin_ip_allowlist
for all
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "Admins can manage domain whois cache"
  on public.domain_whois_cache;
create policy "Admins can manage domain whois cache"
on public.domain_whois_cache
for all
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "Admins can manage site dns records"
  on public.site_dns_records;
create policy "Admins can manage site dns records"
on public.site_dns_records
for all
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "Admins can manage site domain submissions"
  on public.site_domain_submissions;
create policy "Admins can manage site domain submissions"
on public.site_domain_submissions
for all
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "Admins can manage review helpfulness votes"
  on public.review_helpfulness_votes;
create policy "Admins can manage review helpfulness votes"
on public.review_helpfulness_votes
for all
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "Admins can manage blog posts"
  on public.blog_posts;
create policy "Admins can manage blog posts"
on public.blog_posts
for all
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "Admins can manage blog categories"
  on public.blog_categories;
create policy "Admins can manage blog categories"
on public.blog_categories
for all
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "Admins can manage blog post categories"
  on public.blog_post_categories;
create policy "Admins can manage blog post categories"
on public.blog_post_categories
for all
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "Admins can manage blog tags"
  on public.blog_tags;
create policy "Admins can manage blog tags"
on public.blog_tags
for all
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "Admins can manage blog post tags"
  on public.blog_post_tags;
create policy "Admins can manage blog post tags"
on public.blog_post_tags
for all
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "Admins can manage blog source snapshots"
  on public.blog_source_snapshots;
create policy "Admins can manage blog source snapshots"
on public.blog_source_snapshots
for all
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "Admins can manage blog post versions"
  on public.blog_post_versions;
create policy "Admins can manage blog post versions"
on public.blog_post_versions
for all
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "Admins can manage blog content fingerprints"
  on public.blog_content_fingerprints;
create policy "Admins can manage blog content fingerprints"
on public.blog_content_fingerprints
for all
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "Admins can manage AI generation jobs"
  on public.ai_generation_jobs;
create policy "Admins can manage AI generation jobs"
on public.ai_generation_jobs
for all
using (public.is_admin())
with check (public.is_admin());
