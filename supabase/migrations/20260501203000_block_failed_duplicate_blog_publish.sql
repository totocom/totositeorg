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

  if new.duplicate_risk = 'failed' then
    raise exception 'blog_posts_publish_blocked_duplicate_risk_failed';
  end if;

  if length(trim(coalesce(new.title, ''))) = 0 then
    raise exception 'blog_posts_publish_requires_title';
  end if;

  if length(trim(coalesce(new.meta_description, ''))) = 0 then
    raise exception 'blog_posts_publish_requires_meta_description';
  end if;

  if length(trim(coalesce(new.body_md, ''))) = 0 then
    raise exception 'blog_posts_publish_requires_body_md';
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
  duplicate_risk,
  title,
  meta_description,
  body_md,
  source_snapshot_id,
  source_snapshot
on public.blog_posts
for each row
execute function public.enforce_blog_post_publish_requirements();
