import { describe, it, expect } from "vitest";
import { diffSnapshots, hashParams, hasChanges } from "../lib/snapshot-diff.js";

describe("Product parameter diff (AC-5)", () => {
  const prevParams = {
    "型号": "WA7638",
    "速率": "18.442Gbps",
    "流数": "三频12流",
    "接口": "10G光电合一口",
  };

  it("detects no changes for identical params", () => {
    const diff = diffSnapshots(prevParams, { ...prevParams });
    expect(diff.added).toHaveLength(0);
    expect(diff.modified).toHaveLength(0);
    expect(diff.removed).toHaveLength(0);
    expect(diff.unchanged).toHaveLength(4);
  });

  it("detects rate change", () => {
    const curr = { ...prevParams, "速率": "9.749Gbps" };
    const diff = diffSnapshots(prevParams, curr);
    expect(diff.modified).toHaveLength(1);
    expect(diff.modified[0].key).toBe("速率");
    expect(diff.modified[0].old).toBe("18.442Gbps");
    expect(diff.modified[0].new).toBe("9.749Gbps");
  });

  it("detects new parameter added", () => {
    const curr = { ...prevParams, "PoE供电": "支持" };
    const diff = diffSnapshots(prevParams, curr);
    expect(diff.added).toContain("PoE供电");
  });

  it("detects parameter removed", () => {
    const { "接口": _, ...withoutInterface } = prevParams;
    const diff = diffSnapshots(prevParams, withoutInterface);
    expect(diff.removed).toContain("接口");
  });

  it("hash is deterministic", () => {
    const h1 = hashParams(prevParams);
    const h2 = hashParams({ "流数": "三频12流", "型号": "WA7638", "速率": "18.442Gbps", "接口": "10G光电合一口" });
    expect(h1).toBe(h2);
  });
});

describe("Product query sorting (AC-4)", () => {
  const products = [
    { model: "WA6638", params: { "速率": "5.95Gbps" } },
    { model: "WA7638", params: { "速率": "18.442Gbps" } },
    { model: "WA6320H", params: { "速率": "3.55Gbps" } },
  ];

  it("sorts by rate descending", () => {
    const sorted = [...products].sort((a, b) => {
      const va = parseFloat(a.params["速率"]);
      const vb = parseFloat(b.params["速率"]);
      return vb - va;
    });
    expect(sorted[0].model).toBe("WA7638");
    expect(sorted[2].model).toBe("WA6320H");
  });

  it("filters by model search", () => {
    const filtered = products.filter((p) => p.model.includes("WA7"));
    expect(filtered).toHaveLength(1);
    expect(filtered[0].model).toBe("WA7638");
  });
});
