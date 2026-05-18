"use client";

import { useMemo, useState } from "react";
import {
  CalculatorClientShell,
  DecimalInput,
  FormulaDetails,
  formatWon,
  parseDecimalOdds,
  parsePositiveAmount,
  ResetButton,
  ResultPanel,
} from "./calculator-client-ui";

const defaultStake = "10000";
const defaultOdds = "2.50";

export function PayoutCalculatorClient() {
  const [stake, setStake] = useState(defaultStake);
  const [odds, setOdds] = useState(defaultOdds);

  const result = useMemo(() => {
    if (!stake || !odds) {
      return {
        state: "idle" as const,
        message: "베팅 금액과 소수 배당을 입력하면 결과가 표시됩니다.",
      };
    }

    const parsedStake = parsePositiveAmount(stake);
    const parsedOdds = parseDecimalOdds(odds);

    if (!parsedStake) {
      return {
        state: "error" as const,
        message: "베팅 금액은 0보다 큰 숫자로 입력해주세요.",
      };
    }

    if (!parsedOdds) {
      return {
        state: "error" as const,
        message: "소수 배당은 1.01 이상으로 입력해주세요.",
      };
    }

    const payout = parsedStake * parsedOdds;
    const profit = payout - parsedStake;

    return {
      state: "ready" as const,
      items: [
        { label: "예상 지급액", value: formatWon(payout) },
        { label: "예상 수익", value: formatWon(profit), tone: "positive" as const },
      ],
    };
  }, [stake, odds]);

  return (
    <CalculatorClientShell>
      <div className="grid gap-4 md:grid-cols-2">
        <DecimalInput
          id="payout-stake"
          label="베팅 금액"
          value={stake}
          onChange={setStake}
          placeholder="10000"
          suffix="원"
          step="1000"
        />
        <DecimalInput
          id="payout-odds"
          label="소수 배당"
          value={odds}
          onChange={setOdds}
          placeholder="2.50"
          min="1.01"
        />
      </div>

      <ResultPanel {...result} />

      <div>
        <ResetButton
          onClick={() => {
            setStake(defaultStake);
            setOdds(defaultOdds);
          }}
        />
      </div>

      <FormulaDetails>
        <p>예상 지급액 = 베팅 금액 x 배당</p>
        <p>예상 수익 = 예상 지급액 - 베팅 금액</p>
      </FormulaDetails>
    </CalculatorClientShell>
  );
}
