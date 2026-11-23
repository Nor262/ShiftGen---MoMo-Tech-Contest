/** A fresh demo session slug; pages pass it as ?session= so every run starts from seeded data. */
export function newSessionSlug(): string {
  return `demo-${crypto.randomUUID().replace(/-/g, "").slice(0, 12)}`;
}
