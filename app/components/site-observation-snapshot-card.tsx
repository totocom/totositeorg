import {
  buildSiteObservationSnapshotViewModel,
  type PublicSiteObservationAssets,
  type PublicSiteObservationSnapshot,
} from "@/app/data/public-site-observation-snapshot";

type SiteObservationSnapshotCardProps = {
  snapshot: PublicSiteObservationSnapshot | null;
  assets: PublicSiteObservationAssets;
};

const observationIntro =
  "조회 시점 기준 원본 페이지의 공개 HTML에서 확인된 화면 및 주요 표시 정보를 정리했습니다. 이 정보는 사이트 식별과 화면 기록 확인을 위한 자료이며, 가입 또는 이용을 권유하기 위한 목적이 아닙니다.";

export function SiteObservationSnapshotCard({
  snapshot,
  assets,
}: SiteObservationSnapshotCardProps) {
  const model = buildSiteObservationSnapshotViewModel({ snapshot, assets });

  if (!model.hasSnapshot) return null;

  const observedGroups = [
    {
      label: "주요 메뉴",
      values: model.menuLabels,
    },
    {
      label: "계정 관련 관측 요소",
      values: model.accountFeatures,
    },
    {
      label: "베팅 관련 관측 요소",
      values: model.bettingFeatures,
    },
    {
      label: "footer / copyright",
      values: model.footerText,
    },
    {
      label: "관측 배지",
      values: model.badges,
    },
  ];

  return (
    <section className="mt-5 rounded-xl border border-line bg-surface shadow-sm">
      <div className="border-b border-line px-5 py-4">
        <p className="text-xs font-semibold uppercase tracking-wider text-accent">
          원본 사이트 관측 정보
        </p>
        <h2 className="mt-1 text-base font-bold">
          조회 시점 공개 화면 기록
        </h2>
        <p className="mt-2 text-sm leading-6 text-muted">{observationIntro}</p>
      </div>

      <div className="grid gap-5 p-5 lg:grid-cols-[minmax(0,1.1fr)_minmax(320px,0.9fr)]">
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <ObservationMetaItem
              label="마지막 조회 시각"
              value={formatObservationDateTime(model.collectedAt)}
            />
            <ObservationMetaItem
              label="조회 기준"
              value={model.sourceTypeLabel}
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <ObservationMetaItem label="page title" value={model.pageTitle} />
            <ObservationMetaItem label="h1" value={model.h1} />
          </div>

          {observedGroups.map((group) => (
            <ObservationList
              key={group.label}
              label={group.label}
              values={group.values}
            />
          ))}

          <div className="grid gap-3 sm:grid-cols-2">
            <ObservationSignal
              label="금전 관련 관측"
              observed={model.paymentPhraseObserved}
              observedText="관련 문구 관측됨"
            />
            <ObservationSignal
              label="공지 영역 관측"
              observed={model.noticeOrEventObserved}
              observedText="공지 또는 이벤트 영역이 관측됨"
            />
          </div>

          <p className="rounded-lg border border-line bg-background px-4 py-3 text-xs leading-5 text-muted">
            {model.promotionalFlagsNotice}
          </p>
        </div>

        <aside className="space-y-3">
          {model.screenshotUrl ? (
            <div className="overflow-hidden rounded-lg border border-line bg-background">
              <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-2">
                <span className="text-xs font-semibold text-muted">
                  화면 이미지
                </span>
                <span className="text-xs text-muted">
                  {model.screenshotSource === "site"
                    ? "사이트 대표 이미지"
                    : "관측 snapshot 이미지"}
                </span>
              </div>
              <div className="bg-background p-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={model.screenshotUrl}
                  alt={`${assets.siteName} 원본 사이트 관측 화면`}
                  loading="lazy"
                  decoding="async"
                  className="aspect-video w-full rounded-md object-cover"
                />
              </div>
            </div>
          ) : null}

          {model.iconUrl ? (
            <div className="flex items-center gap-3 rounded-lg border border-line bg-background p-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={model.iconUrl}
                alt={model.iconAlt}
                loading="lazy"
                decoding="async"
                className="h-10 w-10 rounded-md border border-line bg-white object-contain p-1 dark:bg-surface"
              />
              <p className="text-xs leading-5 text-muted">
                공개 상세 페이지에 저장된 favicon/logo만 표시합니다.
              </p>
            </div>
          ) : null}
        </aside>
      </div>
    </section>
  );
}

function ObservationMetaItem({
  label,
  value,
}: {
  label: string;
  value: string | null;
}) {
  return (
    <div className="rounded-lg border border-line bg-background p-3">
      <p className="text-xs font-semibold text-muted">{label}</p>
      <p className="mt-1 break-words text-sm font-semibold text-foreground">
        {value || "관측값 없음"}
      </p>
    </div>
  );
}

function ObservationList({
  label,
  values,
}: {
  label: string;
  values: string[];
}) {
  return (
    <div className="rounded-lg border border-line bg-background p-3">
      <p className="text-xs font-semibold text-muted">{label}</p>
      {values.length > 0 ? (
        <ul className="mt-2 flex flex-wrap gap-2">
          {values.map((value) => (
            <li
              key={value}
              className="rounded-md border border-line bg-surface px-2.5 py-1 text-xs font-semibold text-foreground"
            >
              {value}
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-2 text-xs text-muted">관측값 없음</p>
      )}
    </div>
  );
}

function ObservationSignal({
  label,
  observed,
  observedText,
}: {
  label: string;
  observed: boolean;
  observedText: string;
}) {
  return (
    <div className="rounded-lg border border-line bg-background p-3">
      <p className="text-xs font-semibold text-muted">{label}</p>
      <p className="mt-1 text-sm font-semibold text-foreground">
        {observed ? observedText : "관측값 없음"}
      </p>
    </div>
  );
}

function formatObservationDateTime(value: string) {
  const date = new Date(value);

  if (!Number.isFinite(date.getTime())) return value;

  return new Intl.DateTimeFormat("ko-KR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}
