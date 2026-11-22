import { z } from "zod";
import {
  type GraphData,
  GraphDataSchema,
  type GraphEdge,
  type GraphNode,
  type GraphNodeType,
  SMURFING_DAILY_LIMIT_VND,
  SMURFING_SINGLE_LIMIT_VND,
} from "@/contracts";

// shortcut: fixed 70%–100% band of the 10M biometric limit for near-threshold smurfing, upgrade to adaptive percentile thresholds with historical baselines
export const SMURFING_NEAR_THRESHOLD_MIN_VND = 7_000_000 as const;

export const SyntheticTransactionSchema = z.object({
  txId: z.string().min(1),
  fromAccount: z.string().min(1),
  toAccount: z.string().min(1),
  amountVnd: z.number().nonnegative(),
  timestamp: z.string().min(1),
  deviceId: z.string().min(1),
  ipAddress: z.string().min(1),
});
export type SyntheticTransaction = z.infer<typeof SyntheticTransactionSchema>;

export const GraphCaseContextSchema = z
  .object({
    persona: z.string().optional(),
    targetAccount: z.string().optional(),
    targetBank: z.string().optional(),
    suspiciousUrl: z.string().optional(),
    simoFlagSimulated: z.boolean().optional(),
    cleanHistoryMonths: z.number().int().nonnegative().optional(),
    complaintsCount: z.number().int().nonnegative().optional(),
    independentSources: z.array(z.string()).optional(),
    behavioralNoteVi: z.string().optional(),
    transactions: z.array(SyntheticTransactionSchema).optional(),
  })
  .passthrough();
export type GraphCaseContext = z.infer<typeof GraphCaseContextSchema>;

export interface SmurfingGroup {
  fromAccount: string;
  toAccount: string;
  day: string;
  txCount: number;
  totalVnd: number;
}

export interface SmurfingDetectionResult {
  smurfing_detected: boolean;
  smurfing_groups: SmurfingGroup[];
  flagged_tx_ids: string[];
  recipient_accounts: string[];
}

export interface SharedDeviceCluster {
  deviceId: string;
  accounts: string[];
}

export interface SharedIpCluster {
  ipAddress: string;
  accounts: string[];
}

export interface MuleClusterDetectionResult {
  mule_cluster_detected: boolean;
  shared_devices: SharedDeviceCluster[];
  shared_ips: SharedIpCluster[];
  mule_account_ids: string[];
  consolidation_account_ids: string[];
}

export interface AnalyzeCaseGraphInput {
  graphData?: GraphData;
  transactions?: SyntheticTransaction[];
  caseContext?: GraphCaseContext;
}

export interface GraphAnalysisResult {
  smurfing_detected: boolean;
  mule_cluster_detected: boolean;
  flagged_node_ids: string[];
  flagged_edge_ids: string[];
  smurfing_groups: SmurfingGroup[];
  shared_devices: SharedDeviceCluster[];
  shared_ips: SharedIpCluster[];
  key_findings_vi: string[];
  risk_contribution: number;
  benign_graph_signals_vi: string[];
  annotatedGraph: GraphData;
}

function formatVnd(amount: number): string {
  return `${Math.round(amount).toLocaleString("en-US").replace(/,/g, ".")}đ`;
}

const VIETNAM_UTC_OFFSET_MS = 7 * 60 * 60 * 1000;

function extractCalendarDay(timestamp: string): string {
  const trimmed = timestamp.trim();
  const parsed = new Date(trimmed);
  if (!Number.isNaN(parsed.getTime())) {
    return new Date(parsed.getTime() + VIETNAM_UTC_OFFSET_MS)
      .toISOString()
      .slice(0, 10);
  }
  const datePrefix = /^(\d{4}-\d{2}-\d{2})/.exec(trimmed);
  return datePrefix ? datePrefix[1] : "UNKNOWN_DAY";
}

function isNearBiometricThreshold(amountVnd: number): boolean {
  return (
    amountVnd >= SMURFING_NEAR_THRESHOLD_MIN_VND &&
    amountVnd < SMURFING_SINGLE_LIMIT_VND
  );
}

