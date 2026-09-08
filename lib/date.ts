const monthFormatter = new Intl.DateTimeFormat("en", {
  month: "short",
  timeZone: "UTC",
});

function ordinal(day: number) {
  const remainder = day % 100;
  if (remainder >= 11 && remainder <= 13) return `${day}th`;
  switch (day % 10) {
    case 1:
      return `${day}st`;
    case 2:
      return `${day}nd`;
    case 3:
      return `${day}rd`;
    default:
      return `${day}th`;
  }
}

/** Formats a persisted timestamp for people, never as raw ISO text. */
export function formatDisplayDate(
  value: Date | string | number | null | undefined,
) {
  if (value === null || value === undefined || value === "") return "—";
  const date =
    typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)
      ? new Date(`${value}T00:00:00.000Z`)
      : new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return `${ordinal(date.getUTCDate())} ${monthFormatter.format(date)}, ${date.getUTCFullYear()}`;
}
