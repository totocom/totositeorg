"use client";

import { useMemo, useState } from "react";
import {
  CalculatorClientShell,
  DecimalInput,
  FormulaDetails,
  formatSignedWon,
  formatWon,
  parseDecimalOdds,
  parsePositiveAmount,
  ResetButton,
  ResultPanel,
} from "./calculator-client-ui";

const defaultOriginalStake = "10000";
const defaultOriginalOdds = "2.00";
const defaultOppositeOdds = "1.80";
const defaultManualOppositeStake = "10000";

type HedgeMode = "auto" | "manual";

export function HedgeCalculatorClient() {
  const [originalStake, setOriginalStake] = useState(defaultOriginalStake);
  const [originalOdds, setOriginalOdds] = useState(defaultOriginalOdds);
  const [oppositeOdds, setOppositeOdds] = useState(defaultOppositeOdds);
  const [manualOppositeStake, setManualOppositeStake] = useState(
    defaultManualOppositeStake,
  );
  const [mode, setMode] = useState<HedgeMode>("auto");

  const result = useMemo(() => {
    if (
      !originalStake ||
      !originalOdds ||
      !oppositeOdds ||
      (mode === "manual" && !manualOppositeStake)
    ) {
      return {
        state: "idle" as const,
        message: "금액과 소수 배당을 입력하면 결과별 예상 손익이 표시됩니다.",
      };
    }

    const parsedOriginalStake = parsePositiveAmount(originalStake);
    const parsedOriginalOdds = parseDecimalOdds(originalOdds);
    const parsedOppositeOdds = parseDecimalOdds(oppositeOdds);

    if (!parsedOriginalStake) {
      return {
        state: "error" as const,
        message: "기존 베팅 금액은 0보다 큰 숫자로 입력해주세요.",
      };
    }

    if (!parsedOriginalOdds) {
      return {
        state: "error" as const,
        message: "기존 베팅 배당은 1.01 이상으로 입력해주세요.",
      };
    }

    if (!parsedOppositeOdds) {
      return {
        state: "error" as const,
        message: "반대 결과 배당은 1.01 이상으로 입력해주세요.",
      };
    }

    const autoOppositeStake =
      (parsedOriginalStake * parsedOriginalOdds) / parsedOppositeOdds;
    const manualStake = parsePositiveAmount(manualOppositeStake);

    let oppositeStake = autoOppositeStake;

    if (mode === "manual") {
      if (!manualStake) {
        return {
          state: "error" as const,
          message: "직접 입력할 반대 베팅 금액은 0보다 큰 숫자로 입력해주세요.",
        };
      }

      oppositeStake = manualStake;
    }
    const totalStake = parsedOriginalStake + oppositeStake;
    const originalPayout = parsedOriginalStake * parsedOriginalOdds;
    const oppositePayout = oppositeStake * parsedOppositeOdds;
    const originalResultProfit = originalPayout - totalStake;
    const oppositeResultProfit = oppositePayout - totalStake;

    return {
      state: "ready" as const,
      items: [
        {
          label:
            mode === "auto"
              ? "계산된 반대 베팅 금액"
              : "입력한 반대 베팅 금액",
          value: formatWon(oppositeStake),
        },
        { label: "총 투입 금액", value: formatWon(totalStake) },
        {
          label: "기존 결과 적중 시 예상 손익",
          value: formatSignedWon(originalResultProfit),
          tone: originalResultProfit >= 0 ? "positive" as const : "negative" as const,
        },
        {
          label: "반대 결과 적중 시 예상 손익",
          value: formatSignedWon(oppositeResultProfit),
          tone: oppositeResultProfit >= 0 ? "positive" as const : "negative" as const,
        },
      ],
    };
  }, [
    manualOppositeStake,
    mode,
    oppositeOdds,
    originalOdds,
    originalStake,
  ]);

  return (
    <CalculatorClientShell>
      <div className="grid gap-4 md:grid-cols-3">
        <DecimalInput
          id="hedge-original-stake"
          label="기존 베팅 금액"
          value={originalStake}
          onChange={setOriginalStake}
          placeholder="10000"
          suffix="원"
          step="1000"
        />
        <DecimalInput
          id="hedge-original-odds"
          label="기존 베팅 배당"
          value={originalOdds}
          onChange={setOriginalOdds}
          placeholder="2.00"
          min="1.01"
        />
        <DecimalInput
          id="hedge-opposite-odds"
          label="반대 결과 배당"
          value={oppositeOdds}
          onChange={setOppositeOdds}
          placeholder="1.80"
          min="1.01"
        />
      </div>

      <div className="grid gap-3 rounded-lg border border-line bg-background p-4">
        <p className="text-sm font-semibold text-foreground">반대 베팅 금액 입력 방식</p>
        <div className="grid gap-2 sm:grid-cols-2">
          <button
            type="button"
            aria-pressed={mode === "auto"}
            onClick={() => setMode("auto")}
            className={`h-11 rounded-md border px-4 text-sm font-semibold transition ${
              mode === "auto"
                ? "border-accent bg-accent text-white"
                : "border-line text-foreground hover:bg-surface"
            }`}
          >
            자동 균등 지급 계산
          </button>
          <button
            type="button"
            aria-pressed={mode === "manual"}
            onClick={() => setMode("manual")}
            className={`h-11 rounded-md border px-4 text-sm font-semibold transition ${
              mode === "manual"
                ? "border-accent bg-accent text-white"
                : "border-line text-foreground hover:bg-surface"
            }`}
          >
            직접 반대 베팅 금액 입력
          </button>
        </div>
        {mode === "manual" ? (
          <DecimalInput
            id="hedge-manual-opposite-stake"
            label="직접 입력 반대 베팅 금액"
            value={manualOppositeStake}
            onChange={setManualOppositeStake}
            placeholder="10000"
            suffix="원"
            step="1000"
          />
        ) : null}
      </div>

      <ResultPanel {...result} />

      <div>
        <ResetButton
          onClick={() => {
            setOriginalStake(defaultOriginalStake);
            setOriginalOdds(defaultOriginalOdds);
            setOppositeOdds(defaultOppositeOdds);
            setManualOppositeStake(defaultManualOppositeStake);
            setMode("auto");
          }}
        />
      </div>

      <FormulaDetails>
        <p>반대 베팅 금액 = 기존 베팅 금액 x 기존 베팅 배당 / 반대 결과 배당</p>
        <p>총 투입 금액 = 기존 베팅 금액 + 반대 베팅 금액</p>
        <p>기존 결과 적중 시 손익 = 기존 베팅 지급액 - 총 투입 금액</p>
        <p>반대 결과 적중 시 손익 = 반대 베팅 지급액 - 총 투입 금액</p>
      </FormulaDetails>
    </CalculatorClientShell>
  );
}
