"use client";

import Link from "next/link";
import { useState } from "react";
import type { PublicDnsInfo } from "@/app/data/domain-dns";
import type { PublicWhoisInfo } from "@/app/data/domain-whois";
import { SiteDomainSubmissionForm } from "@/app/components/site-domain-submission-form";

export type DomainInfoTabItem = {
  siteId: string;
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

function formatWhoisDate(value: string) {
  if (!value) return "확인 불가";

  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(value));
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
          "없음"
        )}
      </dd>
    </div>
  );
}

export function DomainInfoTabs({ items }: { items: DomainInfoTabItem[] }) {
  const [domainItems, setDomainItems] = useState<DomainInfoTabItem[]>(items);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [loadingIndex, setLoadingIndex] = useState<number | null>(null);
  const [errorMessage, setErrorMessage] = useState("");

  if (domainItems.length === 0) {
    return null;
  }

  async function loadDomainInfo(index: number) {
    const item = domainItems[index];

    setActiveIndex(index);
    setErrorMessage("");

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

  return (
    <section id="dns" className="mt-6 scroll-mt-24 rounded-lg border border-line bg-surface shadow-sm">
      <div className="border-b border-line px-5 py-4">
        <p className="text-sm font-semibold uppercase text-accent">
          도메인 조사 정보
        </p>
        <h2 className="mt-1 text-xl font-bold">도메인 이력 및 DNS</h2>
      </div>

      <SiteDomainSubmissionForm siteId={domainItems[0]?.siteId ?? ""} />

      <div className="border-b border-line px-5 py-3">
        <div className="flex gap-2 overflow-x-auto pb-1">
          {domainItems.map((item, index) => {
            const isActive = index === activeIndex;

            return (
              <button
                key={item.domainUrl}
                type="button"
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
                  {loadingIndex === index ? "조회 중..." : `운영 이력 ${item.domainAge}`}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {activeItem ? (
        <div className="grid gap-4 p-5 lg:grid-cols-2">
          {errorMessage ? (
            <p className="rounded-md bg-red-50 p-3 text-sm font-semibold text-red-700 dark:bg-red-950/40 dark:text-red-400 lg:col-span-2">
              {errorMessage}
            </p>
          ) : null}
          <div>
            <h3 className="text-sm font-semibold text-foreground">도메인 이력</h3>
            {isLoadingActive || !isActiveLoaded ? (
              <p className="mt-3 rounded-md bg-background p-3 text-sm text-muted">
                도메인 이력을 조회하고 있습니다.
              </p>
            ) : whoisInfo?.errorMessage || !whoisInfo ? (
              <p className="mt-3 rounded-md bg-background p-3 text-sm text-muted">
                WHOIS 정보를 현재 조회할 수 없습니다.
              </p>
            ) : (
              <>
                <dl className="mt-3 grid gap-2 sm:grid-cols-2">
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

          <div>
            <h3 className="text-sm font-semibold text-foreground">DNS 정보</h3>
            {isLoadingActive || !isActiveLoaded ? (
              <p className="mt-3 rounded-md bg-background p-3 text-sm text-muted">
                DNS 레코드를 조회하고 있습니다.
              </p>
            ) : dnsInfo?.errorMessage || !dnsInfo ? (
              <p className="mt-3 rounded-md bg-background p-3 text-sm text-muted">
                DNS 레코드를 현재 조회할 수 없습니다.
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
        <div className="p-5">
          <p className="rounded-md bg-background p-4 text-sm font-semibold text-muted">
            도메인을 선택하면 상세 이력과 DNS 레코드가 표시됩니다.
          </p>
        </div>
      )}
    </section>
  );
}
