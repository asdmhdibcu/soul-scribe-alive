/** When to send the morning-brief reminder email. Pure; tested directly. */

type Prefs = {
  brief_email: boolean;
  brief_hour: number;
  timezone: string;
  last_brief_email_on: string | null;
};

function localParts(now: Date, timeZone: string) {
  const fmt = (tz: string) =>
    new Intl.DateTimeFormat("en-CA", {
      timeZone: tz,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      hourCycle: "h23",
    }).formatToParts(now);
  let parts: Intl.DateTimeFormatPart[];
  try {
    parts = fmt(timeZone);
  } catch {
    parts = fmt("UTC");
  }
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  return { date: `${get("year")}-${get("month")}-${get("day")}`, hour: Number(get("hour")) };
}

/** Due once per local day, during the person's chosen hour, if email is on. */
export function reminderDue(p: Prefs, now: Date) {
  const { date, hour } = localParts(now, p.timezone);
  const due = p.brief_email && hour === p.brief_hour && p.last_brief_email_on !== date;
  return { due, localDate: date };
}
