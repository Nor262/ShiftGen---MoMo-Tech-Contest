"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Background,
  BackgroundVariant,
  Controls,
  Handle,
  MarkerType,
  MiniMap,
  Position,
  ReactFlow,
  ReactFlowProvider,
  type Edge,
  type Node,
  type NodeProps,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import {
  AlertOctagon,
  Building2,
  Cpu,
  Globe,
  ShieldCheck,
  Store,
  User,
  X,
} from "lucide-react";
import { type GraphData, type GraphNode, type GraphNodeType } from "@/contracts";
import {
  METADATA_KEY_LABELS,
  NODE_TYPE_META,
  formatMetadataValue,
  formatVnd,
} from "./labels";

interface TrustLoopNodeData extends Record<string, unknown> {
  raw: GraphNode;
  isFlagged: boolean;
  isVerifiedMerchant: boolean;
}

type TrustFlowNode = Node<TrustLoopNodeData, "trustNode">;

function getNodeIcon(type: GraphNodeType) {
  switch (type) {
    case "VICTIM":
      return <User className="h-3.5 w-3.5" aria-hidden="true" />;
    case "MULE":
    case "SCAMMER":
      return <AlertOctagon className="h-3.5 w-3.5" aria-hidden="true" />;
    case "MERCHANT":
      return <Store className="h-3.5 w-3.5" aria-hidden="true" />;
    case "DEVICE":
      return <Cpu className="h-3.5 w-3.5" aria-hidden="true" />;
    case "IP":
      return <Globe className="h-3.5 w-3.5" aria-hidden="true" />;
    case "BANK_ACCOUNT":
      return <Building2 className="h-3.5 w-3.5" aria-hidden="true" />;
  }
}

function TrustLoopGraphNode({ data, selected }: NodeProps<TrustFlowNode>) {
  const { raw, isFlagged, isVerifiedMerchant } = data;
  const typeMeta = NODE_TYPE_META[raw.type];

  const containerClass = isFlagged
    ? "border-[#ec652b]/80 bg-[#1a1314] text-slate-50"
    : isVerifiedMerchant
      ? "border-emerald-500/75 bg-[#091c18] text-emerald-50"
      : "border-slate-700 bg-[#0d1624] text-slate-100";

  const typeTextClass = isFlagged
    ? "text-[#fb923c]"
    : isVerifiedMerchant
      ? "text-emerald-300"
      : "text-slate-300";

  const riskBadgeClass = isFlagged
    ? "bg-[#c2410c]/30 text-[#fed7aa] border border-[#ec652b]/50"
    : isVerifiedMerchant
      ? "bg-emerald-500/20 text-emerald-200 border border-emerald-400/40"
      : "bg-slate-800/90 text-slate-300 border border-slate-700";

  return (
    <div
      className={`w-[240px] rounded-lg border-[1.5px] px-3 py-2.5 transition-colors ${containerClass} ${
        selected ? "ring-2 ring-[#0b57d0] ring-offset-2 ring-offset-[#011821]" : ""
      }`}
    >
      <Handle
        type="target"
        position={Position.Left}
        className="!h-2 !w-2 !border-[#011821] !bg-slate-400"
      />

      <div className="mb-1 flex items-center justify-between gap-2">
        <span
          className={`inline-flex items-center gap-1 whitespace-nowrap text-xs font-semibold uppercase tracking-wide ${typeTextClass}`}
        >
          {getNodeIcon(raw.type)}
          <span>{typeMeta.labelVi}</span>
        </span>
        {typeof raw.risk_score === "number" && (
          <span
            className={`whitespace-nowrap rounded px-1.5 py-0.5 font-mono text-xs font-semibold ${riskBadgeClass}`}
          >
            Risk {raw.risk_score}
          </span>
        )}
      </div>

      <p className="truncate text-sm font-semibold leading-snug text-white">{raw.label}</p>
      {raw.subtitle && (
        <p className="mt-0.5 truncate text-xs leading-snug text-slate-300" title={raw.subtitle}>
          {raw.subtitle}
        </p>
      )}

      <Handle
        type="source"
        position={Position.Right}
        className="!h-2 !w-2 !border-[#011821] !bg-slate-400"
      />
    </div>
  );
}

