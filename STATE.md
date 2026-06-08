# STATE — 跨会话项目状态

## 活跃 Change

| Change ID | 阶段 | 当前 Task | 状态 |
|---|---|---|---|
| competitor-analysis-platform | 7-integration（已完成） | — | archived |

## 中断任务

（无）

## 决策日志

| 日期 | 决策 | 理由 |
|---|---|---|
| 2026-06-08 | 视觉调性锁定工业风 | 数据密集型工具，参考 Bloomberg/Grafana |
| 2026-06-08 | V1 单人版 | 先跑通核心流程，团队协作后续迭代 |
| 2026-06-08 | 模板 + AI 混合采集 | 平衡准确率与灵活性 |
| 2026-06-08 | 参数存储用动态字段 | 不同产品线参数不同，无法固定 schema |
| 2026-06-08 | 依赖外部 AI API | 不在本地部署模型 |
| 2026-06-08 | 技术栈：Vite+React+Express(tRPC) | 复用既有技术栈，零学习成本 |
| 2026-06-08 | 爬虫引擎：Playwright | 处理 JS 渲染页面（H3C 等 SPA） |
| 2026-06-08 | AI 提取：直接 fetch 调用 | SDK 兼容问题多，直接调 API 最灵活 |
| 2026-06-08 | 定时：node-cron | 单用户无需 Redis/BullMQ |
| 2026-06-08 | 参数存储：MySQL JSON 列 | 灵活 + MySQL 8 原生 JSON 查询 |
| 2026-06-08 | AI Provider 灵活配置 | 支持 Zhipu/OpenAI/DeepSeek 通过 .env 切换 |

## last_intel_scan

（未跑 — greenfield 项目）

## Change 历史

| Change ID | 阶段 | 完成日期 | 说明 |
|---|---|---|---|
| competitor-analysis-platform | 0→1→2→3→4→5→6→7 | 2026-06-09 | 竞品分析平台 MVP |
