"use client";

import Link from "next/link";
import { useId, useState } from "react";
import type { PublicDnsInfo } from "@/app/data/domain-dns";
import type { PublicWhoisInfo } from "@/app/data/domain-whois";
import { SiteDomainSubmissionForm } from "@/app/components/site-domain-submission-form";
import { formatKoreanDate } from "@/app/data/public-display";

export type DomainInfoTabItem = {
  siteId: string;
  siteName: string;
  domainUrl: string;
  displayDomain: string;
  domainAge: string;
  whoisInfo?: PublicWhoisInfo | null;
  dnsInfo?: PublicDnsInfo | null;
  isLoaded?: boolean;
};

type DomainInfoApiResponse = {
  whoisInfo: PublicWhoisInfo | null;
  dnsInfo: PublicDnsInfo | null;
  error?: string;
};

type DomainInfoTabsProps = {
  items: DomainInfoTabItem[];
  variant?: "card" | "embedded";
};

function formatWhoisDate(value: string) {
  return formatKoreanDate(value, "확인 불가");
}

function CompactInfo({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md bg-background p-3">
      <dt className="text-xs font-semibold uppercase text-muted">{label}</dt>
      <dd className="mt-1 break-all text-sm font-semibold text-foreground">
        {value || "확인 불가"}
      </dd>
    </div>
  );
}

function DnsRecord({ label, values }: { label: string; values: string[] }) {
  const canSearchByIp = label === "A" || label === "AAAA";

  return (
    <div className="rounded-md bg-background p-3">
      <dt className="text-xs font-semibold uppercase text-muted">{label}</dt>
      <dd className="mt-1 break-all text-sm leading-6 text-foreground">
        {values.length > 0 ? (
          <span className="grid gap-2">
            {values.map((value) => (
              <span
                key={value}
                className="flex flex-wrap items-center gap-x-2 gap-y-1"
              >
                <span>{value}</span>
                {canSearchByIp ? (
                  <Link
                    href={`/sites?search=${encodeURIComponent(value)}`}
                    className="inline-flex h-7 items-center rounded-md border border-line bg-background px-2 text-xs font-semibold text-foreground transition hover:border-accent hover:text-accent"
                  >
                    아이피로 검색
                  </Link>
                ) : null}
              </span>
            ))}
          </span>
        ) : (
          "확인된 값 없음"
        )}
      </dd>
    </div>
  );
}

