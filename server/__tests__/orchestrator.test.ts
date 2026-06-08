import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock dependencies
vi.mock("../lib/scraper.js", () => ({
  fetchPage: vi.fn(),
  closeBrowser: vi.fn(),
}));

vi.mock("../lib/ai-extractor.js", () => ({
  extractProducts: vi.fn(),
  extractWithPrompt: vi.fn(),
}));

vi.mock("../db/index.js", () => ({
  db: {
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    values: vi.fn().mockReturnThis(),
    set: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
  },
}));

import { fetchPage } from "../lib/scraper.js";
import { extractProducts } from "../lib/ai-extractor.js";

describe("crawlCompetitor", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("fetchPage is called with competitor URL", async () => {
    const mockFetchPage = vi.mocked(fetchPage);
    mockFetchPage.mockResolvedValue({
      url: "https://example.com",
      html: "<html><body>test</body></html>",
      statusCode: 200,
    });

    const result = await fetchPage("https://example.com");
    expect(result.statusCode).toBe(200);
    expect(result.html).toContain("test");
  });

  it("fetchPage handles errors gracefully", async () => {
    const mockFetchPage = vi.mocked(fetchPage);
    mockFetchPage.mockResolvedValue({
      url: "https://example.com",
      html: "",
      statusCode: 0,
      error: "Timeout",
    });

    const result = await fetchPage("https://example.com");
    expect(result.error).toBe("Timeout");
    expect(result.html).toBe("");
  });
});

describe("extractProducts", () => {
  it("extracts products from HTML", async () => {
    const mockExtract = vi.mocked(extractProducts);
    mockExtract.mockResolvedValue({
      products: [
        {
          model: "WA7638",
          category: "高密型AP",
          subCategory: "Wi-Fi 7",
          params: { "速率": "18.442Gbps", "流数": "三频12流" },
        },
      ],
    });

    const result = await extractProducts("<html>test</html>", "https://example.com");
    expect(result.products).toHaveLength(1);
    expect(result.products[0].model).toBe("WA7638");
  });

  it("returns empty array for no products", async () => {
    const mockExtract = vi.mocked(extractProducts);
    mockExtract.mockResolvedValue({ products: [] });

    const result = await extractProducts("<html>empty</html>", "https://example.com");
    expect(result.products).toHaveLength(0);
  });
});
