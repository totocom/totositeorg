"use client";

import { type FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "@/app/components/auth-provider";
import { reviewSurveySections, type SurveyQuestion } from "@/app/data/review-survey";
import type { ReviewTarget, SiteReview } from "@/app/data/sites";
import { supabase } from "@/lib/supabase/client";

type SubmitReviewFormProps = {
  sites: ReviewTarget[];
  selectedSiteId?: string;
};

type SurveyAnswers = Record<string, string | string[]>;

type ReviewFormValues = {
  siteId: string;
  answers: SurveyAnswers;
  comment: string;
};

type ReviewFormErrors = Partial<Record<keyof ReviewFormValues | string, string>>;
type FormStatus = "idle" | "loading-sites" | "submitting";
type ReviewSiteOption = {
  id: string;
  siteName: string;
};

const satisfactionToRating: Record<string, number> = {
  "매우 만족": 5,
  만족: 4,
  보통: 3,
  불만족: 2,
  "매우 불만족": 1,
};

function initialValues(
  sites: ReviewSiteOption[],
  selectedSiteId = "",
): ReviewFormValues {
  const normalizedSelectedSiteId = selectedSiteId.trim();
  const selectedSite = sites.find((site) => site.id === normalizedSelectedSiteId);

  return {
    siteId: normalizedSelectedSiteId ? selectedSite?.id ?? "" : sites[0]?.id ?? "",
    answers: {},
    comment: "",
  };
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value.trim(),
  );
}

function hasAnswer(value: string | string[] | undefined) {
  if (Array.isArray(value)) return value.length > 0;
  return Boolean(value);
}

function isQuestionVisible(question: SurveyQuestion, answers: SurveyAnswers) {
  if (!question.dependsOn) return true;
  const parentAnswer = answers[question.dependsOn.questionId];
  if (Array.isArray(parentAnswer)) {
    return parentAnswer.includes(question.dependsOn.value);
  }
  return parentAnswer === question.dependsOn.value;
}

function buildExperiencePayload(values: ReviewFormValues) {
  return JSON.stringify(
    {
      type: "site_satisfaction_survey",
      answers: values.answers,
      comment: values.comment.trim() || null,
    },
    null,
    2,
  );
}

function getVisibleAnswers(answers: SurveyAnswers) {
  return reviewSurveySections.reduce<SurveyAnswers>((visibleAnswers, section) => {
    for (const question of section.questions) {
      if (isQuestionVisible(question, answers) && hasAnswer(answers[question.id])) {
        visibleAnswers[question.id] = answers[question.id];
      }
    }

    return visibleAnswers;
  }, {});
}

function getRating(answers: SurveyAnswers) {
  const satisfaction = answers.overall_satisfaction;
  if (typeof satisfaction === "string") {
    return satisfactionToRating[satisfaction] ?? 3;
  }
  return 3;
}

function getTitle(siteName: string, answers: SurveyAnswers) {
  const satisfaction = answers.overall_satisfaction;
  const label = typeof satisfaction === "string" ? satisfaction : "만족도";
  return `${siteName} 이용 ${label} 평가`;
}

