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
  state_used text not null,
  reviewer_name text null,
  reviewer_email text null,
  status text not null default 'pending',
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
  constraint reviews_state_used_not_blank check (
    length(trim(state_used)) > 0
  ),
  constraint reviews_email_format check (
    reviewer_email is null
    or reviewer_email = ''
    or reviewer_email ~* '^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$'
  ),
  constraint reviews_status_allowed check (
    status in ('pending', 'approved', 'rejected')
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

create index if not exists telegram_subscriptions_user_id_idx
  on public.telegram_subscriptions (user_id);

create index if not exists telegram_subscriptions_chat_id_idx
  on public.telegram_subscriptions (chat_id);

create index if not exists telegram_signup_codes_code_idx
  on public.telegram_signup_codes (verification_code);

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

  insert into public.profiles (
    user_id,
    username,
    nickname
  )
  values (
    new.id,
    requested_username,
    requested_nickname
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
      update public.profiles
      set telegram_verified_at = now()
      where user_id = new.id;

      delete from public.telegram_subscriptions
      where user_id = new.id
        or chat_id = signup_telegram.chat_id;

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
alter table public.telegram_subscriptions enable row level security;
alter table public.telegram_signup_codes enable row level security;
alter table public.domain_whois_cache enable row level security;
alter table public.site_dns_records enable row level security;

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

drop policy if exists "Users can read own scam reports" on public.scam_reports;
create policy "Users can read own scam reports"
on public.scam_reports
for select
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

drop policy if exists "Admins can read profiles" on public.profiles;
create policy "Admins can read profiles"
on public.profiles
for select
using (public.is_admin());

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
