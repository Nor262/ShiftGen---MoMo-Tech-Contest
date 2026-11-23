"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Background,
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
    ? "border-red-500 bg-red-950/85 text-red-50 shadow-[0_0_20px_rgba(239,68,68,0.35)]"
    : isVerifiedMerchant
      ? "border-emerald-400 bg-emerald-950/85 text-emerald-50 shadow-[0_0_18px_rgba(16,185,129,0.28)]"
      : "border-slate-600 bg-slate-900/95 text-slate-100 shadow-md";

  const badgeClass = isFlagged
    ? "border-red-400/50 bg-red-500/20 text-red-200"
    : isVerifiedMerchant
      ? "border-emerald-400/50 bg-emerald-500/20 text-emerald-200"
      : "border-slate-600 bg-slate-800 text-slate-300";

  return (
    <div
      className={`min-w-[205px] max-w-[245px] rounded-xl border-2 px-3 py-2.5 transition ${containerClass} ${
        selected ? "ring-2 ring-momo-400 ring-offset-2 ring-offset-slate-950" : ""
      }`}
    >
      <Handle
        type="target"
        position={Position.Left}
        className="!h-2.5 !w-2.5 !border-slate-950 !bg-slate-400"
      />

      <div className="mb-1.5 flex items-center justify-between gap-2">
        <span
          className={`inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-xs font-semibold uppercase tracking-wide ${badgeClass}`}
        >
          {getNodeIcon(raw.type)}
          <span>{typeMeta.labelVi}</span>
        </span>
        {typeof raw.risk_score === "number" && (
          <span
            className={`rounded px-1.5 py-0.5 font-mono text-xs font-bold ${
              isFlagged
                ? "bg-red-500/30 text-red-100"
                : isVerifiedMerchant
                  ? "bg-emerald-500/25 text-emerald-100"
                  : "bg-slate-800 text-slate-300"
            }`}
          >
            Risk {raw.risk_score}
          </span>
        )}
      </div>

      <p className="truncate text-xs font-bold leading-snug text-white">{raw.label}</p>
      {raw.subtitle && (
        <p className="mt-0.5 line-clamp-2 text-xs leading-tight text-slate-300">
          {raw.subtitle}
        </p>
      )}

      {isFlagged && (
        <p className="mt-1.5 inline-flex items-center gap-1 rounded bg-red-500/25 px-1.5 py-0.5 text-xs font-semibold text-red-200">
          <AlertOctagon className="h-3 w-3" aria-hidden="true" />
          ĐÁNH DẤU RỦI RO
        </p>
      )}
      {isVerifiedMerchant && (
        <p className="mt-1.5 inline-flex items-center gap-1 rounded bg-emerald-500/25 px-1.5 py-0.5 text-xs font-semibold text-emerald-200">
          <ShieldCheck className="h-3 w-3" aria-hidden="true" />
          HỢP LỆ / SẠCH
        </p>
      )}

      <Handle
        type="source"
        position={Position.Right}
        className="!h-2.5 !w-2.5 !border-slate-950 !bg-slate-400"
      />
    </div>
  );
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

  const flowNodes = useMemo<TrustFlowNode[]>(
    () =>
      graphData.nodes.map((node, index) => {
        const isFlagged = flaggedSet.has(node.id);
        const isVerifiedMerchant = node.type === "MERCHANT" && !isFlagged;
        // Fallback grid layout when upstream graph omits coordinates
        const fallbackPos = {
          x: (index % 3) * 285 + 40,
          y: Math.floor(index / 3) * 145 + 40,
        };
        return {
          id: node.id,
          type: "trustNode",
          position: node.position ?? fallbackPos,
          data: {
            raw: node,
            isFlagged,
            isVerifiedMerchant,
          },
        };
      }),
    [flaggedSet, graphData.nodes],
  );

  const flowEdges = useMemo<Edge[]>(
    () =>
      graphData.edges.map((edge) => {
        const edgeFlagged =
          !dismissedFp &&
          (Boolean(edge.flagged) ||
            flaggedSet.has(edge.source) ||
            flaggedSet.has(edge.target));
        const labelText =
          edge.label ??
          (typeof edge.amount_vnd === "number" ? formatVnd(edge.amount_vnd) : undefined);

        return {
          id: edge.id,
          source: edge.source,
          target: edge.target,
          label: labelText,
          animated: edgeFlagged,
          style: {
            stroke: edgeFlagged ? "#ec652b" : "#44b48b",
            strokeWidth: edgeFlagged ? 2.2 : 1.7,
          },
          labelStyle: {
            fill: "#e3e4e8",
            fontSize: 11,
            fontWeight: 600,
          },
          labelBgStyle: {
            fill: "#0c0f16",
            fillOpacity: 0.92,
          },
          labelBgPadding: [6, 3],
          labelBgBorderRadius: 4,
          markerEnd: {
            type: MarkerType.ArrowClosed,
            color: edgeFlagged ? "#ec652b" : "#44b48b",
          },
        };
      }),
    [dismissedFp, flaggedSet, graphData.edges],
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
        <div className="h-[410px] w-full overflow-hidden rounded-xl border border-slate-800 bg-slate-950">
          {mounted ? (
            <ReactFlowProvider>
              <ReactFlow
                nodes={flowNodes}
                edges={flowEdges}
                nodeTypes={nodeTypes}
                fitView
                fitViewOptions={{ padding: 0.2 }}
                minZoom={0.4}
                maxZoom={1.6}
                onNodeClick={(_event, node) => setSelectedNodeId(node.id)}
                onPaneClick={() => setSelectedNodeId(null)}
              >
                <Background color="#23262f" gap={20} />
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
