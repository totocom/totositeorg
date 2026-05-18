"use client";

import { useMemo, useState } from "react";
import {
  CalculatorClientShell,
  DecimalInput,
  FormulaDetails,
  formatPercent,
  formatSignedWon,
  formatWon,
  parseDecimalOdds,
  parsePositiveAmount,
  parseProbabilityPercent,
  ResetButton,
  ResultPanel,
} from "./calculator-client-ui";

const defaultStake = "10000";
const defaultOdds = "1.85";
const defaultProbability = "55";

export function ExpectedValueCalculatorClient() {
  const [stake, setStake] = useState(defaultStake);
  const [odds, setOdds] = useState(defaultOdds);
  const [hitProbability, setHitProbability] = useState(defaultProbability);

  const result = useMemo(() => {
    if (!stake || !odds || !hitProbability) {
      return {
        state: "idle" as const,
        message: "베팅 금액, 소수 배당, 예상 적중 확률을 입력하면 결과가 표시됩니다.",
      };
    }

    const parsedStake = parsePositiveAmount(stake);
    const parsedOdds = parseDecimalOdds(odds);
    const parsedProbability = parseProbabilityPercent(hitProbability);

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

    if (parsedProbability === null) {
      return {
        state: "error" as const,
        message: "예상 적중 확률은 0부터 100 사이로 입력해주세요.",
      };
    }

    const hitRate = parsedProbability / 100;
    const missRate = 1 - hitRate;
    const hitProfit = parsedStake * (parsedOdds - 1);
    const missLoss = parsedStake;
    const expectedValue = hitRate * hitProfit - missRate * missLoss;
    const expectedValueRate = (expectedValue / parsedStake) * 100;

    return {
      state: "ready" as const,
      items: [
        { label: "적중 시 수익", value: formatWon(hitProfit), tone: "positive" as const },
        { label: "실패 시 손실", value: `-${formatWon(missLoss)}`, tone: "negative" as const },
        {
          label: "기대값",
          value: formatSignedWon(expectedValue),
          tone: expectedValue > 0 ? "positive" as const : expectedValue < 0 ? "negative" as const : "default" as const,
        },
        {
          label: "기대값 비율",
          value: formatPercent(expectedValueRate),
          tone: expectedValueRate > 0 ? "positive" as const : expectedValueRate < 0 ? "negative" as const : "default" as const,
        },
      ],
    };
  }, [stake, odds, hitProbability]);

  return (
    <CalculatorClientShell>
      <div className="grid gap-4 md:grid-cols-3">
        <DecimalInput
          id="expected-value-stake"
          label="베팅 금액"
          value={stake}
          onChange={setStake}
          placeholder="10000"
          suffix="원"
          step="1000"
        />
        <DecimalInput
          id="expected-value-odds"
          label="소수 배당"
          value={odds}
          onChange={setOdds}
          placeholder="1.85"
          min="1.01"
        />
        <DecimalInput
          id="expected-value-probability"
          label="예상 적중 확률"
          value={hitProbability}
          onChange={setHitProbability}
          placeholder="55"
          suffix="%"
          step="0.1"
        />
      </div>

      <ResultPanel {...result} />

      <div>
        <ResetButton
          onClick={() => {
            setStake(defaultStake);
            setOdds(defaultOdds);
            setHitProbability(defaultProbability);
          }}
        />
      </div>

      <p className="rounded-lg border border-line bg-background p-4 text-sm leading-6 text-muted">
        기대값 계산은 사용자가 입력한 예상 확률을 기준으로 한 이론 계산입니다.
        실제 수익이나 결과를 보장하지 않습니다.
      </p>

      <FormulaDetails>
        <p>적중 시 수익 = 베팅 금액 x (배당 - 1)</p>
        <p>실패 확률 = 1 - 적중 확률</p>
        <p>기대값 = 적중 확률 x 적중 시 수익 - 실패 확률 x 베팅 금액</p>
      </FormulaDetails>
    </CalculatorClientShell>
  );
}
