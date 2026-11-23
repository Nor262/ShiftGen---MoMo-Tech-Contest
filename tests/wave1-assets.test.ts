import { readFileSync, statSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  DEMO_SIMULATION_LABEL,
  GraphDataSchema,
  PolicyChunkSchema,
} from "@/contracts";
import { SCENARIO_FIXTURES } from "@/data/scenarios";
import { OFFICIAL_APP_STORE_GUIDANCE_VI } from "@/lib/safety-guidance";
import vnPolicies from "@/data/vnPolicies.json";


describe("Wave 1 Assets — Demo PNGs", () => {
  const expectedImages = [
    "zalo-fake-police.png",
    "vneid-apk.png",
    "livestream-merchant.png",
  ];

  it.each(expectedImages)(
    "renders %s with valid PNG magic bytes and size < 600 KB",
    (filename) => {
      const filePath = path.resolve(
        process.cwd(),
        "public",
        "demo-images",
        filename,
      );
      const stat = statSync(filePath);
      expect(stat.size).toBeGreaterThan(1024);
      expect(stat.size).toBeLessThan(600 * 1024);

      const header = readFileSync(filePath).subarray(0, 4);
      expect(Array.from(header)).toEqual([0x89, 0x50, 0x4e, 0x47]);
    },
  );
});

describe("Wave 1 Assets — Grounded Policy Knowledge Base", () => {
  it("validates all chunks in data/vnPolicies.json against PolicyChunkSchema", () => {
    expect(vnPolicies.length).toBeGreaterThanOrEqual(10);
    expect(vnPolicies.length).toBeLessThanOrEqual(14);

    const seenIds = new Set<string>();
    for (const raw of vnPolicies) {
      const parsed = PolicyChunkSchema.parse(raw);
      expect(seenIds.has(parsed.chunk_id)).toBe(false);
      seenIds.add(parsed.chunk_id);
      // Q22: law summaries only — no product self-promotion, no repealed QĐ 2345 cited as current.
      expect(parsed.content_vi).not.toMatch(/MoMo TrustLoop/);
      if (/2345/.test(parsed.content_vi + parsed.document_code)) {
        expect(parsed.content_vi).toMatch(/bãi bỏ/);
        expect(parsed.document_code).not.toMatch(/2345/);
      }
      // Every chunk states its verification level.
      expect(parsed.content_vi).toMatch(/\[(Đã đọc|Nguồn thứ cấp|Chưa có nguồn)/);
    }
  });
});

describe("Wave 1 Assets — Synthetic Scenario & Transaction Fixtures", () => {
  it("validates CASE-01, CASE-02, CASE-03 against GraphDataSchema and simulation label", () => {
    expect(SCENARIO_FIXTURES.map((s) => s.scenarioCode)).toEqual([
      "CASE-01",
      "CASE-02",
      "CASE-03",
    ]);

    for (const fixture of SCENARIO_FIXTURES) {
      expect(fixture.title).toContain(DEMO_SIMULATION_LABEL);
      expect(fixture.caseContext.simulationLabel).toBe(DEMO_SIMULATION_LABEL);
      const graph = GraphDataSchema.parse(fixture.graphData);
      expect(graph.nodes.every((n) => n.position !== undefined)).toBe(true);

      const nodeIds = new Set(graph.nodes.map((n) => n.id));
      for (const edge of graph.edges) {
        expect(nodeIds.has(edge.source)).toBe(true);
        expect(nodeIds.has(edge.target)).toBe(true);
      }
    }
  });

  it("verifies CASE-01 smurfing/mule transactions and CASE-03 clean merchant 35 transactions", () => {
    const case01 = SCENARIO_FIXTURES.find((s) => s.scenarioCode === "CASE-01")!;
    const hungTxs = case01.caseContext.transactions.filter(
      (t) => t.fromAccount === "ACC_HUNG_SIM",
    );
    expect(hungTxs).toHaveLength(4);
    expect(hungTxs.every((t) => t.amountVnd === 9_500_000)).toBe(true);

    const inboundVictimTxs = case01.caseContext.transactions.filter((t) =>
      ["ACC_HUNG_SIM", "ACC_VICTIM_B_SIM", "ACC_VICTIM_C_SIM"].includes(
        t.fromAccount,
      ),
    );
    expect(
      inboundVictimTxs.every(
        (t) => t.deviceId !== "DEV_ANDROID_99" && t.ipAddress !== "IP_PROXY_88",
      ),
    ).toBe(true);

    const muleOutTxs = case01.caseContext.transactions.filter(
      (t) => t.toAccount === "ACC_MASTER_OUT",
    );
    expect(muleOutTxs.map((t) => t.fromAccount)).toEqual([
      "ACC_MULE_01",
      "ACC_MULE_02",
      "ACC_MULE_03",
    ]);
    expect(
      muleOutTxs.every(
        (t) => t.deviceId === "DEV_ANDROID_99" && t.ipAddress === "IP_PROXY_88",
      ),
    ).toBe(true);

    const sharedIpMules = case01.graphData.edges
      .filter((e) => e.edge_type === "SHARED_IP" && e.target === "IP_PROXY_88")
      .map((e) => e.source);
    expect(sharedIpMules).toEqual([
      "ACC_MULE_01",
      "ACC_MULE_02",
      "ACC_MULE_03",
    ]);

    const case03 = SCENARIO_FIXTURES.find((s) => s.scenarioCode === "CASE-03")!;
    expect(case03.caseContext.transactions).toHaveLength(35);
    expect(case03.caseContext.complaintsCount).toBe(0);
    expect(case03.caseContext.cleanHistoryMonths).toBe(14);
    expect(
      new Set(case03.caseContext.transactions.map((t) => t.deviceId)).size,
    ).toBe(35);
  });

  it("CASE-02 depicts a fake VNeID update APK within legal guardrails (Q28)", () => {
    const case02 = SCENARIO_FIXTURES.find((s) => s.scenarioCode === "CASE-02")!;
    const text = JSON.stringify(case02);

    expect(case02.title).toContain(DEMO_SIMULATION_LABEL);
    expect(case02.title).toMatch(/VNeID giả/);
    expect(case02.demoImagePath).toBe("/demo-images/vneid-apk.png");
    // Every domain in the scenario is fictional (.example), never a real one.
    const domains = Array.from(text.matchAll(/https?:\/\/([a-z0-9.-]+)/gi)).map((m) => m[1]);
    expect(domains.length).toBeGreaterThan(0);
    for (const d of domains) expect(d).toMatch(/\.example$/);
    // Safety guidance shown on every APK lure points to official app stores and names VNeID.
    expect(OFFICIAL_APP_STORE_GUIDANCE_VI).toMatch(/VNeID/);
    expect(OFFICIAL_APP_STORE_GUIDANCE_VI).toMatch(/kho ứng dụng chính thức \(CH Play, App Store\)/);
  });
});
