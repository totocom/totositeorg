import { reviewSurveySections } from "@/app/data/review-survey";

type SurveyPayload = {
  type?: string;
  answers?: Record<string, string | string[]>;
  comment?: string | null;
};

type ReviewSummaryProps = {
  siteName: string;
  experience: string;
  compact?: boolean;
};

const questionLabelById = new Map(
  reviewSurveySections.flatMap((section) =>
    section.questions.map((question) => [question.id, question.label] as const),
  ),
);

function parseSurveyPayload(experience: string): SurveyPayload | null {
  try {
    const parsed = JSON.parse(experience) as SurveyPayload;
    if (parsed?.type !== "site_satisfaction_survey" || !parsed.answers) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

function answerText(value: string | string[] | undefined) {
  if (!value) return "";
  return Array.isArray(value) ? value.join(", ") : value;
}

function getHighlights(answers: Record<string, string | string[]>) {
  return [
    ["이용 목적", answerText(answers.purpose)],
    ["이용 빈도", answerText(answers.frequency)],
    ["전체 만족도", answerText(answers.overall_satisfaction)],
    ["재이용 의향", answerText(answers.reuse_intention)],
    ["추천 의향", answerText(answers.recommendation)],
    ["만족한 부분", answerText(answers.best_part)],
    ["개선 우선순위", answerText(answers.improvement_priority)],
  ].filter(([, value]) => value);
}

function getCategorySummary(answers: Record<string, string | string[]>) {
  return [
    answerText(answers.betting_category),
    answerText(answers.sports_betting),
    answerText(answers.casino_betting),
    answerText(answers.slot_betting),
    answerText(answers.mini_game_betting),
    answerText(answers.other_betting),
  ]
    .filter(Boolean)
    .join(", ");
}

function buildSeoSummary(siteName: string, payload: SurveyPayload) {
  const answers = payload.answers ?? {};
  const satisfaction = answerText(answers.overall_satisfaction) || "보통";
  const purpose = answerText(answers.purpose) || "이용 경험 확인";
  const bestPart = answerText(answers.best_part) || "서비스 전반";
  const improvement = answerText(answers.improvement_priority) || "추가 개선 항목";
  const categories = getCategorySummary(answers) || "주요 서비스";

  return `${siteName} 이용자는 ${purpose} 목적으로 ${categories}를 이용했으며, 전체 만족도는 ${satisfaction}으로 평가했습니다. 특히 ${bestPart} 항목을 긍정적으로 봤고, 향후 ${improvement} 개선을 우선 과제로 선택했습니다.`;
}

export function ReviewSummary({
  siteName,
  experience,
  compact = false,
}: ReviewSummaryProps) {
  const payload = parseSurveyPayload(experience);

  if (!payload) {
    return <p className="mt-3 text-sm leading-6 text-muted">{experience}</p>;
  }

  const answers = payload.answers ?? {};
  const highlights = getHighlights(answers);
  const detailEntries = Object.entries(answers).filter(
    ([key]) =>
      ![
        "purpose",
        "frequency",
        "overall_satisfaction",
        "reuse_intention",
        "recommendation",
        "best_part",
        "improvement_priority",
      ].includes(key),
  );

  return (
    <div className="mt-3 grid gap-3 text-sm">
      <p className="rounded-md bg-background p-3 leading-6 text-foreground">
        {buildSeoSummary(siteName, payload)}
      </p>

      <div className="flex flex-wrap gap-2">
        {highlights.map(([label, value]) => (
          <span
            key={label}
            className="rounded-full bg-accent-soft px-3 py-1 text-xs font-semibold text-accent"
          >
            {label}: {value}
          </span>
        ))}
      </div>

      {payload.comment ? (
        <blockquote className="rounded-md border border-line bg-white px-3 py-2 text-muted">
          추가 의견: {payload.comment}
        </blockquote>
      ) : null}

      {!compact && detailEntries.length > 0 ? (
        <details className="rounded-md border border-line bg-white p-3">
          <summary className="cursor-pointer font-semibold text-foreground">
            상세 설문 응답 보기
          </summary>
          <dl className="mt-3 grid gap-2 sm:grid-cols-2">
            {detailEntries.map(([key, value]) => (
              <div key={key} className="rounded-md bg-background p-3">
                <dt className="text-xs font-semibold text-muted">
                  {questionLabelById.get(key) ?? key}
                </dt>
                <dd className="mt-1 leading-5 text-foreground">
                  {answerText(value)}
                </dd>
              </div>
            ))}
          </dl>
        </details>
      ) : null}
    </div>
  );
}

export function getReviewSeoSummary(siteName: string, experience: string) {
  const payload = parseSurveyPayload(experience);
  if (!payload) return experience;
  return buildSeoSummary(siteName, payload);
}