/**
 * Pure deterministic QĐ 2345/QĐ-NHNN smurfing detector.
 * Flags >= 2 same-day transfers strictly below 10M (>= 7M & < 10M) whose cumulative sum exceeds 20M/day,
 * both per (fromAccount, toAccount, day) pair and for same-sender split bursts across multiple recipients.
 */
export function detectSmurfing(
  transactions: SyntheticTransaction[],
): SmurfingDetectionResult {
  const txs = z.array(SyntheticTransactionSchema).parse(transactions);
  const nearThreshold = txs.filter((tx) => isNearBiometricThreshold(tx.amountVnd));

  const pairBuckets = new Map<string, SyntheticTransaction[]>();
  for (const tx of nearThreshold) {
    const day = extractCalendarDay(tx.timestamp);
    const key = `${tx.fromAccount}\0${tx.toAccount}\0${day}`;
    const list = pairBuckets.get(key);
    if (list) list.push(tx);
    else pairBuckets.set(key, [tx]);
  }

  const smurfingGroups: SmurfingGroup[] = [];
  const flaggedTxIds = new Set<string>();
  const recipientAccounts = new Set<string>();

  for (const [key, list] of pairBuckets.entries()) {
    if (list.length < 2) continue;
    const totalVnd = list.reduce((sum, tx) => sum + tx.amountVnd, 0);
    if (totalVnd <= SMURFING_DAILY_LIMIT_VND) continue;

    const [fromAccount, toAccount, day] = key.split("\0");
    smurfingGroups.push({
      fromAccount,
      toAccount,
      day,
      txCount: list.length,
      totalVnd,
    });
    recipientAccounts.add(toAccount);
    for (const tx of list) flaggedTxIds.add(tx.txId);
  }

  // Check same-sender split bursts across >= 2 distinct recipients not already flagged by pair check
  const senderDayBuckets = new Map<string, SyntheticTransaction[]>();
  for (const tx of nearThreshold) {
    if (flaggedTxIds.has(tx.txId)) continue;
    const day = extractCalendarDay(tx.timestamp);
    const key = `${tx.fromAccount}\0${day}`;
    const list = senderDayBuckets.get(key);
    if (list) list.push(tx);
    else senderDayBuckets.set(key, [tx]);
  }

  for (const [key, list] of senderDayBuckets.entries()) {
    if (list.length < 2) continue;
    const distinctRecipients = Array.from(new Set(list.map((t) => t.toAccount))).sort();
    if (distinctRecipients.length < 2) continue;
    const totalVnd = list.reduce((sum, tx) => sum + tx.amountVnd, 0);
    if (totalVnd <= SMURFING_DAILY_LIMIT_VND) continue;

    const [fromAccount, day] = key.split("\0");
    smurfingGroups.push({
      fromAccount,
      toAccount: distinctRecipients.join(", "),
      day,
      txCount: list.length,
      totalVnd,
    });
    for (const acc of distinctRecipients) recipientAccounts.add(acc);
    for (const tx of list) flaggedTxIds.add(tx.txId);
  }

  smurfingGroups.sort((a, b) =>
    `${a.day}:${a.fromAccount}:${a.toAccount}`.localeCompare(
      `${b.day}:${b.fromAccount}:${b.toAccount}`,
    ),
  );

  return {
    smurfing_detected: smurfingGroups.length > 0,
    smurfing_groups: smurfingGroups,
    flagged_tx_ids: Array.from(flaggedTxIds),
    recipient_accounts: Array.from(recipientAccounts).sort(),
  };
}

function addToMapSet(map: Map<string, Set<string>>, key: string, value: string): void {
  const existing = map.get(key);
  if (existing) existing.add(value);
  else map.set(key, new Set([value]));
}

/**
 * Pure deterministic mule-cluster detector.
 * Identifies devices and IPs shared by >= 2 distinct sending accounts moving funds outbound,
 * plus SHARED_DEVICE / SHARED_IP graph edges linking >= 2 distinct non-victim accounts.
 */
