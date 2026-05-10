type ScamReportDepositDisplayFields = {
  depositAmount: number | null;
  depositBankName?: string | null;
};

const ambiguousCoinLabels = new Set([
  "기타",
  "없음",
  "미확인",
  "unknown",
  "none",
  "n/a",
  "na",
  "null",
  "undefined",
]);

function extractCoinDepositLabel(value: string | null | undefined) {
  const note = value?.trim() ?? "";
  const match = note.match(/(?:^|\/)\s*코인\s*[:：]\s*([^/]+)/);

  return match?.[1]?.trim() ?? null;
}

function isCoinDepositNote(value: string | null | undefined) {
  return /(?:^|\/)\s*코인\s*[:：]/.test(value?.trim() ?? "");
}

function normalizeCoinUnit(value: string | null | undefined) {
  const normalized = value
    ?.replace(/^(?:코인|coin)\s*[:：]\s*/i, "")
    .replace(/\s+/g, " ")
    .trim();

  if (!normalized) return null;

  const lower = normalized.toLowerCase();

  if (ambiguousCoinLabels.has(lower) || ambiguousCoinLabels.has(normalized)) {
    return null;
  }

  if (
    /[@/:\\]/.test(normalized) ||
    /https?/i.test(normalized) ||
    /[^0-9A-Za-z가-힣\s._+-]/.test(normalized)
  ) {
    return null;
  }

  const compact = normalized.replace(/\s+/g, "");

  if (!compact || compact.length > 20) return null;
  if (/^\d+(?:[.,]\d+)?$/.test(compact)) return null;
  if (/^[0-9a-f]{16,}$/i.test(compact)) return null;

  return compact;
}

function formatCoinAmount(amount: number) {
  return amount.toLocaleString("ko-KR", {
    maximumFractionDigits: 8,
  });
}

export function getScamReportDepositCoinUnit(
  report: ScamReportDepositDisplayFields,
) {
  if (!isCoinDepositNote(report.depositBankName)) return null;

  return normalizeCoinUnit(extractCoinDepositLabel(report.depositBankName));
}

export function formatScamReportDepositAmount(
  report: ScamReportDepositDisplayFields,
) {
  if (report.depositAmount === null || !Number.isFinite(report.depositAmount)) {
    return "미확인";
  }

  const formattedAmount = formatCoinAmount(report.depositAmount);
  const coinUnit = getScamReportDepositCoinUnit(report);

  if (coinUnit) return `${formattedAmount}${coinUnit}`;
  if (isCoinDepositNote(report.depositBankName)) {
    return `${formattedAmount} (코인 단위 미확인)`;
  }

  return `${report.depositAmount.toLocaleString("ko-KR")}원`;
}
