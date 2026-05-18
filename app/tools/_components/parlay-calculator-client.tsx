"use client";

import { useMemo, useState } from "react";
import {
  CalculatorClientShell,
  DecimalInput,
  FormulaDetails,
  formatOdds,
  formatWon,
  parseDecimalOdds,
  parsePositiveAmount,
  ResetButton,
  ResultPanel,
} from "./calculator-client-ui";

const defaultStake = "10000";
const defaultOddsRows = ["1.50", "1.85"];
const minRows = 2;
const maxRows = 10;

export function ParlayCalculatorClient() {
  const [stake, setStake] = useState(defaultStake);
  const [oddsRows, setOddsRows] = useState(defaultOddsRows);

  const result = useMemo(() => {
    if (!stake || oddsRows.some((value) => !value)) {
      return {
        state: "idle" as const,
        message: "베팅 금액과 각 배당을 입력하면 결과가 표시됩니다.",
      };
    }

    const parsedStake = parsePositiveAmount(stake);
    if (!parsedStake) {
      return {
        state: "error" as const,
        message: "베팅 금액은 0보다 큰 숫자로 입력해주세요.",
      };
    }

    const parsedOddsRows = oddsRows.map(parseDecimalOdds);
    const invalidRows = parsedOddsRows
      .map((odds, index) => (odds ? null : index + 1))
      .filter((index): index is number => index !== null);

    if (invalidRows.length > 0) {
      return {
        state: "error" as const,
        message: `${invalidRows.join(", ")}번 배당을 1.01 이상으로 입력해주세요.`,
      };
    }

    const combinedOdds = (parsedOddsRows as number[]).reduce(
      (total, odds) => total * odds,
      1,
    );
    const payout = parsedStake * combinedOdds;
    const profit = payout - parsedStake;

    return {
      state: "ready" as const,
      items: [
        { label: "조합 배당", value: formatOdds(combinedOdds) },
        { label: "예상 지급액", value: formatWon(payout) },
        { label: "예상 수익", value: formatWon(profit), tone: "positive" as const },
      ],
    };
  }, [stake, oddsRows]);

  function updateOddsRow(index: number, value: string) {
    setOddsRows((current) =>
      current.map((item, itemIndex) => (itemIndex === index ? value : item)),
    );
  }

  return (
    <CalculatorClientShell>
      <DecimalInput
        id="parlay-stake"
        label="베팅 금액"
        value={stake}
        onChange={setStake}
        placeholder="10000"
        suffix="원"
        step="1000"
      />

      <div className="grid gap-3">
        {oddsRows.map((odds, index) => (
          <div key={index} className="grid gap-2 sm:grid-cols-[1fr_auto]">
            <DecimalInput
              id={`parlay-odds-${index}`}
              label={`배당 ${index + 1}`}
              value={odds}
              onChange={(value) => updateOddsRow(index, value)}
              placeholder="1.85"
              min="1.01"
            />
            <button
              type="button"
              onClick={() =>
                setOddsRows((current) =>
                  current.filter((_, itemIndex) => itemIndex !== index),
                )
              }
              disabled={oddsRows.length <= minRows}
              className="h-11 self-end rounded-md border border-line px-4 text-sm font-semibold text-foreground transition hover:bg-background disabled:cursor-not-allowed disabled:opacity-45"
            >
              삭제
            </button>
          </div>
        ))}
        <button
          type="button"
          onClick={() => setOddsRows((current) => [...current, ""])}
          disabled={oddsRows.length >= maxRows}
          className="h-11 rounded-md border border-line bg-background px-4 text-sm font-semibold text-foreground transition hover:border-accent disabled:cursor-not-allowed disabled:opacity-45 sm:w-fit"
        >
          배당 입력 행 추가
        </button>
      </div>

      <ResultPanel {...result} />

      <div>
        <ResetButton
          onClick={() => {
            setStake(defaultStake);
            setOddsRows(defaultOddsRows);
          }}
        />
      </div>

      <FormulaDetails>
        <p>조합 배당 = 배당1 x 배당2 x 배당3 ...</p>
        <p>예상 지급액 = 베팅 금액 x 조합 배당</p>
        <p>예상 수익 = 예상 지급액 - 베팅 금액</p>
      </FormulaDetails>
    </CalculatorClientShell>
  );
}
