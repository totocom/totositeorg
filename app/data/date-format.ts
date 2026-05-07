const kstDateFormatter = new Intl.DateTimeFormat("ko-KR", {
  timeZone: "Asia/Seoul",
  year: "numeric",
  month: "numeric",
  day: "numeric",
});

export function formatKstDate(value: string | null | undefined) {
  const rawValue = value?.trim() ?? "";

  if (!rawValue) return "";

  const date = new Date(rawValue);

  if (!Number.isFinite(date.getTime())) {
    return rawValue;
  }

  const parts = kstDateFormatter
    .formatToParts(date)
    .reduce<Record<string, string>>((acc, part) => {
      acc[part.type] = part.value;
      return acc;
    }, {});

  if (!parts.year || !parts.month || !parts.day) {
    return rawValue;
  }

  return `${parts.year}년 ${Number(parts.month)}월 ${Number(parts.day)}일`;
}