export function SubmitReviewForm({
  sites,
  selectedSiteId = "",
}: SubmitReviewFormProps) {
  const normalizedSelectedSiteId = selectedSiteId.trim();
  const { user } = useAuth();
  const formRef = useRef<HTMLFormElement>(null);
  const fallbackSites = sites.map((site) => ({
    id: site.id,
    siteName: site.siteName,
  }));
  const [siteOptions, setSiteOptions] =
    useState<ReviewSiteOption[]>(fallbackSites);
  const [formStatus, setFormStatus] = useState<FormStatus>("loading-sites");
  const [values, setValues] = useState(() =>
    initialValues(fallbackSites, normalizedSelectedSiteId),
  );
  const [errors, setErrors] = useState<ReviewFormErrors>({});
  const [successMessage, setSuccessMessage] = useState("");
  const [submitError, setSubmitError] = useState("");
  const [siteLoadError, setSiteLoadError] = useState("");
  const [siteSearch, setSiteSearch] = useState("");
  const isSiteFixed = Boolean(normalizedSelectedSiteId);

  const selectedSiteName = useMemo(() => {
    return siteOptions.find((site) => site.id === values.siteId)?.siteName ?? "사이트";
  }, [siteOptions, values.siteId]);

  const filteredSiteOptions = useMemo(() => {
    const keyword = siteSearch.trim().toLowerCase();
    const filtered =
      keyword.length === 0
        ? siteOptions
        : siteOptions.filter((site) =>
            site.siteName.toLowerCase().includes(keyword),
          );

    return filtered.slice(0, 12);
  }, [siteOptions, siteSearch]);

  function scrollToFirstError(nextErrors: ReviewFormErrors) {
    const firstErrorKey = Object.keys(nextErrors)[0];

    if (!firstErrorKey) return;

    requestAnimationFrame(() => {
      const target =
        formRef.current?.querySelector<HTMLElement>(
          `[data-error-key="${CSS.escape(firstErrorKey)}"]`,
        ) ?? null;

      target?.scrollIntoView({ behavior: "smooth", block: "center" });
      target
        ?.querySelector<HTMLElement>("input, textarea, button")
        ?.focus({ preventScroll: true });
    });
  }

  useEffect(() => {
    let isMounted = true;

    async function loadApprovedSites() {
      setFormStatus("loading-sites");
      const { data, error } = await supabase
        .from("sites")
        .select("id, name")
        .eq("status", "approved")
        .order("name", { ascending: true });

      if (!isMounted) return;

      if (error) {
        setSiteLoadError(
          "승인된 사이트 목록을 불러오지 못했습니다. 잠시 후 다시 시도해주세요.",
        );
        setSiteOptions([]);
        setValues(initialValues([]));
        setFormStatus("idle");
        return;
      }

      const approvedSites = (data ?? []).map((site) => ({
        id: site.id,
        siteName: site.name,
      }));
      const selectedSite = approvedSites.find((site) => site.id === normalizedSelectedSiteId);

      setSiteLoadError(
        normalizedSelectedSiteId && !selectedSite
          ? "요청한 사이트가 승인 목록에 없거나 공개 상태가 아닙니다."
          : "",
      );
      setSiteOptions(approvedSites);
      setValues(initialValues(approvedSites, normalizedSelectedSiteId));
      setSiteSearch(selectedSite?.siteName ?? "");
      setFormStatus("idle");
    }

    loadApprovedSites();

    return () => {
      isMounted = false;
    };
  }, [normalizedSelectedSiteId]);

  function updateField<K extends keyof Omit<ReviewFormValues, "answers">>(
    field: K,
    value: ReviewFormValues[K],
  ) {
    setValues((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
    setSuccessMessage("");
    setSubmitError("");
  }

  function selectSite(site: ReviewSiteOption) {
    updateField("siteId", site.id);
    setSiteSearch(site.siteName);
  }

  function updateSingleAnswer(questionId: string, value: string) {
    setValues((current) => ({
      ...current,
      answers: { ...current.answers, [questionId]: value },
    }));
    setErrors((current) => ({ ...current, [questionId]: undefined }));
    setSuccessMessage("");
    setSubmitError("");
  }

  function toggleMultipleAnswer(questionId: string, option: string) {
    setValues((current) => {
      const currentValues = current.answers[questionId];
      const valuesArray = Array.isArray(currentValues) ? currentValues : [];
      const nextValues = valuesArray.includes(option)
        ? valuesArray.filter((value) => value !== option)
        : option === "없음"
          ? ["없음"]
          : [...valuesArray.filter((value) => value !== "없음"), option];

      return {
        ...current,
        answers: { ...current.answers, [questionId]: nextValues },
      };
    });
    setErrors((current) => ({ ...current, [questionId]: undefined }));
    setSuccessMessage("");
    setSubmitError("");
  }

  function validate() {
    const nextErrors: ReviewFormErrors = {};

    if (!values.siteId) {
      nextErrors.siteId = "평가할 사이트를 선택해주세요.";
    } else if (!isUuid(values.siteId)) {
      nextErrors.siteId =
        "승인된 사이트 정보가 아직 Supabase와 연결되지 않았습니다.";
    }

    for (const section of reviewSurveySections) {
      for (const question of section.questions) {
        if (!isQuestionVisible(question, values.answers)) continue;
        if (!hasAnswer(values.answers[question.id])) {
          nextErrors[question.id] = "항목을 선택해주세요.";
        }
      }
    }

    return nextErrors;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextErrors = validate();
    setErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) {
      setSuccessMessage("");
      setSubmitError("");
      scrollToFirstError(nextErrors);
      return;
    }

    setFormStatus("submitting");
    setSuccessMessage("");
    setSubmitError("");

    const visibleAnswers = getVisibleAnswers(values.answers);
    const experience = buildExperiencePayload({
      ...values,
      answers: visibleAnswers,
    });
    const title = getTitle(selectedSiteName, visibleAnswers);

    const { data: insertedReview, error } = await supabase
      .from("reviews")
      .insert({
        site_id: values.siteId,
        user_id: user?.id ?? null,
        rating: getRating(visibleAnswers),
        title,
        experience,
        issue_type: "general" satisfies SiteReview["issueType"],
        reviewer_name: null,
        reviewer_email: null,
        status: "pending",
      })
      .select("id")
      .single();

    setFormStatus("idle");

    if (error) {
      if (error.code === "23503" || error.code === "22P02") {
        setSubmitError(
          "선택한 사이트 정보가 유효하지 않습니다. 승인된 사이트 목록을 다시 확인해주세요.",
        );
        return;
      }

      if (error.code === "42501") {
        setSubmitError(
          "평가를 저장할 권한이 없습니다. Supabase RLS 정책을 확인해주세요.",
        );
        return;
      }

      setSubmitError(
        "만족도 평가 저장 중 문제가 발생했습니다. 잠시 후 다시 시도해주세요.",
      );
      return;
    }

    const notificationError = insertedReview?.id
      ? await sendContentSubmittedNotification(insertedReview.id)
      : "";

    setSuccessMessage(
      notificationError
        ? `만족도 평가가 관리자 검토 대기 상태로 접수되었습니다. ${notificationError}`
        : "만족도 평가가 관리자 검토 대기 상태로 접수되었습니다.",
    );
    setValues(initialValues(siteOptions, normalizedSelectedSiteId));
    const selectedSite = siteOptions.find((site) => site.id === normalizedSelectedSiteId);
    setSiteSearch(selectedSite?.siteName ?? "");
  }

  async function sendContentSubmittedNotification(reviewId: string) {
    if (!user) {
      return "";
    }

    const { data: sessionResult } = await supabase.auth.getSession();
    const accessToken = sessionResult.session?.access_token;

    if (!accessToken) {
      return "다만 텔레그램 알림은 로그인 세션을 확인하지 못해 전송되지 않았습니다.";
    }

    const response = await fetch("/api/telegram/content-submitted", {
      method: "POST",
      headers: {
        authorization: `Bearer ${accessToken}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({ type: "review", contentId: reviewId }),
    });

    if (response.ok) {
      return "";
    }

    const body = (await response.json().catch(() => null)) as {
      error?: string;
    } | null;

    return `다만 텔레그램 알림 전송에 실패했습니다. ${
      body?.error ?? "봇 연결 상태와 환경변수를 확인해주세요."
    }`;
  }

  if (formStatus === "loading-sites") {
    return (
      <section className="rounded-lg border border-line bg-surface p-5 text-sm text-muted shadow-sm">
        평가 가능한 사이트 목록을 불러오는 중입니다.
      </section>
    );
  }

  if (siteOptions.length === 0) {
    return (
      <section className="rounded-lg border border-line bg-surface p-5 shadow-sm">
        <h2 className="text-lg font-semibold">평가 가능한 사이트가 없습니다</h2>
        <p className="mt-2 text-sm leading-6 text-muted">
          관리자가 등록하고 공개한 사이트가 아직 없습니다.
        </p>
        {siteLoadError ? (
          <p className="mt-3 text-sm font-semibold text-red-700">
            {siteLoadError}
          </p>
        ) : null}
      </section>
    );
  }

  return (
    <form
      ref={formRef}
      onSubmit={handleSubmit}
      className="grid gap-4 rounded-lg border border-line bg-surface p-5 shadow-sm"
      noValidate
    >
      {successMessage ? (
        <div className="rounded-md border border-accent bg-accent-soft px-4 py-3 text-sm font-semibold text-accent">
          {successMessage} 관리자 검토 후 공개됩니다.
        </div>
      ) : null}

      {submitError ? (
        <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
          {submitError}
        </div>
      ) : null}

      <div className="grid gap-2 text-sm font-medium" data-error-key="siteId">
        {isSiteFixed ? (
          <div className="rounded-md border border-line bg-background p-4">
            <p className="text-xs font-semibold uppercase text-muted">
              평가할 사이트
            </p>
            <p className="mt-1 text-base font-semibold text-foreground">
              {selectedSiteName}
            </p>
            <p className="mt-1 text-xs text-muted">
              사이트 상세 화면에서 선택한 사이트에 대해서만 평가를 작성합니다.
            </p>
          </div>
        ) : (
          <>
            <label htmlFor="site-search">평가할 사이트 검색</label>
            <input
              id="site-search"
              value={siteSearch}
              onChange={(event) => setSiteSearch(event.target.value)}
              className="h-11 rounded-md border border-line px-3 text-sm"
              placeholder="사이트명을 입력해서 검색하세요"
              autoComplete="off"
            />
            <p className="text-xs text-muted">
              선택된 사이트:{" "}
              <span className="font-semibold text-foreground">
                {selectedSiteName}
              </span>
            </p>
            <div className="grid max-h-56 gap-2 overflow-y-auto rounded-md border border-line bg-background p-2">
              {filteredSiteOptions.length > 0 ? (
                filteredSiteOptions.map((site) => {
                  const selected = site.id === values.siteId;

                  return (
                    <button
                      key={site.id}
                      type="button"
                      onClick={() => selectSite(site)}
                      className={[
                        "rounded-md px-3 py-2 text-left text-sm transition",
                        selected
                          ? "bg-accent text-white"
                          : "bg-white text-foreground hover:bg-accent-soft hover:text-accent",
                      ].join(" ")}
                    >
                      {site.siteName}
                      {selected ? (
                        <span className="ml-2 text-xs">선택됨</span>
                      ) : null}
                    </button>
                  );
                })
              ) : (
                <p className="px-3 py-2 text-sm text-muted">
                  검색 결과가 없습니다.
                </p>
              )}
            </div>
          </>
        )}
        {errors.siteId ? (
          <span className="text-xs text-red-700">{errors.siteId}</span>
        ) : null}
      </div>

      {reviewSurveySections.map((section) => {
        const visibleQuestions = section.questions.filter((question) =>
          isQuestionVisible(question, values.answers),
        );

        if (visibleQuestions.length === 0) return null;

        return (
          <details
            key={section.id}
            open={section.id === "usage_purpose" || section.id === "overall"}
            className="rounded-lg border border-line bg-background p-4"
          >
            <summary className="cursor-pointer text-base font-semibold">
              {section.title}
            </summary>
            <div className="mt-4 grid gap-5">
              {visibleQuestions.map((question) => {

              return (
                <fieldset
                  key={question.id}
                  className="grid gap-2"
                  data-error-key={question.id}
                >
                  <legend className="text-sm font-semibold text-foreground">
                    {question.label}
                  </legend>
                  <div className="flex flex-wrap gap-2">
                    {question.options.map((option) => {
                      const answer = values.answers[question.id];
                      const checked =
                        question.type === "multiple"
                          ? Array.isArray(answer) && answer.includes(option)
                          : answer === option;

                      return (
                        <label
                          key={option}
                          className={[
                            "flex cursor-pointer items-center gap-2 rounded-full border px-3 py-2 text-sm transition",
                            checked
                              ? "border-accent bg-accent-soft text-accent"
                              : "border-line bg-white text-muted hover:text-foreground",
                          ].join(" ")}
                        >
                          <input
                            type={question.type === "multiple" ? "checkbox" : "radio"}
                            name={question.id}
                            checked={checked}
                            onChange={() =>
                              question.type === "multiple"
                                ? toggleMultipleAnswer(question.id, option)
                                : updateSingleAnswer(question.id, option)
                            }
                            className="sr-only"
                          />
                          {option}
                        </label>
                      );
                    })}
                  </div>
                  {errors[question.id] ? (
                    <span className="text-xs text-red-700">
                      {errors[question.id]}
                    </span>
                  ) : null}
                </fieldset>
              );
              })}
            </div>
          </details>
        );
      })}

      <label className="grid gap-1 text-sm font-medium">
        추가 의견 선택
        <textarea
          value={values.comment}
          onChange={(event) => updateField("comment", event.target.value)}
          className="min-h-28 rounded-md border border-line px-3 py-3 text-sm"
          placeholder="추가로 남기고 싶은 이용 경험이나 개선 의견이 있다면 작성해주세요."
        />
      </label>

      <button
        type="submit"
        disabled={formStatus === "submitting"}
        className="h-11 rounded-md bg-accent px-4 text-sm font-semibold text-white disabled:opacity-50"
      >
        {formStatus === "submitting" ? "저장 중..." : "만족도 평가 제출"}
      </button>
    </form>
  );
}
