"use client";

import { Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Stage } from "@/components/story/Stage";
import { newSessionSlug } from "@/lib/demo-session";

/** /story — the guided demo on one screen. Each visit runs on its own fresh session. */
function StoryOnSession() {
  const router = useRouter();
  const params = useSearchParams();
  const session = params.get("session");
  useEffect(() => {
    if (!session) router.replace(`/story?session=${newSessionSlug()}`);
  }, [session, router]);

  return (
    <>
      <h1 className="sr-only">Câu chuyện TrustLoop: một vụ lừa đảo bị chặn trước khi tiền rời ví</h1>
      {session && <Stage key={session} session={session} />}
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
