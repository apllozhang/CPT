import { z } from "zod";
import { initProxy } from "./proxy-fetch.js";

// Initialize proxy on module load
initProxy();

// ── Provider Configuration ──────────────────────────────
const AI_PROVIDER = process.env.AI_PROVIDER ?? "openai";
const AI_MODEL = process.env.AI_MODEL ?? "gpt-4o-mini";
const AI_API_KEY = process.env.AI_API_KEY ?? "";
const AI_BASE_URL = process.env.AI_BASE_URL ?? "";

// ── Schemas ─────────────────────────────────────────────
export const ProductSchema = z.object({
  model: z.string(),
  category: z.string().optional(),
  subCategory: z.string().optional(),
  sourceUrl: z.string().optional(),
  params: z.record(z.string(), z.string()),
});

export const ExtractionResultSchema = z.object({
  products: z.array(ProductSchema),
});

export type ExtractedProduct = z.infer<typeof ProductSchema>;
export type ExtractionResult = z.infer<typeof ExtractionResultSchema>;

// ── HTML Sanitizer ──────────────────────────────────────
const REMOVE_TAGS = new Set([
  "script", "style", "nav", "footer", "header", "noscript", "iframe", "svg",
]);

function sanitizeHtml(html: string): string {
  let cleaned = html;
  for (const tag of REMOVE_TAGS) {
    cleaned = cleaned.replace(new RegExp(`<${tag}[^>]*>[\\s\\S]*?<\\/${tag}>`, "gi"), "");
  }
  cleaned = cleaned.replace(/\s+on\w+\s*=\s*"[^"]*"/gi, "");
  cleaned = cleaned.replace(/\s{3,}/g, "\n\n");
  if (cleaned.length > 50_000) cleaned = cleaned.slice(0, 50_000) + "\n... [truncated]";
  return cleaned;
}

// ── Direct API Call ─────────────────────────────────────

async function callAI(systemPrompt: string, userPrompt: string): Promise<string> {
  if (!AI_API_KEY) throw new Error("AI_API_KEY is not set");

  // Zhipu / Anthropic-compatible
  if (AI_PROVIDER === "zhipu" || AI_BASE_URL.includes("anthropic")) {
    const url = `${AI_BASE_URL}/v1/messages`;
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": AI_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: AI_MODEL,
        max_tokens: 4096,
        system: systemPrompt,
        messages: [{ role: "user", content: userPrompt }],
      }),
    });
    if (!res.ok) {
      const err = await res.text();
      throw new Error(`API error ${res.status}: ${err}`);
    }
    const data = await res.json() as any;
    return data.content?.[0]?.text ?? "";
  }

  // OpenAI / DeepSeek compatible
  const baseURL = AI_BASE_URL || "https://api.openai.com/v1";
  const res = await fetch(`${baseURL}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${AI_API_KEY}`,
    },
    body: JSON.stringify({
      model: AI_MODEL,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      response_format: { type: "json_object" },
    }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`API error ${res.status}: ${err}`);
  }
  const data = await res.json() as any;
  return data.choices?.[0]?.message?.content ?? "";
}

// ── Extractor ───────────────────────────────────────────

const SYSTEM_PROMPT = `You are a product data extraction specialist. You MUST return ONLY valid JSON, no other text.

Return format: { "products": [...] }
Each product: { "model": "string", "category": "string", "subCategory": "string", "sourceUrl": "string", "params": { "key": "value" } }
- model: product model number (required, e.g. "WA7638")
- category: product type (e.g. "高密型AP", "AC")
- subCategory: WiFi standard (e.g. "Wi-Fi 7", "Wi-Fi 6")
- sourceUrl: link to detail page if found
- params: flat key-value pairs of ALL visible parameters, values must be strings

IMPORTANT: Output ONLY the JSON object. No explanations, no markdown, no extra text.`;

export async function extractProducts(html: string, sourceUrl: string): Promise<ExtractionResult> {
  const sanitized = sanitizeHtml(html);
  const userPrompt = `Source URL: ${sourceUrl}\n\nExtract products from this HTML:\n${sanitized}`;

  const raw = await callAI(SYSTEM_PROMPT, userPrompt);
  console.log("[ai] Raw response length:", raw.length);
  console.log("[ai] Raw response preview:", raw.slice(0, 500));

  // Parse JSON from response (handle markdown code blocks)
  let jsonStr = raw.trim();
  if (jsonStr.startsWith("```")) {
    jsonStr = jsonStr.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
  }

  const parsed = JSON.parse(jsonStr);
  return ExtractionResultSchema.parse(parsed);
}

export async function extractWithPrompt(html: string, customPrompt: string): Promise<ExtractionResult> {
  const sanitized = sanitizeHtml(html);
  const raw = await callAI(SYSTEM_PROMPT, `${customPrompt}\n\nHTML:\n${sanitized}`);

  let jsonStr = raw.trim();
  if (jsonStr.startsWith("```")) {
    jsonStr = jsonStr.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
  }

  const parsed = JSON.parse(jsonStr);
  return ExtractionResultSchema.parse(parsed);
}
