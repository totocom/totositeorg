import Image from "next/image";
import Link from "next/link";

type SiteBlogVisualSummaryProps = {
  siteName: string;
  siteHref: string;
  logoUrl?: string | null;
  logoAlt?: string | null;
  screenshotUrl?: string | null;
  screenshotAlt?: string | null;
  screenshotCaption?: string | null;
};

export function SiteBlogVisualSummary({
  siteName,
  siteHref,
  logoUrl,
  logoAlt,
  screenshotUrl,
  screenshotAlt,
  screenshotCaption,
}: SiteBlogVisualSummaryProps) {
  if (!logoUrl && !screenshotUrl) return null;

  return (
    <section className="mt-5 border-t border-line pt-5">
      {logoUrl ? (
        <div className="flex items-center gap-3">
          <Image
            src={logoUrl}
            alt={logoAlt || `${siteName} 로고`}
            width={64}
            height={64}
            className="h-14 w-14 rounded-lg border border-line bg-white object-contain p-1.5 dark:bg-surface"
          />
          <div>
            <p className="text-xs font-bold uppercase text-muted">
              사이트 식별 이미지
            </p>
            <p className="mt-1 text-sm font-bold text-foreground">
              {siteName}
            </p>
          </div>
        </div>
      ) : null}

      {screenshotUrl ? (
        <figure className="mt-4">
          <div className="overflow-hidden rounded-lg bg-background">
            <Image
              src={screenshotUrl}
              alt={
                screenshotAlt || `${siteName} 토토사이트 메인 화면 스크린샷`
              }
              width={1200}
              height={675}
              priority
              sizes="(min-width: 1024px) 820px, (min-width: 640px) calc(100vw - 96px), calc(100vw - 48px)"
              className="h-auto w-full object-cover"
            />
          </div>
          {screenshotCaption ? (
            <figcaption className="mt-3 text-xs leading-5 text-muted">
              {screenshotCaption}
            </figcaption>
          ) : null}
        </figure>
      ) : null}

      <p className="mt-3 text-xs leading-5 text-muted">
        더 자세한 주소·도메인·DNS 기록은{" "}
        <Link
          href={siteHref}
          className="font-bold text-foreground underline decoration-accent/40 underline-offset-4 transition hover:text-accent"
        >
          {siteName} 주소·도메인 기록
        </Link>
        에서 확인할 수 있습니다.
      </p>
    </section>
  );
}
