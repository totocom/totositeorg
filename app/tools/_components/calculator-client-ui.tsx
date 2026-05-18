"use client";

import type { ReactNode } from "react";

export const MIN_DECIMAL_ODDS = 1.01;

const wonFormatter = new Intl.NumberFormat("ko-KR", {
  maximumFractionDigits: 0,
});

export type CalculationState = "idle" | "error" | "ready";

export type ResultItem = {
  label: string;
  value: string;
  tone?: "default" | "positive" | "negative" | "warning";
};

type ResultPanelProps = {
  state: CalculationState;
  message?: string;
  items?: ResultItem[];
};

type DecimalInputProps = {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  suffix?: string;
  step?: string;
  min?: string;
};

export function sanitizeDecimalInput(value: string) {
  const normalized = value.replace(/,/g, "").replace(/[^\d.]/g, "");
  const [head, ...tail] = normalized.split(".");

  return tail.length > 0 ? `${head}.${tail.join("")}` : head;
}

export function parseCalculatorNumber(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return null;

  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : null;
}

export function parsePositiveAmount(value: string) {
  const parsed = parseCalculatorNumber(value);
  return parsed !== null && parsed > 0 ? parsed : null;
}

export function parseDecimalOdds(value: string) {
  const parsed = parseCalculatorNumber(value);
  return parsed !== null && parsed >= MIN_DECIMAL_ODDS ? parsed : null;
}

export function parseProbabilityPercent(value: string) {
  const parsed = parseCalculatorNumber(value);
  return parsed !== null && parsed >= 0 && parsed <= 100 ? parsed : null;
}

export function formatWon(value: number) {
  return `${wonFormatter.format(Math.round(value))}원`;
}

export function formatSignedWon(value: number) {
  if (Math.abs(value) < 0.5) return "0원";

  return value > 0 ? `+${formatWon(value)}` : `-${formatWon(Math.abs(value))}`;
}

export function formatOdds(value: number) {
  return value.toLocaleString("ko-KR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 3,
  });
}

export function formatPercent(value: number) {
  return `${value.toLocaleString("ko-KR", {
    minimumFractionDigits: value % 1 === 0 ? 0 : 1,
    maximumFractionDigits: 2,
  })}%`;
}

export function DecimalInput({
  id,
  label,
  value,
  onChange,
  placeholder,
  suffix,
  step = "0.01",
  min = "0",
}: DecimalInputProps) {
  return (
    <label htmlFor={id} className="block">
      <span className="text-sm font-semibold text-foreground">{label}</span>
      <span className="mt-2 flex items-center rounded-md border border-line bg-background px-3 transition focus-within:border-accent">
        <input
          id={id}
          type="text"
          inputMode="decimal"
          min={min}
          step={step}
          value={value}
          onChange={(event) => onChange(sanitizeDecimalInput(event.target.value))}
          placeholder={placeholder}
          className="h-11 min-w-0 flex-1 bg-transparent text-base text-foreground outline-none placeholder:text-muted"
        />
        {suffix ? (
          <span className="ml-2 shrink-0 text-sm font-semibold text-muted">
            {suffix}
          </span>
        ) : null}
      </span>
    </label>
  );
}

export function ResultPanel({ state, message, items = [] }: ResultPanelProps) {
  if (state !== "ready") {
    return (
      <div
        className={`rounded-lg border p-4 text-sm leading-6 ${
          state === "error"
            ? "border-red-200 bg-red-50 text-red-700"
            : "border-line bg-background text-muted"
        }`}
      >
        {message}
      </div>
    );
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {items.map((item) => (
        <div
          key={item.label}
          className="rounded-lg border border-line bg-background p-4"
        >
          <p className="text-xs font-semibold text-muted">{item.label}</p>
          <p
            className={`mt-1 break-words text-xl font-bold ${
              item.tone === "positive"
                ? "text-accent"
                : item.tone === "negative"
                  ? "text-red-700"
                  : item.tone === "warning"
                    ? "text-yellow-700"
                    : "text-foreground"
            }`}
          >
            {item.value}
          </p>
        </div>
      ))}
    </div>
  );
}

export function FormulaDetails({ children }: { children: ReactNode }) {
  return (
    <details className="rounded-lg border border-line bg-background p-4 text-sm leading-6 text-muted">
      <summary className="cursor-pointer font-semibold text-foreground">
        계산 공식 보기
      </summary>
      <div className="mt-3 grid gap-1">{children}</div>
    </details>
  );
}

export function CalculatorClientShell({ children }: { children: ReactNode }) {
  return (
    <section className="rounded-lg border border-line bg-surface p-5 shadow-sm">
      <div className="grid gap-5">{children}</div>
    </section>
  );
}

export function ResetButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="h-10 rounded-md border border-line px-4 text-sm font-semibold text-foreground transition hover:bg-background"
    >
      초기값으로 재설정
    </button>
  );
}
