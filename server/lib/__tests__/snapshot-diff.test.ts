import { describe, it, expect } from "vitest";
import { diffSnapshots, hashParams, hasChanges } from "../snapshot-diff.js";

describe("hashParams", () => {
  it("produces consistent hash for same params", () => {
    const a = { rate: "18.442Gbps", streams: "12" };
    const b = { streams: "12", rate: "18.442Gbps" };
    expect(hashParams(a)).toBe(hashParams(b));
  });

  it("produces different hash for different params", () => {
    const a = { rate: "18.442Gbps" };
    const b = { rate: "9.749Gbps" };
    expect(hashParams(a)).not.toBe(hashParams(b));
  });
});

describe("diffSnapshots", () => {
  it("detects added fields", () => {
    const prev = { rate: "18.442Gbps" };
    const curr = { rate: "18.442Gbps", streams: "12" };
    const diff = diffSnapshots(prev, curr);
    expect(diff.added).toEqual(["streams"]);
    expect(diff.modified).toEqual([]);
    expect(diff.removed).toEqual([]);
    expect(diff.unchanged).toEqual(["rate"]);
  });

  it("detects modified fields", () => {
    const prev = { rate: "18.442Gbps", streams: "12" };
    const curr = { rate: "9.749Gbps", streams: "12" };
    const diff = diffSnapshots(prev, curr);
    expect(diff.added).toEqual([]);
    expect(diff.modified).toEqual([{ key: "rate", old: "18.442Gbps", new: "9.749Gbps" }]);
    expect(diff.removed).toEqual([]);
    expect(diff.unchanged).toEqual(["streams"]);
  });

  it("detects removed fields", () => {
    const prev = { rate: "18.442Gbps", promo: "限时优惠" };
    const curr = { rate: "18.442Gbps" };
    const diff = diffSnapshots(prev, curr);
    expect(diff.removed).toEqual(["promo"]);
    expect(diff.added).toEqual([]);
    expect(diff.modified).toEqual([]);
  });

  it("returns all unchanged when identical", () => {
    const snap = { rate: "18.442Gbps", streams: "12" };
    const diff = diffSnapshots(snap, snap);
    expect(diff.added).toEqual([]);
    expect(diff.modified).toEqual([]);
    expect(diff.removed).toEqual([]);
    expect(diff.unchanged.sort()).toEqual(["rate", "streams"]);
  });

  it("handles all change types simultaneously", () => {
    const prev = { a: "1", b: "2", c: "3" };
    const curr = { a: "1", b: "changed", d: "4" };
    const diff = diffSnapshots(prev, curr);
    expect(diff.added).toEqual(["d"]);
    expect(diff.modified).toEqual([{ key: "b", old: "2", new: "changed" }]);
    expect(diff.removed).toEqual(["c"]);
    expect(diff.unchanged).toEqual(["a"]);
  });
});

describe("hasChanges", () => {
  it("returns false for identical snapshots", () => {
    expect(hasChanges({ a: "1" }, { a: "1" })).toBe(false);
  });

  it("returns true when values differ", () => {
    expect(hasChanges({ a: "1" }, { a: "2" })).toBe(true);
  });

  it("returns true when keys differ", () => {
    expect(hasChanges({ a: "1" }, { a: "1", b: "2" })).toBe(true);
  });
});
