/** B2E must decide an escalated hold within this many working days (aligned with AML Law Art. 44 max delay). */
export const ESCALATION_DECISION_WORKING_DAYS = 3;

// shortcut: skips Sat/Sun only (UTC+7), ignores public holidays; add a holiday calendar before real operations.
export function addWorkingDays(start: Date, days: number): Date {
  const result = new Date(start.getTime());
  let added = 0;
  while (added < days) {
    result.setTime(result.getTime() + 24 * 60 * 60 * 1000);
    const weekday = new Date(result.getTime() + 7 * 60 * 60 * 1000).getUTCDay();
    if (weekday !== 0 && weekday !== 6) added += 1;
  }
  return result;
}
