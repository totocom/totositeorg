"use client";

import { useMemo, useState } from "react";
import {
  CalculatorClientShell,
  DecimalInput,
  FormulaDetails,
  formatPercent,
  parseDecimalOdds,
  ResetButton,
  ResultPanel,
} from "./calculator-client-ui";

const defaultOdds = "2.00";

export function ImpliedProbabilityCalculatorClient() {
  const [odds, setOdds] = useState(defaultOdds);

  const result = useMemo(() => {
    if (!odds) {
      return {
        state: "idle" as const,
        message: "소수 배당을 입력하면 암시 확률이 표시됩니다.",
      };
    }

    const parsedOdds = parseDecimalOdds(odds);
    if (!parsedOdds) {
      return {
        state: "error" as const,
        message: "소수 배당은 1.01 이상으로 입력해주세요.",
      };
    }

    return {
      state: "ready" as const,
      items: [
        { label: "암시 확률", value: formatPercent((1 / parsedOdds) * 100) },
      ],
    };
  }, [odds]);

  return (
    <CalculatorClientShell>
      <DecimalInput
        id="implied-probability-odds"
        label="소수 배당"
        value={odds}
        onChange={setOdds}
        placeholder="2.00"
        min="1.01"
      />

      <ResultPanel {...result} />

      <div>
        <ResetButton onClick={() => setOdds(defaultOdds)} />
      </div>

      <p className="rounded-lg border border-line bg-background p-4 text-sm leading-6 text-muted">
        암시 확률은 배당을 확률로 환산한 이론값이며 실제 결과 확률을 의미하지 않습니다.
      </p>

      <FormulaDetails>
        <p>암시 확률 = 1 / 배당 x 100</p>
      </FormulaDetails>
    </CalculatorClientShell>
  );
}