export function detectMuleClusters(
  transactions: SyntheticTransaction[],
  graphData?: GraphData,
): MuleClusterDetectionResult {
  const txs = z.array(SyntheticTransactionSchema).parse(transactions);
  const parsedGraph = graphData ? GraphDataSchema.parse(graphData) : undefined;

  const nodeTypeById = new Map<string, GraphNodeType>();
  if (parsedGraph) {
    for (const node of parsedGraph.nodes) {
      nodeTypeById.set(node.id, node.type);
    }
  }

  const deviceToAccounts = new Map<string, Set<string>>();
  const ipToAccounts = new Map<string, Set<string>>();

  // 1. Outbound sending accounts sharing a deviceId or ipAddress in transactions
  for (const tx of txs) {
    if (nodeTypeById.get(tx.fromAccount) === "VICTIM") continue;
    addToMapSet(deviceToAccounts, tx.deviceId, tx.fromAccount);
    addToMapSet(ipToAccounts, tx.ipAddress, tx.fromAccount);
  }

  // 2. SHARED_DEVICE / SHARED_IP edges in GraphData
  if (parsedGraph) {
    for (const edge of parsedGraph.edges) {
      if (edge.edge_type !== "SHARED_DEVICE" && edge.edge_type !== "SHARED_IP") {
        continue;
      }
      const expectedResourceType =
        edge.edge_type === "SHARED_DEVICE" ? "DEVICE" : "IP";
      const srcType = nodeTypeById.get(edge.source);
      const tgtType = nodeTypeById.get(edge.target);

      let accountId: string;
      let resourceId: string;
      if (tgtType === expectedResourceType && srcType !== expectedResourceType) {
        accountId = edge.source;
        resourceId = edge.target;
      } else if (srcType === expectedResourceType && tgtType !== expectedResourceType) {
        accountId = edge.target;
        resourceId = edge.source;
      } else {
        accountId = edge.source;
        resourceId = edge.target;
      }

      const accType = nodeTypeById.get(accountId);
      if (accType === "DEVICE" || accType === "IP" || accType === "VICTIM") {
        continue;
      }

      if (edge.edge_type === "SHARED_DEVICE") {
        addToMapSet(deviceToAccounts, resourceId, accountId);
      } else {
        addToMapSet(ipToAccounts, resourceId, accountId);
      }
    }
  }

  const sharedDevices: SharedDeviceCluster[] = [];
  const sharedIps: SharedIpCluster[] = [];
  const muleAccounts = new Set<string>();

  for (const [deviceId, accounts] of deviceToAccounts.entries()) {
    if (accounts.size >= 2) {
      const sorted = Array.from(accounts).sort();
      sharedDevices.push({ deviceId, accounts: sorted });
      for (const acc of sorted) muleAccounts.add(acc);
    }
  }

  for (const [ipAddress, accounts] of ipToAccounts.entries()) {
    if (accounts.size >= 2) {
      const sorted = Array.from(accounts).sort();
      sharedIps.push({ ipAddress, accounts: sorted });
      for (const acc of sorted) muleAccounts.add(acc);
    }
  }

  sharedDevices.sort((a, b) => a.deviceId.localeCompare(b.deviceId));
  sharedIps.sort((a, b) => a.ipAddress.localeCompare(b.ipAddress));

  // Identify consolidation accounts receiving outbound transfers from >= 2 mule accounts
  const sinkSenders = new Map<string, Set<string>>();
  for (const tx of txs) {
    if (muleAccounts.has(tx.fromAccount) && !muleAccounts.has(tx.toAccount)) {
      addToMapSet(sinkSenders, tx.toAccount, tx.fromAccount);
    }
  }
  if (parsedGraph) {
    for (const edge of parsedGraph.edges) {
      if (
        edge.edge_type === "TRANSFER" &&
        muleAccounts.has(edge.source) &&
        !muleAccounts.has(edge.target)
      ) {
        addToMapSet(sinkSenders, edge.target, edge.source);
      }
    }
  }

  const consolidationAccounts = Array.from(sinkSenders.entries())
    .filter(([, senders]) => senders.size >= 2)
    .map(([target]) => target)
    .sort();

  return {
    mule_cluster_detected: sharedDevices.length > 0 || sharedIps.length > 0,
    shared_devices: sharedDevices,
    shared_ips: sharedIps,
    mule_account_ids: Array.from(muleAccounts).sort(),
    consolidation_account_ids: consolidationAccounts,
  };
}

interface CyberInspection {
  cyberNodeIds: Set<string>;
  compromisedDeviceIds: Set<string>;
  c2IpIds: Set<string>;
}

