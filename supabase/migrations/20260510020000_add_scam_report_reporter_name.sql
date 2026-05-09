alter table public.scam_reports
  add column if not exists reporter_name text null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'scam_reports_reporter_name_length'
      and conrelid = 'public.scam_reports'::regclass
  ) then
    alter table public.scam_reports
      add constraint scam_reports_reporter_name_length check (
        reporter_name is null
        or char_length(trim(reporter_name)) between 2 and 20
      );
  end if;
end $$;