/**
 * Compute non-overlapping layered coordinates so money-flow columns have wide
 * horizontal corridors for edge labels and shared DEVICE/IP nodes sit in
 * dedicated top/bottom lanes instead of blocking intermediate edges.
 */
function computeLayeredPositions(nodes: GraphNode[]): Map<string, { x: number; y: number }> {
  const positions = new Map<string, { x: number; y: number }>();

  const col0: GraphNode[] = [];
  const col1: GraphNode[] = [];
  const col2: GraphNode[] = [];
  const topInfra: GraphNode[] = [];
  const bottomInfra: GraphNode[] = [];

  for (const node of nodes) {
    switch (node.type) {
      case "VICTIM":
        col0.push(node);
        break;
      case "MULE":
      case "MERCHANT":
        col1.push(node);
        break;
      case "SCAMMER":
      case "BANK_ACCOUNT":
        col2.push(node);
        break;
      case "DEVICE":
        topInfra.push(node);
        break;
      case "IP":
        bottomInfra.push(node);
        break;
    }
  }

  const placeColumn = (items: GraphNode[], x: number, centerY: number, gapY: number) => {
    if (items.length === 0) return;
    const totalHeight = (items.length - 1) * gapY;
    const startY = centerY - totalHeight / 2;
    items.forEach((item, idx) => {
      positions.set(item.id, { x, y: Math.round(startY + idx * gapY) });
    });
  };

  const mainCenterY = 276;
  placeColumn(col0, 24, mainCenterY, 132);
  placeColumn(col1, 412, mainCenterY, 140);
  placeColumn(col2, 800, mainCenterY, 140);

  topInfra.forEach((item, idx) => {
    positions.set(item.id, { x: 604 + idx * 272, y: 20 });
  });
  bottomInfra.forEach((item, idx) => {
    positions.set(item.id, { x: 604 + idx * 272, y: 528 });
  });

  return positions;
}

const nodeTypes = {
  trustNode: TrustLoopGraphNode,
};

interface MoneyFlowGraphProps {
  graphData: GraphData;
  flaggedNodeIds?: string[];
  dismissedFp?: boolean;
}

