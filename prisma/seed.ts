import { prisma } from "../lib/prisma";
import {
  DEMO_SIMULATION_LABEL,
  type GraphData,
  GraphDataSchema,
} from "../contracts";

interface BaselineCaseStub {
  scenarioCode: string;
  title: string;
  subtitle: string;
  graphData: GraphData;
  caseContext: Record<string, unknown>;
}

const BASELINE_CASES: BaselineCaseStub[] = [
  {
    scenarioCode: "CASE-01",
    title: `[${DEMO_SIMULATION_LABEL}] Bác Hùng (62t) — Giả danh Công an & Chia nhỏ 4×9,5M`,
    subtitle: `${DEMO_SIMULATION_LABEL} — Stub nền Wave 0 (Wave 1 assets mở rộng đầy đủ)`,
    graphData: GraphDataSchema.parse({
      nodes: [
        {
          id: "ACC_HUNG_SIM",
          type: "VICTIM",
          label: "Bác Hùng (Mô phỏng)",
          metadata: { simulationLabel: DEMO_SIMULATION_LABEL },
        },
        {
          id: "ACC_MULE_01",
          type: "MULE",
          label: "TK 990123456789 (Mô phỏng)",
          flagged: true,
          metadata: { simulationLabel: DEMO_SIMULATION_LABEL, sharedDevice: "DEV_ANDROID_99" },
        },
      ],
      edges: [
        {
          id: "EDGE_CASE01_1",
          source: "ACC_HUNG_SIM",
          target: "ACC_MULE_01",
          edge_type: "TRANSFER",
          label: "4 × 9.500.000đ",
          amount_vnd: 9_500_000,
          tx_count: 4,
          flagged: true,
        },
      ],
      summary_badge: `${DEMO_SIMULATION_LABEL} · 4×9,5M`,
    }),
    caseContext: {
      simulationLabel: DEMO_SIMULATION_LABEL,
      persona: "USER_B2C_HUNG",
      targetAccount: "990123456789",
      simoFlagSimulated: true,
    },
  },
  {
    scenarioCode: "CASE-02",
    title: `[${DEMO_SIMULATION_LABEL}] Minh Anh (21t) — Link .APK giả Shipper/Dịch vụ công`,
    subtitle: `${DEMO_SIMULATION_LABEL} — Stub nền Wave 0 (An ninh mạng Accessibility)`,
    graphData: GraphDataSchema.parse({
      nodes: [
        {
          id: "USER_MINHANH_SIM",
          type: "VICTIM",
          label: "Minh Anh (Mô phỏng)",
          metadata: { simulationLabel: DEMO_SIMULATION_LABEL },
        },
        {
          id: "DOMAIN_FAKE_APK",
          type: "SCAMMER",
          label: "dichvucong-xacminh-hoso.example",
          flagged: true,
          metadata: { simulationLabel: DEMO_SIMULATION_LABEL, threat: "APK_ACCESSIBILITY_BAIT" },
        },
      ],
      edges: [
        {
          id: "EDGE_CASE02_1",
          source: "DOMAIN_FAKE_APK",
          target: "USER_MINHANH_SIM",
          edge_type: "SIMO_LINK",
          label: "capnhat.apk",
          flagged: true,
        },
      ],
      summary_badge: `${DEMO_SIMULATION_LABEL} · APK/Accessibility`,
    }),
    caseContext: {
      simulationLabel: DEMO_SIMULATION_LABEL,
      persona: "USER_B2C_NEW",
      suspiciousUrl: "https://dichvucong-xacminh-hoso.example/capnhat.apk",
    },
  },
  {
    scenarioCode: "CASE-03",
    title: `[${DEMO_SIMULATION_LABEL}] Chị Hoa — Tiểu thương Livestream (Kiểm chứng Chống chặn oan)`,
    subtitle: `${DEMO_SIMULATION_LABEL} — Stub nền Wave 0 (35 GD nhỏ/1h tối, 14 tháng sạch)`,
    graphData: GraphDataSchema.parse({
      nodes: [
        {
          id: "MERCHANT_HOA_SIM",
          type: "MERCHANT",
          label: "Shop Gia Dụng Hoa Mai (Mô phỏng)",
          risk_score: 18,
          metadata: {
            simulationLabel: DEMO_SIMULATION_LABEL,
            cleanHistoryMonths: 14,
            complaints: 0,
          },
        },
        {
          id: "BUYERS_CLUSTER_01",
          type: "BANK_ACCOUNT",
          label: "35 khách mua livestream (Mô phỏng)",
          metadata: { simulationLabel: DEMO_SIMULATION_LABEL },
        },
      ],
      edges: [
        {
          id: "EDGE_CASE03_1",
          source: "BUYERS_CLUSTER_01",
          target: "MERCHANT_HOA_SIM",
          edge_type: "TRANSFER",
          label: "35 GD · 150k–450k (20h–21h)",
          amount_vnd: 300_000,
          tx_count: 35,
          flagged: false,
        },
      ],
      summary_badge: `${DEMO_SIMULATION_LABEL} · 14 tháng sạch`,
    }),
    caseContext: {
      simulationLabel: DEMO_SIMULATION_LABEL,
      merchantName: "Shop Gia Dụng Hoa Mai",
      cleanHistoryMonths: 14,
      complaintsCount: 0,
    },
  },
];

// shortcut: Wave 0 seeds minimal CASE-01/02/03 stubs; Wave 1 assets replaces with full fixtures
export async function seedBaselineSession(demoSessionId: string): Promise<number> {
  const existingCount = await prisma.investigationCase.count({
    where: { demoSessionId },
  });
  if (existingCount > 0) {
    return existingCount;
  }

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
    ...BASELINE_CASES.map((item) =>
      prisma.investigationCase.create({
        data: {
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
      }),
    ),
  ]);

  return BASELINE_CASES.length;
}

const isDirectExecution =
  typeof process !== "undefined" &&
  Boolean(process.argv[1]) &&
  (process.argv[1].endsWith("prisma/seed.ts") ||
    process.argv[1].endsWith("prisma\\seed.ts"));

if (isDirectExecution) {
  seedBaselineSession("default")
    .then((count) => {
      console.log(`[seed] Baseline session "default" ready with ${count} synthetic cases (${DEMO_SIMULATION_LABEL}).`);
    })
    .catch((err) => {
      console.error("[seed] Failed:", err);
      process.exitCode = 1;
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
