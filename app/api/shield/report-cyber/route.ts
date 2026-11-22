import { NextResponse } from "next/server";
import {
  DEMO_SIMULATION_LABEL,
  GraphDataSchema,
  ReportCyberRequestSchema,
  ReportCyberResponseSchema,
  SanitizedEvidenceSchema,
  type GraphData,
} from "@/contracts";
import { prisma } from "@/lib/prisma";
import {
  ensureSessionSeeded,
  extractDomainFromUrl,
  getSessionId,
  toInvestigationCaseDto,
} from "@/lib/session";

export const dynamic = "force-dynamic";

function safeJson<T>(raw: string | null | undefined, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null);
    const parsed = ReportCyberRequestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Yêu cầu báo cáo mối đe dọa an ninh mạng không hợp lệ.",
          code: "VALIDATION_ERROR",
          details: parsed.error.flatten(),
        },
        { status: 400 },
      );
    }

    const demoSessionId = getSessionId(request);
    await ensureSessionSeeded(demoSessionId);

    const { userId, scanId, note } = parsed.data;
    const scan = await prisma.scanSession.findFirst({
      where: { scanId, demoSessionId },
    });

    if (!scan) {
      return NextResponse.json(
        { error: "Không tìm thấy phiên quét tương ứng.", code: "SCAN_NOT_FOUND" },
        { status: 404 },
      );
    }

    const sanitizedEvidence = SanitizedEvidenceSchema.parse(
      safeJson(scan.sanitizedEvidenceJson, null),
    );

    const primaryIndicator =
      sanitizedEvidence.suspicious_urls[0] ??
      sanitizedEvidence.recipient_account ??
      "cyber-threat-indicator";
    const indicatorDomain = extractDomainFromUrl(primaryIndicator) ?? primaryIndicator;

    const isCase02Match =
      sanitizedEvidence.scam_category === "APK_MALWARE_BAIT" ||
      sanitizedEvidence.cyber_threat_types.includes("APK_ACCESSIBILITY_BAIT") ||
      sanitizedEvidence.suspicious_urls.some(
        (u) => u.includes("dichvucong-xacminh-hoso.example") || /\.apk\b/i.test(u),
      );

    const case02Id = `${demoSessionId}::CASE-02`;
    const existingCase02 = isCase02Match
      ? await prisma.investigationCase.findUnique({ where: { caseId: case02Id } })
      : null;

    let savedCase;
    if (existingCase02) {
      const existingGraph = GraphDataSchema.catch({ nodes: [], edges: [] }).parse(
        safeJson<GraphData>(existingCase02.graphDataJson, { nodes: [], edges: [] }),
      );
      const existingCtx = safeJson<Record<string, unknown>>(existingCase02.caseContextJson, {});

      const existingNodeIds = new Set(existingGraph.nodes.map((n) => n.id));
      const newNodes = [...existingGraph.nodes];
      const newEdges = [...existingGraph.edges];

      const indicatorNodeId = `CYBER_${scan.scanId.slice(-6)}`;
      if (
        !existingGraph.nodes.some((n) => n.label.toLowerCase().includes(indicatorDomain.toLowerCase())) &&
        !existingNodeIds.has(indicatorNodeId)
      ) {
        newNodes.push({
          id: indicatorNodeId,
          type: "SCAMMER",
          label: indicatorDomain,
          risk_score: sanitizedEvidence.risk_score,
          flagged: true,
          metadata: {
            simulationLabel: DEMO_SIMULATION_LABEL,
            source: "MINUTE0_B2C_APK_REPORT",
            cyberThreatTypes: sanitizedEvidence.cyber_threat_types,
          },
        });
        const victimNode = existingGraph.nodes.find((n) => n.type === "VICTIM");
        if (victimNode) {
          newEdges.push({
            id: `EDGE_CYBER_${scan.scanId.slice(-6)}`,
            source: indicatorNodeId,
            target: victimNode.id,
            edge_type: "SIMO_LINK",
            label: sanitizedEvidence.cyber_threat_types[0] ?? "CYBER_REPORT",
            flagged: true,
          });
        }
      }

      savedCase = await prisma.investigationCase.update({
        where: { caseId: existingCase02.caseId },
        data: {
          sanitizedMinute0Json: JSON.stringify(sanitizedEvidence),
          graphDataJson: JSON.stringify(
            GraphDataSchema.parse({
              ...existingGraph,
              nodes: newNodes,
              edges: newEdges,
            }),
          ),
          caseContextJson: JSON.stringify({
            ...existingCtx,
            independentSources: ["MINUTE0_B2C_APK_REPORT"],
            reportedScanId: scan.scanId,
            reportedBy: userId,
            reporterNote: note ?? null,
          }),
        },
      });
    } else {
      const victimNodeId = `USER_${userId}`;
      const threatNodeId = `THREAT_${scan.scanId.slice(-8)}`;
      const graphData = GraphDataSchema.parse({
        nodes: [
          {
            id: victimNodeId,
            type: "VICTIM",
            label: `${userId} (${DEMO_SIMULATION_LABEL})`,
            metadata: { simulationLabel: DEMO_SIMULATION_LABEL },
          },
          {
            id: threatNodeId,
            type: "SCAMMER",
            label: indicatorDomain,
            risk_score: sanitizedEvidence.risk_score,
            flagged: true,
            metadata: {
              simulationLabel: DEMO_SIMULATION_LABEL,
              cyberThreatTypes: sanitizedEvidence.cyber_threat_types,
              urls: sanitizedEvidence.suspicious_urls,
            },
          },
        ],
        edges: [
          {
            id: `EDGE_${scan.scanId.slice(-8)}`,
            source: threatNodeId,
            target: victimNodeId,
            edge_type: "SIMO_LINK",
            label: sanitizedEvidence.cyber_threat_types[0] ?? "CYBER_THREAT",
            flagged: true,
          },
        ],
        summary_badge: `${DEMO_SIMULATION_LABEL} · Báo cáo An ninh mạng (1 nguồn)`,
      });

      savedCase = await prisma.investigationCase.create({
        data: {
          demoSessionId,
          scenarioCode: "CASE-CYBER-CUSTOM",
          title: `[${DEMO_SIMULATION_LABEL}] Báo cáo An ninh mạng — ${indicatorDomain}`,
          subtitle: `${DEMO_SIMULATION_LABEL} · 1 nguồn độc lập (MINUTE0_B2C_APK_REPORT)`,
          status: "OPEN",
          graphDataJson: JSON.stringify(graphData),
          caseContextJson: JSON.stringify({
            simulationLabel: DEMO_SIMULATION_LABEL,
            independentSources: ["MINUTE0_B2C_APK_REPORT"],
            reportedScanId: scan.scanId,
            reportedBy: userId,
            reporterNote: note ?? null,
            suspiciousUrl: sanitizedEvidence.suspicious_urls[0] ?? null,
          }),
          sanitizedMinute0Json: JSON.stringify(sanitizedEvidence),
        },
      });
    }

    await prisma.auditLog.create({
      data: {
        demoSessionId,
        actorId: userId,
        actorRole: "USER_B2C",
        action: "CYBER_REPORTED",
        targetId: savedCase.caseId,
        rationale:
          note?.trim() ||
          `Gửi báo cáo mối đe dọa an ninh mạng từ Phút 00 (nguồn MINUTE0_B2C_APK_REPORT, đã ẩn PII & không đính kèm ảnh gốc).`,
        metadataJson: JSON.stringify({
          scanId: scan.scanId,
          caseId: savedCase.caseId,
          independentSources: ["MINUTE0_B2C_APK_REPORT"],
        }),
      },
    });

    const payload = ReportCyberResponseSchema.parse({
      caseId: savedCase.caseId,
      caseRecord: toInvestigationCaseDto(savedCase),
    });
    return NextResponse.json(payload, { status: 200 });
  } catch (err) {
    console.error("[POST /api/shield/report-cyber]", err);
    return NextResponse.json(
      { error: "Không thể gửi báo cáo an ninh mạng.", code: "INTERNAL_ERROR" },
      { status: 500 },
    );
  }
}