export function MoneyFlowGraph({
  graphData,
  flaggedNodeIds,
  dismissedFp = false,
}: MoneyFlowGraphProps) {
  const [mounted, setMounted] = useState(false);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (selectedNodeId && !graphData.nodes.some((n) => n.id === selectedNodeId)) {
      setSelectedNodeId(null);
    }
  }, [graphData, selectedNodeId]);

  const flaggedSet = useMemo(() => {
    if (dismissedFp) return new Set<string>();
    if (flaggedNodeIds !== undefined) return new Set(flaggedNodeIds);
    return new Set(graphData.nodes.filter((n) => n.flagged).map((n) => n.id));
  }, [dismissedFp, flaggedNodeIds, graphData.nodes]);

  const layoutPositions = useMemo(
    () => computeLayeredPositions(graphData.nodes),
    [graphData.nodes],
  );

  const nodeTypeById = useMemo(
    () => new Map(graphData.nodes.map((n) => [n.id, n.type])),
    [graphData.nodes],
  );

  const flowNodes = useMemo<TrustFlowNode[]>(
    () =>
      graphData.nodes.map((node, index) => {
        const isFlagged = flaggedSet.has(node.id);
        const isVerifiedMerchant = node.type === "MERCHANT" && !isFlagged;
        const fallbackPos = {
          x: (index % 3) * 320 + 24,
          y: Math.floor(index / 3) * 140 + 24,
        };
        return {
          id: node.id,
          type: "trustNode",
          position: layoutPositions.get(node.id) ?? node.position ?? fallbackPos,
          data: {
            raw: node,
            isFlagged,
            isVerifiedMerchant,
          },
        };
      }),
    [flaggedSet, graphData.nodes, layoutPositions],
  );

  const flowEdges = useMemo<Edge[]>(
    () =>
      graphData.edges.map((edge) => {
        const srcType = nodeTypeById.get(edge.source);
        const dstType = nodeTypeById.get(edge.target);
        const isInfraLink =
          srcType === "DEVICE" ||
          srcType === "IP" ||
          dstType === "DEVICE" ||
          dstType === "IP";
        const edgeFlagged =
          !dismissedFp &&
          (Boolean(edge.flagged) ||
            flaggedSet.has(edge.source) ||
            flaggedSet.has(edge.target));
        const labelText =
          edge.label ??
          (typeof edge.amount_vnd === "number" ? formatVnd(edge.amount_vnd) : undefined);

        const strokeColor = isInfraLink
          ? edgeFlagged
            ? "#94a3b8"
            : "#64748b"
          : edgeFlagged
            ? "#ec652b"
            : "#34d399";

        return {
          id: edge.id,
          source: edge.source,
          target: edge.target,
          type: "smoothstep",
          pathOptions: { borderRadius: 10 },
          label: isInfraLink ? undefined : labelText,
          animated: !isInfraLink && edgeFlagged,
          style: {
            stroke: strokeColor,
            strokeWidth: isInfraLink ? 1.3 : edgeFlagged ? 2 : 1.7,
            strokeDasharray: isInfraLink ? "5 4" : undefined,
          },
          labelStyle: {
            fill: "#f1f5f9",
            fontSize: 11,
            fontWeight: 600,
            fontFamily: "var(--font-mono), ui-monospace, monospace",
          },
          labelBgStyle: {
            fill: "#011821",
            fillOpacity: 0.94,
          },
          labelBgPadding: [6, 3],
          labelBgBorderRadius: 4,
          markerEnd: {
            type: MarkerType.ArrowClosed,
            color: strokeColor,
          },
        };
      }),
    [dismissedFp, flaggedSet, graphData.edges, nodeTypeById],
  );

  const selectedNode = useMemo(
    () => graphData.nodes.find((n) => n.id === selectedNodeId) ?? null,
    [graphData.nodes, selectedNodeId],
  );

  if (graphData.nodes.length === 0) {
    return (
      <div className="flex h-[320px] items-center justify-center rounded-xl border border-slate-800 bg-slate-950/70 p-6 text-center text-sm text-slate-400">
        Chưa có dữ liệu đồ thị dòng tiền cho hồ sơ này.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-300">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-semibold text-slate-100">Đồ thị Dòng tiền & Cụm Thiết bị</span>
          {graphData.summary_badge && (
            <span className="rounded-full border border-slate-700 bg-slate-800 px-2.5 py-0.5 text-xs font-medium text-slate-200">
              {graphData.summary_badge}
            </span>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-3 text-xs">
          <span className="inline-flex items-center gap-1.5 text-red-300">
            <span className="h-2.5 w-2.5 rounded-full bg-red-500" aria-hidden="true" />
            Rủi ro / Mule ({flaggedSet.size})
          </span>
          <span className="inline-flex items-center gap-1.5 text-emerald-300">
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" aria-hidden="true" />
            Tiểu thương sạch
          </span>
          <span className="text-slate-400">Nhấp vào nút để soi chi tiết</span>
        </div>
      </div>

      <div className="grid gap-3 lg:grid-cols-[1fr_300px]">
        <div className="h-[490px] w-full overflow-hidden rounded-xl border border-slate-800 bg-[#011821]">
          {mounted ? (
            <ReactFlowProvider>
              <ReactFlow
                nodes={flowNodes}
                edges={flowEdges}
                nodeTypes={nodeTypes}
                fitView
                fitViewOptions={{ padding: 0.14 }}
                minZoom={0.4}
                maxZoom={1.6}
                onNodeClick={(_event, node) => setSelectedNodeId(node.id)}
                onPaneClick={() => setSelectedNodeId(null)}
              >
                <Background variant={BackgroundVariant.Dots} color="#1e3a4c" gap={22} size={1.2} />
                <Controls className="!rounded-lg !border !border-slate-700 !bg-slate-900 [&_button]:!border-slate-700 [&_button]:!bg-slate-900 [&_button]:!fill-slate-200 hover:[&_button]:!bg-slate-800" />
                <MiniMap
                  pannable
                  zoomable
                  className="!h-24 !w-36 !rounded-lg !border !border-slate-700 !bg-slate-900/95"
                  maskColor="rgba(2, 6, 23, 0.72)"
                  nodeColor={(node) => {
                    const data = node.data as TrustLoopNodeData | undefined;
                    if (data?.isFlagged) return "#ec652b";
                    if (data?.isVerifiedMerchant) return "#44b48b";
                    return "#9a9ea8";
                  }}
                />
              </ReactFlow>
            </ReactFlowProvider>
          ) : (
            <div className="flex h-full items-center justify-center text-xs text-slate-400">
              Đang khởi tạo đồ thị dòng tiền...
            </div>
          )}
        </div>

        {/* Node Inspector Card */}
        <aside
          aria-label="Chi tiết nút đồ thị"
          className="flex flex-col justify-between rounded-xl border border-slate-800 bg-slate-900/90 p-4 text-sm text-slate-200"
        >
          {selectedNode ? (
            <div className="space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <span className="inline-flex items-center gap-1 rounded border border-slate-700 bg-slate-800 px-2 py-0.5 text-xs font-semibold text-slate-200">
                    {getNodeIcon(selectedNode.type)}
                    {NODE_TYPE_META[selectedNode.type].labelVi} ({selectedNode.type})
                  </span>
                  <h3 className="mt-1.5 text-sm font-bold text-white">{selectedNode.label}</h3>
                  <p className="font-mono text-xs text-slate-400">ID: {selectedNode.id}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedNodeId(null)}
                  aria-label="Đóng chi tiết nút"
                  className="rounded-md p-1 text-slate-400 hover:bg-slate-800 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-momo-400"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {selectedNode.subtitle && (
                <p className="rounded-lg border border-slate-800 bg-slate-950/70 px-2.5 py-2 text-xs text-slate-300">
                  {selectedNode.subtitle}
                </p>
              )}

              <div className="flex flex-wrap items-center gap-2 text-xs">
                <span
                  className={`rounded-md border px-2 py-0.5 font-semibold ${
                    flaggedSet.has(selectedNode.id)
                      ? "border-red-500/50 bg-red-500/20 text-red-200"
                      : selectedNode.type === "MERCHANT"
                        ? "border-emerald-500/50 bg-emerald-500/20 text-emerald-200"
                        : "border-slate-700 bg-slate-800 text-slate-300"
                  }`}
                >
                  {flaggedSet.has(selectedNode.id)
                    ? "Trạng thái: Đánh dấu rủi ro"
                    : selectedNode.type === "MERCHANT"
                      ? "Trạng thái: Tiểu thương hợp lệ"
                      : "Trạng thái: Bình thường"}
                </span>
                {typeof selectedNode.risk_score === "number" && (
                  <span className="rounded-md border border-slate-700 bg-slate-800 px-2 py-0.5 font-mono font-semibold text-slate-100">
                    Điểm rủi ro: {selectedNode.risk_score}/100
                  </span>
                )}
              </div>

              <div className="space-y-1.5 border-t border-slate-800 pt-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Thuộc tính & Metadata
                </p>
                {Object.keys(selectedNode.metadata).length === 0 ? (
                  <p className="text-xs text-slate-400">Không có metadata bổ sung.</p>
                ) : (
                  <dl className="space-y-1.5 text-xs">
                    {Object.entries(selectedNode.metadata).map(([key, value]) => (
                      <div
                        key={key}
                        className="flex items-start justify-between gap-2 rounded bg-slate-950/60 px-2 py-1"
                      >
                        <dt className="text-slate-400">
                          {METADATA_KEY_LABELS[key] ?? key}
                        </dt>
                        <dd className="break-all text-right font-mono text-slate-100">
                          {formatMetadataValue(value)}
                        </dd>
                      </div>
                    ))}
                  </dl>
                )}
              </div>
            </div>
          ) : (
            <div className="flex h-full flex-col items-center justify-center gap-2 py-8 text-center text-xs text-slate-400">
              <Cpu className="h-6 w-6 text-slate-500" aria-hidden="true" />
              <p className="font-medium text-slate-200">Trình kiểm tra Nút (Node Inspector)</p>
              <p>
                Nhấp vào bất kỳ nút nào trên đồ thị để xem tuổi tài khoản, lịch sử sạch, số khiếu
                nại hoặc thiết bị dùng chung.
              </p>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
