import { describe, expect, it } from "vitest";
import { GraphDataSchema, SMURFING_SINGLE_LIMIT_VND } from "@/contracts";
import { SCENARIO_FIXTURES } from "@/data/scenarios";
import {
  analyzeCaseGraph,
  buildTransactionGraph,
  detectMuleClusters,
  detectSmurfing,
  type SyntheticTransaction,
} from "@/lib/graph";

function getScenario(code: "CASE-01" | "CASE-02" | "CASE-03") {
  const found = SCENARIO_FIXTURES.find((s) => s.scenarioCode === code);
  if (!found) throw new Error(`Missing scenario fixture ${code}`);
  return found;
}

describe("Wave 2 Graph Algo — Scenario Fixtures (CASE-01 / CASE-02 / CASE-03)", () => {
  it("CASE-01 (Bác Hùng): detects QĐ 2345 smurfing (4×9.5M=38M) and mule cluster without flagging victims", () => {
    const case01 = getScenario("CASE-01");
    const result = analyzeCaseGraph({
      graphData: case01.graphData,
      transactions: case01.caseContext.transactions,
      caseContext: case01.caseContext,
    });

    expect(result.smurfing_detected).toBe(true);
    expect(result.smurfing_groups).toEqual(
      expect.arrayContaining([
        {
          fromAccount: "ACC_HUNG_SIM",
          toAccount: "ACC_MULE_01",
          day: "2026-11-20",
          txCount: 4,
          totalVnd: 38_000_000,
        },
        {
          fromAccount: "ACC_VICTIM_C_SIM",
          toAccount: "ACC_MULE_03",
          day: "2026-11-20",
          txCount: 3,
          totalVnd: 27_600_000,
        },
      ]),
    );

    expect(result.mule_cluster_detected).toBe(true);
    expect(result.shared_devices).toEqual([
      {
        deviceId: "DEV_ANDROID_99",
        accounts: ["ACC_MULE_01", "ACC_MULE_02", "ACC_MULE_03"],
      },
    ]);
    expect(result.shared_ips).toEqual([
      {
        ipAddress: "IP_PROXY_88",
        accounts: ["ACC_MULE_01", "ACC_MULE_02", "ACC_MULE_03"],
      },
    ]);

    const sharedDeviceAccounts = result.shared_devices.flatMap((d) => d.accounts);
    expect(sharedDeviceAccounts).not.toContain("ACC_HUNG_SIM");
    expect(sharedDeviceAccounts).not.toContain("ACC_VICTIM_B_SIM");
    expect(sharedDeviceAccounts).not.toContain("ACC_VICTIM_C_SIM");

    expect(result.flagged_node_ids).toEqual(
      expect.arrayContaining([
        "ACC_MULE_01",
        "ACC_MULE_02",
        "ACC_MULE_03",
        "DEV_ANDROID_99",
        "IP_PROXY_88",
        "ACC_MASTER_OUT",
      ]),
    );
    expect(result.flagged_node_ids).not.toContain("ACC_HUNG_SIM");
    expect(result.flagged_node_ids).not.toContain("ACC_VICTIM_B_SIM");
    expect(result.flagged_node_ids).not.toContain("ACC_VICTIM_C_SIM");

    // Every flagged node/edge ID must exist in the annotated graph and match `flagged` booleans
    const nodeIds = new Set(result.annotatedGraph.nodes.map((n) => n.id));
    for (const id of result.flagged_node_ids) {
      expect(nodeIds.has(id)).toBe(true);
    }
    expect(
      result.annotatedGraph.nodes
        .filter((n) => n.flagged)
        .map((n) => n.id),
    ).toEqual(result.flagged_node_ids);
    expect(
      result.annotatedGraph.edges
        .filter((e) => e.flagged)
        .map((e) => e.id),
    ).toEqual(result.flagged_edge_ids);

    expect(result.risk_contribution).toBeGreaterThanOrEqual(80);
    expect(result.key_findings_vi.length).toBeGreaterThan(0);
    expect(GraphDataSchema.safeParse(result.annotatedGraph).success).toBe(true);
  });

  it("CASE-02 (Minh Anh APK): no smurfing/mule false positives, flags DOMAIN_FAKE_APK cyber node cleanly", () => {
    const case02 = getScenario("CASE-02");
    const result = analyzeCaseGraph({
      graphData: case02.graphData,
      transactions: case02.caseContext.transactions,
      caseContext: case02.caseContext,
    });

    expect(result.smurfing_detected).toBe(false);
    expect(result.mule_cluster_detected).toBe(false);
    expect(result.smurfing_groups).toEqual([]);
    expect(result.shared_devices).toEqual([]);
    expect(result.shared_ips).toEqual([]);

    expect(result.flagged_node_ids).toContain("DOMAIN_FAKE_APK");
    expect(result.flagged_node_ids).not.toContain("USER_MINHANH_SIM");
    expect(result.flagged_edge_ids).toContain("EDGE_C02_USER_DOMAIN");
    expect(result.key_findings_vi.some((f) => f.includes("DOMAIN_FAKE_APK"))).toBe(
      true,
    );
    expect(result.risk_contribution).toBeGreaterThanOrEqual(45);
    expect(
      result.annotatedGraph.nodes.find((n) => n.id === "DOMAIN_FAKE_APK")?.flagged,
    ).toBe(true);
    expect(
      result.annotatedGraph.nodes.find((n) => n.id === "USER_MINHANH_SIM")?.flagged,
    ).toBe(false);
  });

  it("CASE-03 (Chị Hoa — 35 retail livestream txs): zero false positives, empty flags, low risk, rich benign signals", () => {
    const case03 = getScenario("CASE-03");
    const result = analyzeCaseGraph({
      graphData: case03.graphData,
      transactions: case03.caseContext.transactions,
      caseContext: case03.caseContext,
    });

    expect(result.smurfing_detected).toBe(false);
    expect(result.mule_cluster_detected).toBe(false);
    expect(result.smurfing_groups).toEqual([]);
    expect(result.shared_devices).toEqual([]);
    expect(result.shared_ips).toEqual([]);
    expect(result.flagged_node_ids).toEqual([]);
    expect(result.flagged_edge_ids).toEqual([]);
    expect(result.risk_contribution).toBeLessThanOrEqual(20);
    expect(result.benign_graph_signals_vi.length).toBeGreaterThan(0);
    expect(result.annotatedGraph.nodes.every((n) => n.flagged === false)).toBe(true);
    expect(result.annotatedGraph.edges.every((e) => e.flagged === false)).toBe(true);
  });
});

