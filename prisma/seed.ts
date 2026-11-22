import { prisma } from "../lib/prisma";
import { DEMO_SIMULATION_LABEL } from "../contracts";
import { SCENARIO_FIXTURES } from "../data/scenarios";

export async function seedBaselineSession(demoSessionId: string): Promise<number> {
  const existingCount = await prisma.investigationCase.count({
    where: { demoSessionId },
  });
  if (existingCount > 0) {
    return existingCount;
  }

  try {
    await prisma.$transaction([
      prisma.userConsent.upsert({
        where: {
          demoSessionId_userId: {
            demoSessionId,
            userId: "USER_B2C_HUNG",
          },
        },
        update: {},
        create: {
          demoSessionId,
          userId: "USER_B2C_HUNG",
          optIn24hHold: false,
          guardianId: null,
          consentVersion: "v1.0-law91-2025",
        },
      }),
      ...SCENARIO_FIXTURES.map((item) => {
        const deterministicId = `${demoSessionId}::${item.scenarioCode}`;
        return prisma.investigationCase.upsert({
          where: { caseId: deterministicId },
          update: {},
          create: {
            caseId: deterministicId,
            demoSessionId,
            scenarioCode: item.scenarioCode,
            title: item.title,
            subtitle: item.subtitle,
            status: "OPEN",
            graphDataJson: JSON.stringify(item.graphData),
            caseContextJson: JSON.stringify(item.caseContext),
            sanitizedMinute0Json: null,
            agentDebateJson: null,
          },
        });
      }),
    ]);
  } catch (err) {
    // Concurrent cold-session upsert race on unique key — safe when peer committed the same rows.
    const code = (err as { code?: string })?.code;
    if (code !== "P2002") {
      throw err;
    }
  }

  return prisma.investigationCase.count({ where: { demoSessionId } });
}

const isDirectExecution =
  typeof process !== "undefined" &&
  Boolean(process.argv[1]) &&
  (process.argv[1].endsWith("prisma/seed.ts") ||
    process.argv[1].endsWith("prisma\\seed.ts"));

if (isDirectExecution) {
  seedBaselineSession("default")
    .then((count) => {
      console.log(
        `[seed] Baseline session "default" ready with ${count} synthetic cases (${DEMO_SIMULATION_LABEL}).`,
      );
    })
    .catch((err) => {
      console.error("[seed] Failed:", err);
      process.exitCode = 1;
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
