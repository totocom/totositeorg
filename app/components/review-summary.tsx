import { reviewSurveySections } from "@/app/data/review-survey";
import { sanitizePublicUserText } from "@/app/data/public-display";
import {
  buildReviewSelectionSummary,
  parseReviewSurveyPayload,
  publicReviewAnswerText,
} from "@/app/data/public-seo-selection";

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

const publicQuestionLabelOverrides = new Map([
  ["recommendation", "타인 공유 의향"],
  ["reuse_intention", "재이용 관련 응답"],
  ["overall_safety", "안전성 체감 평가"],
  ["site_trust", "사이트 신뢰도 체감"],
  ["privacy_satisfaction", "개인정보 보호 체감"],
  ["transaction_stability", "거래 안정성 체감"],
]);

const surveyAnswerGroups = [
  {
    title: "이용 정보",
    ids: [
      "purpose",
      "frequency",
      "main_time",
      "usage_period",
      "betting_category",
      "sports_betting",
      "casino_betting",
      "slot_betting",
      "mini_game_betting",
      "other_betting",
    ],
  },
  {
    title: "카지노·슬롯 평가",
    ids: [
      "sports_odds_satisfaction",
      "sports_odds_compare",
      "sports_live_odds",
      "casino_payout_satisfaction",
      "casino_table_odds",
      "slot_return_satisfaction",
      "slot_jackpot_odds",
      "mini_game_odds_satisfaction",
      "mini_game_odds_stability",
      "other_betting_odds_satisfaction",
      "other_betting_odds_clarity",
    ],
  },
  {
    title: "이벤트 평가",
    ids: [
      "event_satisfaction",
      "event_type",
      "event_difficulty",
      "event_reward",
    ],
  },
  {
    title: "고객센터 평가",
    ids: ["cs_response_speed", "cs_accuracy", "cs_kindness", "cs_channel"],
  },
  {
    title: "충전·환전 평가",
    ids: [
      "deposit_speed",
      "deposit_stability",
      "withdraw_speed",
      "withdraw_stability",
    ],
  },
  {
    title: "접속·모바일 사용성",
    ids: ["access_speed", "screen_layout", "mobile_usability", "error_lag"],
  },
  {
    title: "신뢰도·안전성 체감",
    ids: [
      "site_trust",
      "privacy_satisfaction",
      "transaction_stability",
      "overall_safety",
      "overall_satisfaction",
      "reuse_intention",
      "recommendation",
    ],
  },
  {
    title: "불만족 항목",
    ids: [
      "worst_part",
      "improvement_priority",
      "odds_complaint",
      "event_complaint",
      "cs_complaint",
      "withdraw_complaint",
    ],
  },
];

function publicQuestionLabel(id: string) {
  return publicQuestionLabelOverrides.get(id) ?? questionLabelById.get(id) ?? id;
}

function getHighlights(answers: Record<string, string | string[]>) {
  return [
    ["이용 목적", publicReviewAnswerText(answers.purpose)],
    ["이용 빈도", publicReviewAnswerText(answers.frequency)],
    ["전체 만족도", publicReviewAnswerText(answers.overall_satisfaction)],
    ["재이용 관련 응답", publicReviewAnswerText(answers.reuse_intention)],
    ["타인 공유 의향", publicReviewAnswerText(answers.recommendation)],
    ["만족한 부분", publicReviewAnswerText(answers.best_part)],
    ["개선 우선순위", publicReviewAnswerText(answers.improvement_priority)],
  ].filter(([, value]) => value);
}

function getGroupedSurveyAnswers(answers: Record<string, string | string[]>) {
  const usedIds = new Set<string>();
  const groups = surveyAnswerGroups.flatMap((group) => {
    const entries = group.ids.flatMap((id) => {
      const value = publicReviewAnswerText(answers[id]);

      if (!value) return [];

      usedIds.add(id);

      return [
        {
          id,
          label: publicQuestionLabel(id),
          value,
          note:
            id === "overall_safety"
              ? "이 항목은 작성자의 주관적 체감 평가이며 실제 안전성을 보장하거나 확정하는 지표가 아닙니다."
              : null,
        },
      ];
    });

    if (entries.length === 0) return [];

    return [{ title: group.title, entries }];
  });

  const remainingEntries = Object.entries(answers).flatMap(([id, value]) => {
    if (usedIds.has(id)) return [];

    const text = publicReviewAnswerText(value);

    if (!text) return [];

    return [
      {
        id,
        label: publicQuestionLabel(id),
        value: text,
        note: null,
      },
    ];
  });

  if (remainingEntries.length > 0) {
    groups.push({ title: "기타 응답", entries: remainingEntries });
  }

  return groups;
}

export function ReviewSummary({
  siteName,
  experience,
  compact = false,
}: ReviewSummaryProps) {
  const payload = parseReviewSurveyPayload(experience);

  if (!payload) {
    return (
      <div className="mt-3 grid gap-2 text-sm">
        <p className="rounded-md border border-line bg-surface px-3 py-2 text-xs leading-5 text-muted">
          아래 추가 의견은 이용자가 직접 작성한 내용이며, 사이트의 공식 판단이나
          사실 확정을 의미하지 않습니다.
        </p>
        <p className="leading-6 text-muted">
          {sanitizePublicUserText(experience)}
        </p>
      </div>
    );
  }

  const answers = payload.answers ?? {};
  const highlights = getHighlights(answers);
  const detailGroups = getGroupedSurveyAnswers(answers);
  const publicComment = payload.comment
    ? sanitizePublicUserText(payload.comment)
    : "";

  return (
    <div className="mt-3 grid gap-3 text-sm">
      <p className="rounded-md bg-background p-3 leading-6 text-foreground">
        {buildReviewSelectionSummary(siteName, payload)}
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

      {publicComment ? (
        <blockquote className="rounded-md border border-line bg-surface px-3 py-2 text-muted">
          <p className="text-xs leading-5">
            아래 추가 의견은 이용자가 직접 작성한 내용이며, 사이트의 공식
            판단이나 사실 확정을 의미하지 않습니다.
          </p>
          <p className="mt-2 leading-6 text-foreground">
            추가 의견: {publicComment}
          </p>
        </blockquote>
      ) : null}

      {!compact && detailGroups.length > 0 ? (
        <details className="rounded-md border border-line bg-surface p-3">
          <summary className="cursor-pointer font-semibold text-foreground">
            상세 설문 응답 보기
          </summary>
          <div className="mt-3 grid gap-3">
            {detailGroups.map((group) => (
              <section key={group.title} className="rounded-md bg-background p-3">
                <h4 className="text-sm font-bold text-foreground">
                  {group.title}
                </h4>
                <dl className="mt-2 grid gap-2 sm:grid-cols-2">
                  {group.entries.map((entry) => (
                    <div
                      key={entry.id}
                      className="rounded-md border border-line bg-surface p-3"
                    >
                      <dt className="text-xs font-semibold text-muted">
                        {entry.label}
                      </dt>
                      <dd className="mt-1 leading-5 text-foreground">
                        {entry.value}
                      </dd>
                      {entry.note ? (
                        <dd className="mt-2 text-xs leading-5 text-muted">
                          {entry.note}
                        </dd>
                      ) : null}
                    </div>
                  ))}
                </dl>
              </section>
            ))}
          </div>
        </details>
      ) : null}
    </div>
  );
}

export function getReviewSeoSummary(siteName: string, experience: string) {
  const payload = parseReviewSurveyPayload(experience);
  if (!payload) return sanitizePublicUserText(experience);
  return buildReviewSelectionSummary(siteName, payload);
}
