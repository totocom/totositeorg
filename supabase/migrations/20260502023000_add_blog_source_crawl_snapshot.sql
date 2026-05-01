alter table public.blog_source_snapshots
  add column if not exists crawl_snapshot_json jsonb null;

do $$
begin
  alter table public.blog_source_snapshots
    drop constraint if exists blog_source_snapshots_crawl_snapshot_object;

  alter table public.blog_source_snapshots
    add constraint blog_source_snapshots_crawl_snapshot_object check (
      crawl_snapshot_json is null
      or jsonb_typeof(crawl_snapshot_json) = 'object'
    );
end $$;
