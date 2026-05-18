alter table public.sites
  add column if not exists include_english_alias_in_title boolean not null default false;