function inspectCyberNodes(graph: GraphData): CyberInspection {
  const cyberNodeIds = new Set<string>();
  const compromisedDeviceIds = new Set<string>();
  const c2IpIds = new Set<string>();

  const nodeById = new Map(graph.nodes.map((n) => [n.id, n]));
  const simoLinkedNodeIds = new Set<string>();
  for (const edge of graph.edges) {
    if (edge.edge_type === "SIMO_LINK") {
      simoLinkedNodeIds.add(edge.source);
      simoLinkedNodeIds.add(edge.target);
    }
  }

  for (const node of graph.nodes) {
    const meta = node.metadata ?? {};
    const hasThreatMeta =
      typeof meta.threat === "string" || typeof meta.url === "string";
    if (
      (node.type === "SCAMMER" && (hasThreatMeta || simoLinkedNodeIds.has(node.id))) ||
      (node.type !== "VICTIM" && hasThreatMeta)
    ) {
      cyberNodeIds.add(node.id);
    }
    if (node.type === "DEVICE" && meta.accessibilityRisk === true) {
      compromisedDeviceIds.add(node.id);
    }
  }

  // Flag IP endpoints directly connected from a cyber threat node or compromised device
  const cyberRelatedIds = new Set([...cyberNodeIds, ...compromisedDeviceIds]);
  for (const edge of graph.edges) {
    const src = nodeById.get(edge.source);
    const tgt = nodeById.get(edge.target);
    if (!src || !tgt) continue;
    if (cyberRelatedIds.has(src.id) && tgt.type === "IP") {
      c2IpIds.add(tgt.id);
    } else if (cyberRelatedIds.has(tgt.id) && src.type === "IP") {
      c2IpIds.add(src.id);
    }
  }

  return { cyberNodeIds, compromisedDeviceIds, c2IpIds };
}

function computeFlaggedElements(
  graph: GraphData,
  smurfing: SmurfingDetectionResult,
  mules: MuleClusterDetectionResult,
  cyber: CyberInspection,
): { flaggedNodeIds: string[]; flaggedEdgeIds: string[] } {
  const nodeById = new Map(graph.nodes.map((n) => [n.id, n]));
  const flaggedNodeSet = new Set<string>();

  const muleSet = new Set(mules.mule_account_ids);
  const consolidationSet = new Set(mules.consolidation_account_ids);
  const sharedDeviceSet = new Set(mules.shared_devices.map((d) => d.deviceId));
  const sharedIpSet = new Set(mules.shared_ips.map((ip) => ip.ipAddress));
  const smurfingRecipientSet = new Set(smurfing.recipient_accounts);

  const smurfingPairs = new Set<string>();
  for (const g of smurfing.smurfing_groups) {
    for (const recipient of g.toAccount.split(",").map((s) => s.trim())) {
      smurfingPairs.add(`${g.fromAccount}\0${recipient}`);
    }
  }

  for (const node of graph.nodes) {
    if (node.type === "VICTIM") continue;
    if (
      muleSet.has(node.id) ||
      consolidationSet.has(node.id) ||
      sharedDeviceSet.has(node.id) ||
      sharedIpSet.has(node.id) ||
      smurfingRecipientSet.has(node.id) ||
      cyber.cyberNodeIds.has(node.id) ||
      cyber.compromisedDeviceIds.has(node.id) ||
      cyber.c2IpIds.has(node.id) ||
      node.type === "SCAMMER"
    ) {
      flaggedNodeSet.add(node.id);
    }
  }

  const cyberAllSet = new Set([
    ...cyber.cyberNodeIds,
    ...cyber.compromisedDeviceIds,
    ...cyber.c2IpIds,
  ]);

  const flaggedEdgeSet = new Set<string>();
  for (const edge of graph.edges) {
    if (edge.edge_type === "TRANSFER") {
      if (
        smurfingPairs.has(`${edge.source}\0${edge.target}`) ||
        muleSet.has(edge.source) ||
        muleSet.has(edge.target) ||
        consolidationSet.has(edge.target) ||
        smurfingRecipientSet.has(edge.target)
      ) {
        flaggedEdgeSet.add(edge.id);
      }
      continue;
    }

    if (edge.edge_type === "SHARED_DEVICE") {
      if (
        (sharedDeviceSet.has(edge.target) && muleSet.has(edge.source)) ||
        (sharedDeviceSet.has(edge.source) && muleSet.has(edge.target))
      ) {
        flaggedEdgeSet.add(edge.id);
      }
      continue;
    }

    if (edge.edge_type === "SHARED_IP") {
      const isMuleIp =
        (sharedIpSet.has(edge.target) && muleSet.has(edge.source)) ||
        (sharedIpSet.has(edge.source) && muleSet.has(edge.target));
      const isCyberIp =
        cyberAllSet.has(edge.source) &&
        cyberAllSet.has(edge.target) &&
        (nodeById.get(edge.source)?.type === "IP" ||
          nodeById.get(edge.target)?.type === "IP");
      if (isMuleIp || isCyberIp) {
        flaggedEdgeSet.add(edge.id);
      }
      continue;
    }

    if (edge.edge_type === "SIMO_LINK") {
      if (flaggedNodeSet.has(edge.source) || flaggedNodeSet.has(edge.target)) {
        flaggedEdgeSet.add(edge.id);
      }
    }
  }

  const flaggedNodeIds = graph.nodes
    .filter((n) => flaggedNodeSet.has(n.id))
    .map((n) => n.id);
  const flaggedEdgeIds = graph.edges
    .filter((e) => flaggedEdgeSet.has(e.id))
    .map((e) => e.id);

  return { flaggedNodeIds, flaggedEdgeIds };
}

