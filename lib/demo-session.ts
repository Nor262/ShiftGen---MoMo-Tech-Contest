/** A fresh demo session slug; pages pass it as ?session= so every run starts from seeded data. */
export function newSessionSlug(): string {
  return `demo-${crypto.randomUUID().replace(/-/g, "").slice(0, 12)}`;
}

/** /story starts over on a fresh session when the URL has none or the page was reloaded. */
export function needsFreshSession(session: string | null, navigationType: string | undefined): boolean {
  return !session || navigationType === "reload";
}
