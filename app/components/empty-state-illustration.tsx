import Image from "next/image";

export type EmptyStateIllustrationKind =
  | "reviews"
  | "scam-reports"
  | "domains"
  | "search";

const emptyStateIllustrations: Record<
  EmptyStateIllustrationKind,
  { src: string; alt: string }
> = {
  reviews: {
    src: "/empty-states/reviews.svg",
    alt: "승인된 토토사이트 후기가 아직 없는 상태",
  },
  "scam-reports": {
    src: "/empty-states/scam-reports.svg",
    alt: "승인된 먹튀 피해 제보가 아직 없는 상태",
  },
  domains: {
    src: "/empty-states/domains.svg",
    alt: "공개 가능한 주소와 도메인 기록이 아직 없는 상태",
  },
  search: {
    src: "/empty-states/search.svg",
    alt: "검색 조건과 일치하는 결과가 없는 상태",
  },
};

type EmptyStateIllustrationProps = {
  kind: EmptyStateIllustrationKind;
  alt?: string;
  className?: string;
};

export function EmptyStateIllustration({
  kind,
  alt,
  className = "mx-auto h-[90px] w-[120px]",
}: EmptyStateIllustrationProps) {
  const illustration = emptyStateIllustrations[kind];

  return (
    <Image
      src={illustration.src}
      alt={alt ?? illustration.alt}
      width={160}
      height={120}
      sizes="160px"
      unoptimized
      className={className}
    />
  );
}
