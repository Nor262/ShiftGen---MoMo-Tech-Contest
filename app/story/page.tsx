"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Stage } from "@/components/story/Stage";
import { needsFreshSession, newSessionSlug } from "@/lib/demo-session";

/** /story — the guided demo on one screen. Each visit runs on its own fresh session. */
function StoryOnSession() {
  const router = useRouter();
  const params = useSearchParams();
  const session = params.get("session");
  // Decided once, after mount (no SSR mismatch): a missing session or a reload starts over on a new one,
  // so a reload never resumes on a session that already holds earlier writes.
  const [discarded, setDiscarded] = useState<string | null | undefined>(undefined);
  useEffect(() => {
    const nav = performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming | undefined;
    if (needsFreshSession(session, nav?.type)) {
      setDiscarded(session);
      router.replace(`/story?session=${newSessionSlug()}`);
    } else {
      setDiscarded(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only the first URL matters
  }, []);
  const ready = discarded !== undefined && session !== null && session !== discarded;

  return (
    <>
      <h1 className="sr-only">Câu chuyện TrustLoop: một vụ lừa đảo bị chặn trước khi tiền rời ví</h1>
      {ready && <Stage key={session} session={session} />}
    </>
  );
}

export default function StoryPage() {
  return (
    <Suspense fallback={null}>
      <StoryOnSession />
    </Suspense>
  );
}
