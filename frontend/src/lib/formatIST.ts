// ============================================================================
// CLOSEOUT — IST timestamp formatters
// ----------------------------------------------------------------------------
// All operational customer timestamps in the CMS are displayed in
// **Indian Standard Time (Asia/Kolkata)** with a **24-hour** clock, regardless
// of the browser's locale or system timezone.
//
// Why a single helper:
//   - Avoids drift between locales (US Chromebook agent vs Indian Linux box).
//   - Eliminates 12-hour AM/PM display in operational tables/timelines.
//   - One place to change if the policy ever evolves (e.g. multi-region).
//
// Style:
//   - Date  ⇒ DD/MM/YYYY      (matches existing date-fns "dd/MM/yyyy" output)
//   - Time  ⇒ HH:mm           (00–23)
//   - Long  ⇒ DD Mon YYYY     (e.g. 24 May 2026) — used in cards/timelines
//   - All formatters accept Date | string | number | null | undefined and
//     return "—" for missing/invalid input (never "Invalid Date").
// ============================================================================

const IST_TZ = "Asia/Kolkata";

/** Coerces any reasonable input to a valid Date or null. */
function toDate(value: Date | string | number | null | undefined): Date | null {
  if (value === null || value === undefined || value === "") return null;
  const d = value instanceof Date ? value : new Date(value);
  return isNaN(d.getTime()) ? null : d;
}

// Use cached Intl.DateTimeFormat instances — instantiating them per call is
// roughly 10× slower than reusing a singleton.
const dateFmt = new Intl.DateTimeFormat("en-GB", {
  timeZone: IST_TZ,
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

const dateLongFmt = new Intl.DateTimeFormat("en-GB", {
  timeZone: IST_TZ,
  day: "2-digit",
  month: "short",
  year: "numeric",
});

const time24Fmt = new Intl.DateTimeFormat("en-GB", {
  timeZone: IST_TZ,
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

const dateTime24Fmt = new Intl.DateTimeFormat("en-GB", {
  timeZone: IST_TZ,
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

/** DD/MM/YYYY in IST. Returns "—" for null/invalid input. */
export function formatISTDate(value: Date | string | number | null | undefined): string {
  const d = toDate(value);
  return d ? dateFmt.format(d) : "—";
}

/** DD Mon YYYY in IST (e.g. "24 May 2026"). */
export function formatISTDateLong(value: Date | string | number | null | undefined): string {
  const d = toDate(value);
  return d ? dateLongFmt.format(d) : "—";
}

/** HH:mm (24-hour) in IST. */
export function formatISTTime24(value: Date | string | number | null | undefined): string {
  const d = toDate(value);
  return d ? time24Fmt.format(d) : "—";
}

/** DD/MM/YYYY HH:mm (24-hour) in IST. */
export function formatISTDateTime24(value: Date | string | number | null | undefined): string {
  const d = toDate(value);
  if (!d) return "—";
  // en-GB renders this as "24/05/2026, 14:35" — strip the comma for tighter
  // operational displays. Padding etc are guaranteed by the Intl options.
  return dateTime24Fmt.format(d).replace(",", "");
}

/**
 * Format a follow-up date + standalone `HH:mm:ss` time string into one
 * "DD/MM/YYYY HH:mm" IST string. Some endpoints expose `follow_up_date`
 * (a date) and `follow_up_time` (a time-of-day string) separately. The
 * time-of-day is already wall-clock IST — we don't re-zone it; we just
 * trim seconds.
 */
export function formatISTFollowUp(
  followUpDate: Date | string | number | null | undefined,
  followUpTime?: string | null
): string {
  const datePart = formatISTDate(followUpDate);
  if (datePart === "—") return "—";
  if (!followUpTime) return datePart;
  const trimmed = String(followUpTime).slice(0, 5); // "HH:mm" from "HH:mm:ss"
  return `${datePart} ${trimmed}`;
}
