"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Stage } from "@/components/story/Stage";
import { newSessionSlug } from "@/lib/demo-session";

/** /story — the guided demo on one screen. Each visit runs on its own fresh session. */
function StoryOnSession() {
  const router = useRouter();
  const params = useSearchParams();
  const session = params.get("session");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!session) router.replace(`/story?session=${newSessionSlug()}`);
    else setReady(true);
  }, [session, router]);

  return ready ? <Stage key={session} /> : null;
}

export default function StoryPage() {
  return (
    <Suspense fallback={null}>
      <StoryOnSession />
    </Suspense>
  );
}