function applyFlagsToGraph(
  graph: GraphData,
  flaggedNodeIds: string[],
  flaggedEdgeIds: string[],
): GraphData {
  const flaggedNodeSet = new Set(flaggedNodeIds);
  const flaggedEdgeSet = new Set(flaggedEdgeIds);

  return GraphDataSchema.parse({
    ...graph,
    nodes: graph.nodes.map((node) => ({
      ...node,
      flagged: flaggedNodeSet.has(node.id),
    })),
    edges: graph.edges.map((edge) => ({
      ...edge,
      flagged: flaggedEdgeSet.has(edge.id),
    })),
  });
}

function buildGraphFromTransactions(
  txs: SyntheticTransaction[],
  smurfing: SmurfingDetectionResult,
  mules: MuleClusterDetectionResult,
): GraphData {
  const muleSet = new Set(mules.mule_account_ids);
  const consolidationSet = new Set(mules.consolidation_account_ids);
  const smurfingSenderSet = new Set(smurfing.smurfing_groups.map((g) => g.fromAccount));
  const smurfingRecipientSet = new Set(smurfing.recipient_accounts);

  const accountIds = new Set<string>();
  const deviceIds = new Set<string>();
  const ipIds = new Set<string>();

  for (const tx of txs) {
    accountIds.add(tx.fromAccount);
    accountIds.add(tx.toAccount);
    deviceIds.add(tx.deviceId);
    ipIds.add(tx.ipAddress);
  }

  const leftCol: GraphNode[] = [];
  const midCol: GraphNode[] = [];
  const infraCol: GraphNode[] = [];
  const rightCol: GraphNode[] = [];

  for (const accountId of Array.from(accountIds).sort()) {
    let type: GraphNodeType = "BANK_ACCOUNT";
    if (consolidationSet.has(accountId)) {
      type = "SCAMMER";
    } else if (muleSet.has(accountId)) {
      type = "MULE";
    } else if (smurfingSenderSet.has(accountId)) {
      type = "VICTIM";
    } else if (smurfingRecipientSet.has(accountId)) {
      type = "MULE";
    }

    const node: GraphNode = {
      id: accountId,
      type,
      label: accountId,
      flagged: false,
      metadata: {},
    };

    if (type === "SCAMMER") rightCol.push(node);
    else if (type === "MULE") midCol.push(node);
    else leftCol.push(node);
  }

  for (const deviceId of Array.from(deviceIds).sort()) {
    infraCol.push({
      id: deviceId,
      type: "DEVICE",
      label: deviceId,
      flagged: false,
      metadata: {},
    });
  }

  for (const ipAddress of Array.from(ipIds).sort()) {
    infraCol.push({
      id: ipAddress,
      type: "IP",
      label: ipAddress,
      flagged: false,
      metadata: {},
    });
  }

  // shortcut: fixed column grid layout for transaction-derived graphs, upgrade to dagre/elk if graph exceeds ~50 nodes
  const placeColumn = (nodes: GraphNode[], x: number): GraphNode[] =>
    nodes.map((node, idx) => ({ ...node, position: { x, y: 80 + idx * 120 } }));

  const nodes: GraphNode[] = [
    ...placeColumn(leftCol, 60),
    ...placeColumn(midCol, 340),
    ...placeColumn(infraCol, 620),
    ...placeColumn(rightCol, 900),
  ];

  const transferMap = new Map<
    string,
    { source: string; target: string; totalVnd: number; count: number; lastTs: string }
  >();
  const deviceEdges = new Map<string, { source: string; target: string }>();
  const ipEdges = new Map<string, { source: string; target: string }>();

  for (const tx of txs) {
    const txKey = `${tx.fromAccount}\0${tx.toAccount}`;
    const existing = transferMap.get(txKey);
    if (existing) {
      existing.totalVnd += tx.amountVnd;
      existing.count += 1;
      if (tx.timestamp > existing.lastTs) existing.lastTs = tx.timestamp;
    } else {
      transferMap.set(txKey, {
        source: tx.fromAccount,
        target: tx.toAccount,
        totalVnd: tx.amountVnd,
        count: 1,
        lastTs: tx.timestamp,
      });
    }

    deviceEdges.set(`${tx.fromAccount}\0${tx.deviceId}`, {
      source: tx.fromAccount,
      target: tx.deviceId,
    });
    ipEdges.set(`${tx.fromAccount}\0${tx.ipAddress}`, {
      source: tx.fromAccount,
      target: tx.ipAddress,
    });
  }

  const edges: GraphEdge[] = [];
  for (const agg of transferMap.values()) {
    edges.push({
      id: `EDGE_TX_${agg.source}_${agg.target}`,
      source: agg.source,
      target: agg.target,
      edge_type: "TRANSFER",
      label:
        agg.count > 1
          ? `${agg.count} GD · ${formatVnd(agg.totalVnd)}`
          : formatVnd(agg.totalVnd),
      amount_vnd: agg.totalVnd,
      tx_count: agg.count,
      timestamp: agg.lastTs,
      flagged: false,
    });
  }

  for (const link of deviceEdges.values()) {
    edges.push({
      id: `EDGE_DEV_${link.source}_${link.target}`,
      source: link.source,
      target: link.target,
      edge_type: "SHARED_DEVICE",
      label: "Thiết bị",
      flagged: false,
    });
  }

  for (const link of ipEdges.values()) {
    edges.push({
      id: `EDGE_IP_${link.source}_${link.target}`,
      source: link.source,
      target: link.target,
      edge_type: "SHARED_IP",
      label: "IP",
      flagged: false,
    });
  }

  const badgeParts: string[] = [];
  if (smurfing.smurfing_detected) badgeParts.push("Phát hiện Smurfing QĐ 2345");
  if (mules.mule_cluster_detected) badgeParts.push("Phát hiện Cụm Mule");
  if (badgeParts.length === 0) badgeParts.push(`${txs.length} giao dịch`);

  return GraphDataSchema.parse({
    nodes,
    edges,
    summary_badge: badgeParts.join(" · "),
  });
}

