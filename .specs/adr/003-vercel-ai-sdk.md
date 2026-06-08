# ADR-003: Vercel AI SDK 统一 AI 调用

## Context

系统需要调用大模型 API 从 HTML 中提取结构化产品参数。可能使用 Claude 或 OpenAI，未来可能切换 provider。

## Decision

使用 Vercel AI SDK (`ai` + `@ai-sdk/claude`) 作为 AI 调用层。

## Consequences

**优势**：
- 统一 provider 接口，`generateObject()` + Zod schema 直接得到类型安全的结构化输出
- 切换 Claude → OpenAI 只需改一行 provider 初始化
- 自带重试、streaming、token 计算
- 与 TypeScript/Zod 生态无缝集成

**代价**：
- 多一个依赖（`ai` + provider 包）
- SDK 更新可能引入 breaking change

**备选方案**：
- 原生 fetch：灵活但需手写重试/streaming/structured output 解析
- langchain.js：更重，本场景不需要 chain/agent/memory

**推翻条件**：如果 SDK 不支持某个需要的 AI 功能（如 vision），可局部用原生 fetch 补充。
