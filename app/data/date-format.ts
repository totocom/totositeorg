const kstDateFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Seoul",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
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

  return `${parts.year}-${parts.month}-${parts.day}`;
}
