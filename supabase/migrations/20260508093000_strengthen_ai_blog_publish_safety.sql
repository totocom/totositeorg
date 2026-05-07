create or replace function public.enforce_blog_post_publish_requirements()
returns trigger
language plpgsql
as $$
declare
  prohibited_phrase_check jsonb;
  minimum_publish_check jsonb;
  publish_safety_review jsonb;
  same_site_id uuid;
  same_site_published_count integer;
  real_data_axis_count integer;
  h2_pattern_count integer;
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

  minimum_publish_check := case
    when jsonb_typeof(new.source_snapshot -> 'minimumPublishCheck') = 'object'
      then new.source_snapshot -> 'minimumPublishCheck'
    when jsonb_typeof(new.source_snapshot #> '{snapshot,minimum_publish_check}') = 'object'
      then new.source_snapshot #> '{snapshot,minimum_publish_check}'
    else null
  end;

  if minimum_publish_check is null
    or minimum_publish_check ->> 'automatic_publish_blocked' is distinct from 'false' then
    raise exception 'blog_posts_publish_blocked_minimum_publish_check';
  end if;

  real_data_axis_count := coalesce(
    nullif(minimum_publish_check ->> 'real_data_axis_count', '')::integer,
    0
  );

  if real_data_axis_count < 2 then
    raise exception 'blog_posts_publish_requires_real_data_axes';
  end if;

  publish_safety_review := case
    when jsonb_typeof(new.source_snapshot -> 'publishSafetyReview') = 'object'
      then new.source_snapshot -> 'publishSafetyReview'
    else null
  end;

  if publish_safety_review is null
    or publish_safety_review ->> 'automatic_publish_blocked' is distinct from 'false' then
    raise exception 'blog_posts_publish_blocked_publish_safety_review';
  end if;

  if new.source_snapshot ->> 'isFallbackDraft' = 'true'
    or publish_safety_review ->> 'is_fallback_draft' = 'true'
    or publish_safety_review ->> 'fallback_blocked' = 'true' then
    raise exception 'blog_posts_publish_blocked_fallback_draft';
  end if;

  if publish_safety_review ->> 'absence_heavy_body' = 'true' then
    raise exception 'blog_posts_publish_blocked_absence_heavy_body';
  end if;

  h2_pattern_count := coalesce(
    nullif(publish_safety_review ->> 'h2_pattern_repeat_count', '')::integer,
    0
  );

  if publish_safety_review ->> 'h2_pattern_publish_blocked' = 'true'
    or h2_pattern_count >= 3 then
    raise exception 'blog_posts_publish_blocked_h2_pattern_repeat';
  end if;

  same_site_id := coalesce(new.site_id, new.source_site_id);

  if same_site_id is not null
    and coalesce(new.source_snapshot ->> 'allowAdditionalPostForSameSite', 'false') <> 'true' then
    select count(*)
      into same_site_published_count
      from public.blog_posts existing
      where existing.id <> new.id
        and existing.status = 'published'
        and (
          existing.site_id = same_site_id
          or existing.source_site_id = same_site_id
        );

    if same_site_published_count > 0 then
      raise exception 'blog_posts_publish_blocked_same_site_published_limit';
    end if;
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