function evaluateGraphPipeline(
  txs: SyntheticTransaction[],
  parsedExisting?: GraphData,
) {
  const smurfing = detectSmurfing(txs);
  const mules = detectMuleClusters(txs, parsedExisting);
  const baseGraph =
    parsedExisting ?? buildGraphFromTransactions(txs, smurfing, mules);
  const cyber = inspectCyberNodes(baseGraph);
  const { flaggedNodeIds, flaggedEdgeIds } = computeFlaggedElements(
    baseGraph,
    smurfing,
    mules,
    cyber,
  );
  const annotatedGraph = applyFlagsToGraph(
    baseGraph,
    flaggedNodeIds,
    flaggedEdgeIds,
  );
  return {
    smurfing,
    mules,
    baseGraph,
    cyber,
    flaggedNodeIds,
    flaggedEdgeIds,
    annotatedGraph,
  };
}

/**
 * Pure function that builds or enriches a validated GraphData object linking accounts, devices, and IPs.
 * When existingGraph is provided, preserves its labels/positions/metadata while deterministically updating `flagged` states.
 */
export function buildTransactionGraph(
  transactions: SyntheticTransaction[],
  existingGraph?: GraphData,
): GraphData {
  const txs = z.array(SyntheticTransactionSchema).parse(transactions);
  const parsedExisting = existingGraph
    ? GraphDataSchema.parse(existingGraph)
    : undefined;
  return evaluateGraphPipeline(txs, parsedExisting).annotatedGraph;
}

