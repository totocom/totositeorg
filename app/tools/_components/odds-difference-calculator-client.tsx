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

const defaultOddsA = "2.10";
const defaultOddsB = "2.10";
const defaultTotalAmount = "10000";

function formatInverseOdds(value: number) {
  return value.toLocaleString("ko-KR", {
    minimumFractionDigits: 3,
    maximumFractionDigits: 4,
  });
}

export function OddsDifferenceCalculatorClient() {
  const [oddsA, setOddsA] = useState(defaultOddsA);
  const [oddsB, setOddsB] = useState(defaultOddsB);
  const [totalAmount, setTotalAmount] = useState(defaultTotalAmount);

  const result = useMemo(() => {
    if (!oddsA || !oddsB || !totalAmount) {
      return {
        state: "idle" as const,
        message: "배당과 총 계산 금액을 입력하면 결과별 배분 금액이 표시됩니다.",
      };
    }

    const parsedOddsA = parseDecimalOdds(oddsA);
    const parsedOddsB = parseDecimalOdds(oddsB);
    const parsedTotalAmount = parsePositiveAmount(totalAmount);

    if (!parsedOddsA) {
      return {
        state: "error" as const,
        message: "결과 A 배당은 1.01 이상으로 입력해주세요.",
      };
    }

    if (!parsedOddsB) {
      return {
        state: "error" as const,
        message: "결과 B 배당은 1.01 이상으로 입력해주세요.",
      };
    }

    if (!parsedTotalAmount) {
      return {
        state: "error" as const,
        message: "총 계산 금액은 0보다 큰 숫자로 입력해주세요.",
      };
    }

    const inverseA = 1 / parsedOddsA;
    const inverseB = 1 / parsedOddsB;
    const inverseSum = inverseA + inverseB;
    const amountA = (parsedTotalAmount * inverseA) / inverseSum;
    const amountB = (parsedTotalAmount * inverseB) / inverseSum;
    const payoutA = amountA * parsedOddsA;
    const payoutB = amountB * parsedOddsB;
    const profitA = payoutA - parsedTotalAmount;
    const profitB = payoutB - parsedTotalAmount;
    const hasTheoreticalDifference = inverseSum < 1;

    return {
      state: "ready" as const,
      items: [
        { label: "A 배분 금액", value: formatWon(amountA) },
        { label: "B 배분 금액", value: formatWon(amountB) },
        {
          label: "A 결과 적중 시 예상 손익",
          value: formatSignedWon(profitA),
          tone: profitA >= 0 ? "positive" as const : "negative" as const,
        },
        {
          label: "B 결과 적중 시 예상 손익",
          value: formatSignedWon(profitB),
          tone: profitB >= 0 ? "positive" as const : "negative" as const,
        },
        { label: "합산 역배당", value: formatInverseOdds(inverseSum) },
        {
          label: "이론상 차이 여부",
          value: hasTheoreticalDifference
            ? "입력된 배당 기준으로 이론상 배당 차이가 존재합니다. 다만 실제 체결 가능성, 배당 변동, 규정에 따라 결과는 달라질 수 있습니다."
            : "입력된 배당 기준으로는 결과별 이론 손익이 음수가 될 수 있습니다.",
          tone: hasTheoreticalDifference ? "warning" as const : "default" as const,
        },
      ],
    };
  }, [oddsA, oddsB, totalAmount]);

  return (
    <CalculatorClientShell>
      <div className="grid gap-4 md:grid-cols-3">
        <DecimalInput
          id="odds-difference-a"
          label="결과 A 배당"
          value={oddsA}
          onChange={setOddsA}
          placeholder="2.10"
          min="1.01"
        />
        <DecimalInput
          id="odds-difference-b"
          label="결과 B 배당"
          value={oddsB}
          onChange={setOddsB}
          placeholder="2.10"
          min="1.01"
        />
        <DecimalInput
          id="odds-difference-total"
          label="총 계산 금액"
          value={totalAmount}
          onChange={setTotalAmount}
          placeholder="10000"
          suffix="원"
          step="1000"
        />
      </div>

      <ResultPanel {...result} />

      <div>
        <ResetButton
          onClick={() => {
            setOddsA(defaultOddsA);
            setOddsB(defaultOddsB);
            setTotalAmount(defaultTotalAmount);
          }}
        />
      </div>

      <FormulaDetails>
        <p>A 역배당 = 1 / A 배당</p>
        <p>B 역배당 = 1 / B 배당</p>
        <p>합산 역배당 = A 역배당 + B 역배당</p>
        <p>A 배분 금액 = 총 계산 금액 x A 역배당 / 합산 역배당</p>
        <p>B 배분 금액 = 총 계산 금액 x B 역배당 / 합산 역배당</p>
        <p>결과별 손익 = 결과별 지급액 - 총 계산 금액</p>
      </FormulaDetails>
    </CalculatorClientShell>
  );
}