describe("Wave 2 Graph Algo — Edge Cases & From-Scratch Graph Builder", () => {
  it("handles empty transactions array safely", () => {
    const smurfing = detectSmurfing([]);
    expect(smurfing.smurfing_detected).toBe(false);
    expect(smurfing.smurfing_groups).toEqual([]);

    const mules = detectMuleClusters([]);
    expect(mules.mule_cluster_detected).toBe(false);
    expect(mules.shared_devices).toEqual([]);
    expect(mules.shared_ips).toEqual([]);

    const graph = buildTransactionGraph([]);
    expect(GraphDataSchema.parse(graph).nodes).toEqual([]);
    expect(graph.edges).toEqual([]);
  });

  it("does not flag a single 9.5M transaction as smurfing", () => {
    const singleTx: SyntheticTransaction[] = [
      {
        txId: "TX_SINGLE_01",
        fromAccount: "ACC_A",
        toAccount: "ACC_B",
        amountVnd: 9_500_000,
        timestamp: "2026-11-21T09:00:00.000Z",
        deviceId: "DEV_A",
        ipAddress: "10.0.0.1",
      },
    ];
    const res = detectSmurfing(singleTx);
    expect(res.smurfing_detected).toBe(false);
    expect(res.smurfing_groups).toEqual([]);
  });

  it("does not flag exact boundary 10,000,000 VND transfers as below-threshold smurfing", () => {
    const boundaryTxs: SyntheticTransaction[] = [
      {
        txId: "TX_BOUND_01",
        fromAccount: "ACC_A",
        toAccount: "ACC_B",
        amountVnd: SMURFING_SINGLE_LIMIT_VND,
        timestamp: "2026-11-21T10:00:00.000Z",
        deviceId: "DEV_A",
        ipAddress: "10.0.0.1",
      },
      {
        txId: "TX_BOUND_02",
        fromAccount: "ACC_A",
        toAccount: "ACC_B",
        amountVnd: SMURFING_SINGLE_LIMIT_VND,
        timestamp: "2026-11-21T10:05:00.000Z",
        deviceId: "DEV_A",
        ipAddress: "10.0.0.1",
      },
      {
        txId: "TX_BOUND_03",
        fromAccount: "ACC_A",
        toAccount: "ACC_B",
        amountVnd: SMURFING_SINGLE_LIMIT_VND,
        timestamp: "2026-11-21T10:10:00.000Z",
        deviceId: "DEV_A",
        ipAddress: "10.0.0.1",
      },
    ];
    const res = detectSmurfing(boundaryTxs);
    expect(res.smurfing_detected).toBe(false);
    expect(res.smurfing_groups).toEqual([]);
  });

  it("detects same-sender cross-account split bursts exceeding 20M/day", () => {
    const burstTxs: SyntheticTransaction[] = [
      {
        txId: "TX_SPLIT_01",
        fromAccount: "ACC_SENDER_SPLIT",
        toAccount: "ACC_RECV_1",
        amountVnd: 9_000_000,
        timestamp: "2026-11-21T11:00:00.000Z",
        deviceId: "DEV_S1",
        ipAddress: "10.1.1.1",
      },
      {
        txId: "TX_SPLIT_02",
        fromAccount: "ACC_SENDER_SPLIT",
        toAccount: "ACC_RECV_1",
        amountVnd: 9_000_000,
        timestamp: "2026-11-21T11:02:00.000Z",
        deviceId: "DEV_S1",
        ipAddress: "10.1.1.1",
      },
      {
        txId: "TX_SPLIT_03",
        fromAccount: "ACC_SENDER_SPLIT",
        toAccount: "ACC_RECV_2",
        amountVnd: 9_000_000,
        timestamp: "2026-11-21T11:04:00.000Z",
        deviceId: "DEV_S1",
        ipAddress: "10.1.1.1",
      },
    ];
    const res = detectSmurfing(burstTxs);
    expect(res.smurfing_detected).toBe(true);
    expect(res.smurfing_groups).toHaveLength(1);
    expect(res.smurfing_groups[0]).toMatchObject({
      fromAccount: "ACC_SENDER_SPLIT",
      day: "2026-11-21",
      txCount: 3,
      totalVnd: 27_000_000,
    });
  });

  it("buckets smurfing days in Asia/Ho_Chi_Minh (UTC+7) across +07:00 and Z timestamp boundaries", () => {
    // 17:05Z is 00:05+07:00 (2026-11-21), so it merges with +07:00 and 00:05Z (07:05+07:00) on 2026-11-21,
    // while 16:55Z is 23:55+07:00 (2026-11-20) and stays in the prior VN calendar day.
    const tzBoundaryTxs: SyntheticTransaction[] = [
      {
        txId: "TX_TZ_PREV_VN_DAY",
        fromAccount: "ACC_TZ_SENDER",
        toAccount: "ACC_TZ_RECV",
        amountVnd: 9_500_000,
        timestamp: "2026-11-20T16:55:00.000Z", // 2026-11-20 23:55 +07:00
        deviceId: "DEV_TZ",
        ipAddress: "10.2.2.1",
      },
      {
        txId: "TX_TZ_NEXT_01",
        fromAccount: "ACC_TZ_SENDER",
        toAccount: "ACC_TZ_RECV",
        amountVnd: 9_500_000,
        timestamp: "2026-11-20T17:05:00.000Z", // 2026-11-21 00:05 +07:00
        deviceId: "DEV_TZ",
        ipAddress: "10.2.2.1",
      },
      {
        txId: "TX_TZ_NEXT_02",
        fromAccount: "ACC_TZ_SENDER",
        toAccount: "ACC_TZ_RECV",
        amountVnd: 9_500_000,
        timestamp: "2026-11-21T00:06:00+07:00", // 2026-11-21 00:06 +07:00
        deviceId: "DEV_TZ",
        ipAddress: "10.2.2.1",
      },
      {
        txId: "TX_TZ_NEXT_03",
        fromAccount: "ACC_TZ_SENDER",
        toAccount: "ACC_TZ_RECV",
        amountVnd: 9_500_000,
        timestamp: "2026-11-21T00:05:00.000Z", // 2026-11-21 07:05 +07:00
        deviceId: "DEV_TZ",
        ipAddress: "10.2.2.1",
      },
    ];

    const res = detectSmurfing(tzBoundaryTxs);
    expect(res.smurfing_detected).toBe(true);
    expect(res.smurfing_groups).toEqual([
      {
        fromAccount: "ACC_TZ_SENDER",
        toAccount: "ACC_TZ_RECV",
        day: "2026-11-21",
        txCount: 3,
        totalVnd: 28_500_000,
      },
    ]);
    expect(res.flagged_tx_ids).not.toContain("TX_TZ_PREV_VN_DAY");
  });

  it("builds a validated GraphData from scratch via buildTransactionGraph and syncs flags deterministically", () => {
    const customTxs: SyntheticTransaction[] = [
      {
        txId: "TX_CUSTOM_1",
        fromAccount: "VICTIM_X",
        toAccount: "MULE_A",
        amountVnd: 9_400_000,
        timestamp: "2026-11-22T08:00:00.000Z",
        deviceId: "DEV_VICTIM_X",
        ipAddress: "192.0.2.10",
      },
      {
        txId: "TX_CUSTOM_2",
        fromAccount: "VICTIM_X",
        toAccount: "MULE_A",
        amountVnd: 9_400_000,
        timestamp: "2026-11-22T08:02:00.000Z",
        deviceId: "DEV_VICTIM_X",
        ipAddress: "192.0.2.10",
      },
      {
        txId: "TX_CUSTOM_3",
        fromAccount: "VICTIM_X",
        toAccount: "MULE_A",
        amountVnd: 9_400_000,
        timestamp: "2026-11-22T08:04:00.000Z",
        deviceId: "DEV_VICTIM_X",
        ipAddress: "192.0.2.10",
      },
      {
        txId: "TX_CUSTOM_4",
        fromAccount: "MULE_A",
        toAccount: "SINK_Z",
        amountVnd: 28_200_000,
        timestamp: "2026-11-22T08:10:00.000Z",
        deviceId: "DEV_MULE_SHARED",
        ipAddress: "198.51.100.7",
      },
      {
        txId: "TX_CUSTOM_5",
        fromAccount: "MULE_B",
        toAccount: "SINK_Z",
        amountVnd: 15_000_000,
        timestamp: "2026-11-22T08:12:00.000Z",
        deviceId: "DEV_MULE_SHARED",
        ipAddress: "198.51.100.7",
      },
    ];

    const built = buildTransactionGraph(customTxs);
    expect(GraphDataSchema.safeParse(built).success).toBe(true);
    expect(built.nodes.every((n) => n.position !== undefined)).toBe(true);

    const byId = new Map(built.nodes.map((n) => [n.id, n]));
    expect(byId.get("VICTIM_X")?.flagged).toBe(false);
    expect(byId.get("DEV_VICTIM_X")?.flagged).toBe(false);
    expect(byId.get("MULE_A")?.flagged).toBe(true);
    expect(byId.get("MULE_B")?.flagged).toBe(true);
    expect(byId.get("DEV_MULE_SHARED")?.flagged).toBe(true);
    expect(byId.get("198.51.100.7")?.flagged).toBe(true);
    expect(byId.get("SINK_Z")?.flagged).toBe(true);

    // Enriching an existing graph preserves labels/positions/metadata while correcting stale flags
    const case03 = getScenario("CASE-03");
    const tampered = {
      ...case03.graphData,
      nodes: case03.graphData.nodes.map((n) =>
        n.id === "MERCHANT_HOA_SIM" ? { ...n, flagged: true } : n,
      ),
    };
    const enriched = buildTransactionGraph(case03.caseContext.transactions, tampered);
    const merchant = enriched.nodes.find((n) => n.id === "MERCHANT_HOA_SIM");
    expect(merchant?.label).toBe("Shop Gia Dụng Hoa Mai (Mô phỏng)");
    expect(merchant?.position).toEqual({ x: 420, y: 220 });
    expect(merchant?.flagged).toBe(false);
  });
});
