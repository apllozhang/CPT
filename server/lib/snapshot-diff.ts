import { createHash } from "node:crypto";

// ── Types ───────────────────────────────────────────────
export interface DiffResult {
  added: string[];
  modified: Array<{ key: string; old: string; new: string }>;
  removed: string[];
  unchanged: string[];
}

// ── Hash ────────────────────────────────────────────────

/**
 * Compute MD5 hash of params for quick change detection.
 * Params values must be strings (flat key-value).
 */
export function hashParams(params: Record<string, string>): string {
  const sorted = Object.entries(params)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}=${v}`)
    .join("&");
  return createHash("md5").update(sorted).digest("hex");
}

// ── Diff ────────────────────────────────────────────────

/**
 * Compare two flat key-value snapshots.
 * All values must be strings (§ 9.5 constraint).
 */
export function diffSnapshots(
  prev: Record<string, string>,
  curr: Record<string, string>
): DiffResult {
  const added: string[] = [];
  const modified: Array<{ key: string; old: string; new: string }> = [];
  const removed: string[] = [];
  const unchanged: string[] = [];

  const allKeys = new Set([...Object.keys(prev), ...Object.keys(curr)]);

  for (const key of allKeys) {
    const inPrev = key in prev;
    const inCurr = key in curr;

    if (inPrev && !inCurr) {
      removed.push(key);
    } else if (!inPrev && inCurr) {
      added.push(key);
    } else if (prev[key] !== curr[key]) {
      modified.push({ key, old: prev[key], new: curr[key] });
    } else {
      unchanged.push(key);
    }
  }

  return { added, modified, removed, unchanged };
}

/**
 * Check if two snapshots have any changes.
 */
export function hasChanges(prev: Record<string, string>, curr: Record<string, string>): boolean {
  return hashParams(prev) !== hashParams(curr);
}
