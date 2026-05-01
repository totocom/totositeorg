"use client";

import Link from "next/link";
import { useState } from "react";
import { formatDisplayUrl } from "@/app/data/domain-display";

type SameIpSite = {
  id: string;
  slug: string;
  siteName: string;
  siteUrl: string;
  matchedDomains: string[];
  matchedIps: string[];
};

type SameIpSitesSectionProps = {
  siteId: string;
  currentIps: string[];
};

export function SameIpSitesSection({
  siteId,
  currentIps,
}: SameIpSitesSectionProps) {
  const uniqueIps = Array.from(new Set(currentIps.filter(Boolean))).sort();
  const [selectedIp, setSelectedIp] = useState("");
  const [matches, setMatches] = useState<SameIpSite[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState("");

  if (uniqueIps.length === 0) {
    return null;
  }

  async function loadMatches(ip: string) {
    setSelectedIp(ip);
    setIsLoading(true);
    setMessage("");
    setMatches([]);

    try {
      const response = await fetch(
        `/api/sites/same-ip?siteId=${encodeURIComponent(siteId)}&ip=${encodeURIComponent(ip)}`,
      );
      const result = (await response.json().catch(() => null)) as {
        matches?: SameIpSite[];
        error?: string;
      } | null;

      if (!response.ok) {
        throw new Error(result?.error ?? "동일 IP 사이트 조회에 실패했습니다.");
      }

      const nextMatches = result?.matches ?? [];
      setMatches(nextMatches);

      if (nextMatches.length === 0) {
        setMessage("같은 IP를 사용하는 공개 사이트가 없습니다.");
      }
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "동일 IP 사이트 조회에 실패했습니다.",
      );
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <section className="mt-5 rounded-xl border border-line bg-surface shadow-sm">
      <div className="border-b border-line px-5 py-3">
        <p className="text-xs font-semibold uppercase tracking-wider text-accent">동일 IP 연결</p>
        <h2 className="mt-1 text-base font-bold">같은 IP를 사용하는 사이트</h2>
        <p className="mt-1 text-xs text-muted">
          IP를 선택하면 같은 DNS A/AAAA 레코드를 쓰는 공개 사이트를 조회합니다.
        </p>
      </div>
      <div className="p-4">
        <div className="flex flex-wrap gap-2">
          {uniqueIps.map((ip) => (
            <button
              key={ip}
              type="button"
              onClick={() => loadMatches(ip)}
              disabled={isLoading && selectedIp === ip}
              className={`rounded-full border px-3 py-1 text-xs font-semibold transition ${
                selectedIp === ip
                  ? "border-accent bg-accent-soft text-accent"
                  : "border-line bg-background text-muted hover:border-accent/50 hover:text-accent"
              }`}
            >
              {isLoading && selectedIp === ip ? "조회 중..." : ip}
            </button>
          ))}
        </div>

        {message ? (
          <p className="mt-3 rounded-lg border border-line bg-background px-3 py-2 text-xs text-muted">
            {message}
          </p>
        ) : null}

        {matches.length > 0 ? (
          <div className="mt-4 grid gap-2">
            {matches.map((match) => (
              <Link
                key={match.id}
                href={`/sites/${match.slug}`}
                className="rounded-lg border border-line bg-background p-4 transition hover:border-accent/50"
              >
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-foreground">{match.siteName}</p>
                    <p className="mt-0.5 break-all text-xs text-muted">
                      {formatDisplayUrl(match.matchedDomains[0] ?? match.siteUrl)}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-1.5 sm:justify-end">
                    {match.matchedIps.map((ip) => (
                      <span
                        key={ip}
                        className="rounded-full bg-accent-soft px-2.5 py-0.5 text-xs font-semibold text-accent"
                      >
                        {ip}
                      </span>
                    ))}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        ) : null}
      </div>
    </section>
  );
}
