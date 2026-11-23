import { z } from "zod";
import { PolicyChunkSchema, type PolicyChunk } from "@/contracts";
import rawPolicies from "@/data/vnPolicies.json";

const K1 = 1.5;
const B = 0.75;
const CODE_PREFIXES = new Set(["qd", "tt", "nd", "luat"]);

const VERIFIED_POLICIES: readonly PolicyChunk[] = z
  .array(PolicyChunkSchema)
  .parse(rawPolicies);

/**
 * Strips Vietnamese diacritics, folds đ/Đ -> d, and lowercases for deterministic BM25 matching.
 */
export function normalizeVietnamese(input: string): string {
  return input
    .replace(/[đĐ]/g, "d")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

export function tokenizeVietnamese(input: string): string[] {
  const normalized = normalizeVietnamese(input);
  const rawTokens = normalized.split(/[^a-z0-9]+/).filter(Boolean);
  const tokens: string[] = [];

  for (let i = 0; i < rawTokens.length; i++) {
    const tok = rawTokens[i];
    if (tok.length >= 2 || /^\d+$/.test(tok)) {
      tokens.push(tok);
    }

    // Join Vietnamese legal prefixes with adjacent numbers (e.g. "tt 40" -> "tt40", "tt 77" -> "tt77").
    const next = rawTokens[i + 1];
    if (next && CODE_PREFIXES.has(tok) && /^\d+$/.test(next)) {
      tokens.push(`${tok}${next}`);
    }
  }

  return tokens;
}

interface IndexedPolicy {
  chunk: PolicyChunk;
  termFreq: Map<string, number>;
  length: number;
  normalizedTagPhrases: string[];
  normalizedTagCompacts: string[];
  normalizedCodeCompact: string;
}

// shortcut: in-memory BM25 index over static 12-chunk vnPolicies.json, upgrade to hybrid vector+BM25 index when policy corpus exceeds ~500 chunks
const INDEXED_POLICIES: readonly IndexedPolicy[] = VERIFIED_POLICIES.map((chunk) => {
  const expandedTags = chunk.tags.flatMap((tag) => {
    const norm = normalizeVietnamese(tag);
    return [norm.replace(/_/g, " "), norm.replace(/_/g, "")];
  });
  const docText = [
    chunk.chunk_id,
    chunk.document_code,
    chunk.title,
    chunk.category.replace(/_/g, " "),
    chunk.content_vi,
    ...expandedTags,
  ].join(" ");

  const tokens = tokenizeVietnamese(docText);
  const termFreq = new Map<string, number>();
  for (const tok of tokens) {
    termFreq.set(tok, (termFreq.get(tok) ?? 0) + 1);
  }

  return {
    chunk,
    termFreq,
    length: tokens.length,
    normalizedTagPhrases: chunk.tags.map((t) =>
      normalizeVietnamese(t).replace(/_/g, " ").trim(),
    ),
    normalizedTagCompacts: chunk.tags.map((t) =>
      normalizeVietnamese(t).replace(/[^a-z0-9]/g, ""),
    ),
    normalizedCodeCompact: normalizeVietnamese(chunk.document_code).replace(
      /[^a-z0-9]/g,
      "",
    ),
  };
});

const DOC_COUNT = INDEXED_POLICIES.length;
const AVG_DOC_LENGTH =
  DOC_COUNT > 0
    ? INDEXED_POLICIES.reduce((sum, doc) => sum + doc.length, 0) / DOC_COUNT
    : 1;

const DOC_FREQ = new Map<string, number>();
for (const doc of INDEXED_POLICIES) {
  for (const term of doc.termFreq.keys()) {
    DOC_FREQ.set(term, (DOC_FREQ.get(term) ?? 0) + 1);
  }
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function containsWholePhrase(normalizedQuery: string, phrase: string): boolean {
  if (!phrase) return false;
  const pattern = new RegExp(`(^|[^a-z0-9])${escapeRegex(phrase)}([^a-z0-9]|$)`);
  return pattern.test(normalizedQuery);
}

export function getAllPolicyChunks(): PolicyChunk[] {
  return VERIFIED_POLICIES.map((chunk) => ({ ...chunk, tags: [...chunk.tags] }));
}

/**
 * Deterministic Vietnamese-friendly BM25 + tag-boost retriever grounded strictly in data/vnPolicies.json.
 */
export function retrievePolicyChunks(query: string, topK = 5): PolicyChunk[] {
  const safeTopK = Math.max(1, Math.min(Math.floor(topK), DOC_COUNT));
  const trimmed = query.trim();
  if (!trimmed) return [];

  const normalizedQuery = normalizeVietnamese(trimmed).replace(/[^a-z0-9]+/g, " ").trim();
  const queryTokens = Array.from(new Set(tokenizeVietnamese(trimmed)));
  if (queryTokens.length === 0) return [];

  const queryTokenSet = new Set(queryTokens);
  const queryCompact = normalizedQuery.replace(/\s+/g, "");

  const scored: Array<{ chunk: PolicyChunk; score: number }> = [];

  for (const doc of INDEXED_POLICIES) {
    let score = 0;

    for (const term of queryTokens) {
      const tf = doc.termFreq.get(term) ?? 0;
      if (tf === 0) continue;
      const df = DOC_FREQ.get(term) ?? 0;
      const idf = Math.log(1 + (DOC_COUNT - df + 0.5) / (df + 0.5));
      const denom = tf + K1 * (1 - B + (B * doc.length) / AVG_DOC_LENGTH);
      score += idf * ((tf * (K1 + 1)) / denom);
    }

    // Deterministic tag & document-code boosts for crisp Vietnamese legal citation precision.
    for (let i = 0; i < doc.normalizedTagPhrases.length; i++) {
      const phrase = doc.normalizedTagPhrases[i];
      const compact = doc.normalizedTagCompacts[i];
      if (
        containsWholePhrase(normalizedQuery, phrase) ||
        (compact.length >= 3 && queryTokenSet.has(compact))
      ) {
        score += 2.2;
      }
    }

    if (
      queryTokenSet.has(normalizeVietnamese(doc.chunk.chunk_id).replace(/[^a-z0-9]/g, "")) ||
      (doc.normalizedCodeCompact.length >= 4 && queryCompact.includes(doc.normalizedCodeCompact))
    ) {
      score += 2.0;
    }

    if (score > 0) {
      scored.push({
        chunk: {
          ...doc.chunk,
          tags: [...doc.chunk.tags],
          score: Number(score.toFixed(4)),
        },
        score,
      });
    }
  }

  scored.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return a.chunk.chunk_id.localeCompare(b.chunk.chunk_id);
  });

  return scored.slice(0, safeTopK).map((entry) => entry.chunk);
}