/**
 * Runs complete deterministic graph analysis combining QĐ 2345 smurfing detection,
 * mule-ring shared device/IP clustering, and cyber-node inspection.
 */
export function analyzeCaseGraph(input: AnalyzeCaseGraphInput): GraphAnalysisResult {
  const caseContext = input.caseContext
    ? GraphCaseContextSchema.parse(input.caseContext)
    : undefined;
  const rawTransactions =
    input.transactions !== undefined
      ? input.transactions
      : (caseContext?.transactions ?? []);
  const txs = z.array(SyntheticTransactionSchema).parse(rawTransactions);
  const parsedExisting = input.graphData
    ? GraphDataSchema.parse(input.graphData)
    : undefined;

  const {
    smurfing,
    mules,
    baseGraph,
    cyber,
    flaggedNodeIds,
    flaggedEdgeIds,
    annotatedGraph,
  } = evaluateGraphPipeline(txs, parsedExisting);

  // Build concise factual Vietnamese findings
  const keyFindings: string[] = [];
  for (const g of smurfing.smurfing_groups) {
    keyFindings.push(
      `Phát hiện dấu hiệu chia nhỏ giao dịch (smurfing) né ngưỡng QĐ 2345/QĐ-NHNN: ${g.fromAccount} → ${g.toAccount} (${g.txCount} lệnh dưới 10 triệu, tổng ${formatVnd(g.totalVnd)} trong ngày ${g.day}, vượt ngưỡng 20 triệu/ngày).`,
    );
  }
  for (const d of mules.shared_devices) {
    keyFindings.push(
      `Phát hiện cụm ví dùng chung thiết bị ${d.deviceId}: ${d.accounts.length} tài khoản (${d.accounts.join(", ")}) thực hiện chuyển tiền.`,
    );
  }
  for (const ip of mules.shared_ips) {
    keyFindings.push(
      `Phát hiện cụm ví dùng chung IP ${ip.ipAddress}: ${ip.accounts.length} tài khoản (${ip.accounts.join(", ")}).`,
    );
  }
  if (mules.consolidation_account_ids.length > 0) {
    keyFindings.push(
      `Dòng tiền từ cụm ví nghi vấn được gom về tài khoản đích: ${mules.consolidation_account_ids.join(", ")}.`,
    );
  }

  const nodeById = new Map(baseGraph.nodes.map((n) => [n.id, n]));
  for (const id of cyber.cyberNodeIds) {
    const node = nodeById.get(id);
    if (!node) continue;
    const threat =
      typeof node.metadata?.threat === "string" ? ` (${node.metadata.threat})` : "";
    keyFindings.push(
      `Phát hiện nút hạ tầng nghi vấn ${node.id}: ${node.label}${threat}.`,
    );
  }
  for (const id of cyber.compromisedDeviceIds) {
    keyFindings.push(
      `Thiết bị ${id} có dấu hiệu rủi ro bị lạm dụng quyền Accessibility Services.`,
    );
  }
  for (const id of cyber.c2IpIds) {
    keyFindings.push(
      `Phát hiện liên kết tới máy chủ/IP nghi vấn ${id} từ chuỗi hạ tầng độc hại.`,
    );
  }
  if (keyFindings.length === 0) {
    keyFindings.push(
      "Không phát hiện dấu hiệu chia nhỏ giao dịch (QĐ 2345), cụm ví mule dùng chung thiết bị/IP, hay nút hạ tầng độc hại trên đồ thị.",
    );
  }

  // Build factual benign signals for FalsePositiveDefenderAgent
  const benignSignals: string[] = [];
  if (!smurfing.smurfing_detected) {
    benignSignals.push(
      txs.length > 0
        ? `Không phát hiện hành vi chia nhỏ giao dịch né ngưỡng 10 triệu/lần & 20 triệu/ngày (QĐ 2345/QĐ-NHNN) trong ${txs.length} giao dịch.`
        : "Không ghi nhận giao dịch chia nhỏ né ngưỡng QĐ 2345/QĐ-NHNN.",
    );
  }
  if (!mules.mule_cluster_detected) {
    const distinctSenders = new Set(txs.map((t) => t.fromAccount)).size;
    const distinctDevices = new Set(txs.map((t) => t.deviceId)).size;
    const distinctIps = new Set(txs.map((t) => t.ipAddress)).size;
    if (distinctSenders >= 2 && distinctDevices >= 2) {
      benignSignals.push(
        `${distinctSenders} tài khoản chuyển tiền sử dụng ${distinctDevices} thiết bị độc lập và ${distinctIps} IP riêng biệt; không có cụm ví mule dùng chung thiết bị/IP.`,
      );
    } else {
      benignSignals.push(
        "Không phát hiện nhiều tài khoản dùng chung thiết bị hoặc IP kiểu cụm mule.",
      );
    }
  }
  if (
    !smurfing.smurfing_detected &&
    !mules.mule_cluster_detected &&
    txs.length >= 5 &&
    txs.every((t) => t.amountVnd < 1_000_000)
  ) {
    const amounts = txs.map((t) => t.amountVnd);
    const minAmt = Math.min(...amounts);
    const maxAmt = Math.max(...amounts);
    const distinctSenders = new Set(txs.map((t) => t.fromAccount)).size;
    benignSignals.push(
      `Mô hình thanh toán bán lẻ phân tán: ${txs.length} giao dịch giá trị nhỏ (${formatVnd(minAmt)}–${formatVnd(maxAmt)}) từ ${distinctSenders} người mua độc lập.`,
    );
  }
  if (
    typeof caseContext?.cleanHistoryMonths === "number" &&
    caseContext.cleanHistoryMonths >= 6 &&
    caseContext.complaintsCount === 0
  ) {
    benignSignals.push(
      `Tài khoản có ${caseContext.cleanHistoryMonths} tháng lịch sử hoạt động sạch và 0 khiếu nại.`,
    );
  }
  const hasMerchantNode = baseGraph.nodes.some((n) => n.type === "MERCHANT");
  if (hasMerchantNode && !mules.mule_cluster_detected && flaggedNodeIds.length === 0) {
    benignSignals.push(
      "Tài khoản thương nhân vận hành trên thiết bị/IP cố định riêng biệt, không liên kết nút rủi ro.",
    );
  }

  // shortcut: additive heuristic risk weights (smurfing/mule/cyber), calibrate against labeled historical fraud cases in production
  let riskContribution = 0;
  if (smurfing.smurfing_detected) {
    riskContribution += 40;
    if (smurfing.smurfing_groups.length >= 2) riskContribution += 5;
  }
  if (mules.shared_devices.length > 0) riskContribution += 30;
  if (mules.shared_ips.length > 0) riskContribution += 15;
  if (mules.consolidation_account_ids.length > 0) riskContribution += 10;
  if (cyber.cyberNodeIds.size > 0) riskContribution += 45;
  if (cyber.compromisedDeviceIds.size > 0 || cyber.c2IpIds.size > 0) {
    riskContribution += 15;
  }
  if (caseContext?.simoFlagSimulated === true && riskContribution > 0) {
    riskContribution += 5;
  }
  riskContribution = Math.min(100, Math.max(0, Math.round(riskContribution)));

  return {
    smurfing_detected: smurfing.smurfing_detected,
    mule_cluster_detected: mules.mule_cluster_detected,
    flagged_node_ids: flaggedNodeIds,
    flagged_edge_ids: flaggedEdgeIds,
    smurfing_groups: smurfing.smurfing_groups,
    shared_devices: mules.shared_devices,
    shared_ips: mules.shared_ips,
    key_findings_vi: keyFindings,
    risk_contribution: riskContribution,
    benign_graph_signals_vi: benignSignals,
    annotatedGraph,
  };
}