export function DomainInfoTabs({ items, variant = "card" }: DomainInfoTabsProps) {
  const [domainItems, setDomainItems] = useState<DomainInfoTabItem[]>(items);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [loadingIndex, setLoadingIndex] = useState<number | null>(null);
  const [errorMessage, setErrorMessage] = useState("");
  const contentId = useId();

  if (domainItems.length === 0) {
    return null;
  }

  async function loadDomainInfo(index: number) {
    const item = domainItems[index];

    setErrorMessage("");

    if (activeIndex === index) {
      setActiveIndex(null);
      return;
    }

    setActiveIndex(index);

    if (!item || item.isLoaded || loadingIndex === index) {
      return;
    }

    setLoadingIndex(index);

    try {
      const params = new URLSearchParams({
        siteId: item.siteId,
        domainUrl: item.domainUrl,
      });
      const response = await fetch(`/api/sites/domain-info?${params.toString()}`);
      const payload = (await response.json()) as DomainInfoApiResponse;

      if (!response.ok) {
        throw new Error(payload.error || "도메인 정보를 불러오지 못했습니다.");
      }

      setDomainItems((currentItems) =>
        currentItems.map((currentItem, currentIndex) =>
          currentIndex === index
            ? {
                ...currentItem,
                whoisInfo: payload.whoisInfo,
                dnsInfo: payload.dnsInfo,
                isLoaded: true,
              }
            : currentItem,
        ),
      );
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "도메인 정보를 불러오지 못했습니다.";

      setErrorMessage(message);
      setDomainItems((currentItems) =>
        currentItems.map((currentItem, currentIndex) =>
          currentIndex === index
            ? {
                ...currentItem,
                whoisInfo: null,
                dnsInfo: null,
                isLoaded: true,
              }
            : currentItem,
        ),
      );
    } finally {
      setLoadingIndex(null);
    }
  }

  const activeItem = activeIndex === null ? null : domainItems[activeIndex];
  const whoisInfo = activeItem?.whoisInfo ?? null;
  const dnsInfo = activeItem?.dnsInfo ?? null;
  const isLoadingActive = activeIndex !== null && loadingIndex === activeIndex;
  const isActiveLoaded = Boolean(activeItem?.isLoaded);
  const sectionClassName =
    variant === "embedded"
      ? "scroll-mt-24"
      : "scroll-mt-24 rounded-xl border border-line bg-surface shadow-sm";
  const headerClassName =
    variant === "embedded" ? "pb-4" : "border-b border-line px-4 py-4";
  const tabListClassName =
    variant === "embedded"
      ? "border-b border-line py-3"
      : "border-b border-line px-4 py-3";
  const contentClassName =
    variant === "embedded"
      ? "grid gap-4 pt-4 lg:grid-cols-2"
      : "grid gap-4 p-4 lg:grid-cols-2";

  return (
    <section id="dns" className={sectionClassName}>
      <div className={headerClassName}>
        <p className="text-xs font-semibold uppercase tracking-wider text-accent">
          DNS·WHOIS 참고 정보
        </p>
        <h2 className="mt-1 text-base font-bold">
          도메인 조사 정보와 DNS·WHOIS 조회
        </h2>
        <p className="mt-2 text-sm leading-6 text-muted">
          아래 도메인 정보는 관리자 등록 정보와 공개 가능한 DNS·WHOIS 조회
          결과를 기준으로 정리됩니다. 조회 시점과 공개 범위에 따라 일부 레코드는
          비어 있을 수 있으며, DNS·WHOIS 정보만으로 사이트 안전성이나 이용
          가능성을 보장하지 않습니다.
        </p>
      </div>

      <SiteDomainSubmissionForm
        siteId={domainItems[0]?.siteId ?? ""}
        siteName={domainItems[0]?.siteName ?? ""}
      />

      <div className={tabListClassName}>
        <div className="flex gap-2 overflow-x-auto pb-1">
          {domainItems.map((item, index) => {
            const isActive = index === activeIndex;

            return (
              <button
                key={item.domainUrl}
                type="button"
                aria-expanded={isActive}
                aria-controls={contentId}
                aria-label={`${item.displayDomain} DNS·WHOIS 참고 정보 ${
                  isActive ? "닫기" : "보기"
                }`}
                onClick={() => void loadDomainInfo(index)}
                className={`shrink-0 rounded-md border px-3 py-2 text-left text-sm font-semibold transition ${
                  isActive
                    ? "border-accent bg-accent-soft text-accent"
                    : "border-line bg-background text-muted hover:text-foreground"
                }`}
              >
                <span className="block max-w-40 truncate">
                  {item.displayDomain}
                </span>
                <span className="mt-1 block text-xs font-medium">
                  {loadingIndex === index
                    ? "조회 상태 갱신"
                    : `운영 이력 ${item.domainAge}`}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {activeItem ? (
        <div id={contentId} className={contentClassName}>
          {errorMessage ? (
            <p className="rounded-md bg-red-50 p-3 text-sm font-semibold text-red-700 dark:bg-red-950/40 dark:text-red-400 lg:col-span-2">
              {errorMessage}
            </p>
          ) : null}
          <div className="min-w-0">
            <h3 className="text-sm font-semibold text-foreground">도메인 이력</h3>
            {isLoadingActive || !isActiveLoaded ? (
              <p
                className="mt-3 rounded-md bg-background p-3 text-sm text-muted"
                aria-live="polite"
              >
                WHOIS 조회 상태를 갱신합니다.
              </p>
            ) : whoisInfo?.errorMessage || !whoisInfo ? (
              <p className="mt-3 rounded-md bg-background p-3 text-sm text-muted">
                WHOIS 정보를 현재 표시할 수 없습니다. 개인정보 보호 설정이나
                조회 시점에 따라 일부 정보가 비공개일 수 있습니다.
              </p>
            ) : (
              <>
                <dl className="mt-3 grid gap-2">
                  <CompactInfo label="등록기관" value={whoisInfo.registrar} />
                  <CompactInfo
                    label="최초 등록일"
                    value={formatWhoisDate(whoisInfo.creationDate)}
                  />
                  <CompactInfo
                    label="만료일"
                    value={formatWhoisDate(whoisInfo.expirationDate)}
                  />
                  <CompactInfo
                    label="최근 갱신일"
                    value={formatWhoisDate(whoisInfo.updatedDate)}
                  />
                  <CompactInfo label="WHOIS 서버" value={whoisInfo.whoisServer} />
                  <CompactInfo label="DNSSEC" value={whoisInfo.dnssec} />
                </dl>
                <div className="mt-2 rounded-md bg-background p-3">
                  <p className="text-xs font-semibold uppercase text-muted">
                    네임서버
                  </p>
                  <p className="mt-1 break-all text-sm leading-6 text-foreground">
                    {whoisInfo.nameServers.length > 0
                      ? whoisInfo.nameServers.join(", ")
                      : "확인 불가"}
                  </p>
                </div>
              </>
            )}
          </div>

          <div className="min-w-0">
            <h3 className="text-sm font-semibold text-foreground">DNS 정보</h3>
            {isLoadingActive || !isActiveLoaded ? (
              <p
                className="mt-3 rounded-md bg-background p-3 text-sm text-muted"
                aria-live="polite"
              >
                DNS 레코드 조회 상태를 갱신합니다.
              </p>
            ) : dnsInfo?.errorMessage || !dnsInfo ? (
              <p className="mt-3 rounded-md bg-background p-3 text-sm text-muted">
                DNS 레코드를 현재 표시할 수 없습니다. 빈 값은 해당 레코드를
                확인하지 못했다는 뜻이며, 위험 또는 안전을 확정하는 의미는
                아닙니다.
              </p>
            ) : (
              <dl className="mt-3 grid gap-2">
                <DnsRecord label="A" values={dnsInfo.a} />
                <DnsRecord label="AAAA" values={dnsInfo.aaaa} />
                <DnsRecord label="CNAME" values={dnsInfo.cname} />
                <DnsRecord label="MX" values={dnsInfo.mx} />
                <DnsRecord label="NS" values={dnsInfo.ns} />
                <DnsRecord label="TXT" values={dnsInfo.txt} />
                <DnsRecord label="SOA" values={dnsInfo.soa ? [dnsInfo.soa] : []} />
              </dl>
            )}
          </div>
        </div>
      ) : (
        <div id={contentId} className="p-4">
          <p className="rounded-md bg-background p-4 text-sm font-semibold text-muted">
            도메인을 선택하면 WHOIS 이력과 DNS 레코드가 표시됩니다.
          </p>
        </div>
      )}
    </section>
  );
}
