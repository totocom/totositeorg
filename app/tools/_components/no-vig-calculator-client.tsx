"use client";

import { useMemo, useState } from "react";
import {
  CalculatorClientShell,
  DecimalInput,
  FormulaDetails,
  formatOdds,
  formatPercent,
  parseDecimalOdds,
  ResetButton,
  ResultPanel,
} from "./calculator-client-ui";

const defaultOddsA = "1.90";
const defaultOddsB = "1.90";
const defaultOddsC = "3.20";

type ResultCount = 2 | 3;

export function NoVigCalculatorClient() {
  const [resultCount, setResultCount] = useState<ResultCount>(2);
  const [oddsA, setOddsA] = useState(defaultOddsA);
  const [oddsB, setOddsB] = useState(defaultOddsB);
  const [oddsC, setOddsC] = useState(defaultOddsC);

  const result = useMemo(() => {
    const rawOdds = resultCount === 2 ? [oddsA, oddsB] : [oddsA, oddsB, oddsC];
    if (rawOdds.some((value) => !value)) {
      return {
        state: "idle" as const,
        message: "각 결과의 소수 배당을 입력하면 마진 계산 결과가 표시됩니다.",
      };
    }

    const parsedOdds = rawOdds.map(parseDecimalOdds);
    const invalidRows = parsedOdds
      .map((odds, index) => (odds ? null : String.fromCharCode(65 + index)))
      .filter((label): label is string => label !== null);

    if (invalidRows.length > 0) {
      return {
        state: "error" as const,
        message: `결과 ${invalidRows.join(", ")} 배당을 1.01 이상으로 입력해주세요.`,
      };
    }

    const oddsValues = parsedOdds as number[];
    const impliedProbabilities = oddsValues.map((odds) => 1 / odds);
    const totalProbability = impliedProbabilities.reduce(
      (total, probability) => total + probability,
      0,
    );
    const margin = totalProbability - 1;
    const resultItems = impliedProbabilities.flatMap((probability, index) => {
      const label = String.fromCharCode(65 + index);
      const fairProbability = probability / totalProbability;
      const fairOdds = 1 / fairProbability;

      return [
        {
          label: `결과 ${label} 암시 확률`,
          value: formatPercent(probability * 100),
        },
        {
          label: `결과 ${label} 공정 확률`,
          value: formatPercent(fairProbability * 100),
        },
        {
          label: `결과 ${label} 공정 배당`,
          value: formatOdds(fairOdds),
        },
      ];
    });

    return {
      state: "ready" as const,
      items: [
        { label: "합산 확률", value: formatPercent(totalProbability * 100) },
        {
          label: "이론상 마진",
          value: formatPercent(margin * 100),
          tone: margin > 0 ? "warning" as const : "default" as const,
        },
        ...resultItems,
      ],
    };
  }, [oddsA, oddsB, oddsC, resultCount]);

  return (
    <CalculatorClientShell>
      <div className="grid gap-3 rounded-lg border border-line bg-background p-4">
        <p className="text-sm font-semibold text-foreground">결과 수 선택</p>
        <div className="grid gap-2 sm:grid-cols-2">
          <button
            type="button"
            aria-pressed={resultCount === 2}
            onClick={() => setResultCount(2)}
            className={`h-11 rounded-md border px-4 text-sm font-semibold transition ${
              resultCount === 2
                ? "border-accent bg-accent text-white"
                : "border-line text-foreground hover:bg-surface"
            }`}
          >
            2개 결과
          </button>
          <button
            type="button"
            aria-pressed={resultCount === 3}
            onClick={() => setResultCount(3)}
            className={`h-11 rounded-md border px-4 text-sm font-semibold transition ${
              resultCount === 3
                ? "border-accent bg-accent text-white"
                : "border-line text-foreground hover:bg-surface"
            }`}
          >
            3개 결과
          </button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <DecimalInput
          id="no-vig-odds-a"
          label="결과 A 배당"
          value={oddsA}
          onChange={setOddsA}
          placeholder="1.90"
          min="1.01"
        />
        <DecimalInput
          id="no-vig-odds-b"
          label="결과 B 배당"
          value={oddsB}
          onChange={setOddsB}
          placeholder="1.90"
          min="1.01"
        />
        {resultCount === 3 ? (
          <DecimalInput
            id="no-vig-odds-c"
            label="결과 C 배당"
            value={oddsC}
            onChange={setOddsC}
            placeholder="3.20"
            min="1.01"
          />
        ) : null}
      </div>

      <ResultPanel {...result} />

      <div>
        <ResetButton
          onClick={() => {
            setResultCount(2);
            setOddsA(defaultOddsA);
            setOddsB(defaultOddsB);
            setOddsC(defaultOddsC);
          }}
        />
      </div>

      <FormulaDetails>
        <p>각 결과 암시 확률 = 1 / 배당</p>
        <p>합산 확률 = 각 결과 암시 확률의 합</p>
        <p>이론상 마진 = 합산 확률 - 1</p>
        <p>공정 확률 = 각 결과 암시 확률 / 합산 확률</p>
        <p>공정 배당 = 1 / 공정 확률</p>
      </FormulaDetails>
    </CalculatorClientShell>
  );
}
