/** Sign-up profile rules. Pure; tested directly. */

export type Profile = {
  name: string;
  goingOn: string;
  briefHour: number;
  work: string;
  people: string;
  goals: string;
};

/** Required: name, what's going on, brief time. Everything else is optional. */
export function profileReady(p: Profile) {
  return Boolean(p.name.trim() && p.goingOn.trim()) && p.briefHour >= 0 && p.briefHour <= 23;
}

/** The profile as a first moment, so the brief can quote it from day one. */
export function profileMomentText(p: Profile) {
  return [
    ["What's going on right now", p.goingOn],
    ["My work", p.work],
    ["People who matter to me", p.people],
    ["What I'm aiming for", p.goals],
  ]
    .filter(([, v]) => v.trim())
    .map(([k, v]) => `${k}: ${v.trim()}`)
    .join("\n\n");
}

/** 8pm yesterday in the person's local time, as an ISO timestamp. */
export function yesterdayEvening(now: Date) {
  const d = new Date(now);
  d.setDate(d.getDate() - 1);
  d.setHours(20, 0, 0, 0);
  return d.toISOString();
}
