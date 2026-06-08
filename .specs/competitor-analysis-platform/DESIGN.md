# DESIGN: 竞品分析平台 — 自动采集与参数对比系统

- **Change ID**: competitor-analysis-platform
- **关联**: `@.specs/competitor-analysis-platform/REQUIREMENT.md`、`@.specs/CONTEXT.md`
- **作者**: AI（Architect 角色）+ 人工 review

---

## 0. 技术栈选定

> 由 2-design 步骤 0 锁定。变栈视为开新 CHANGE（R7.1）。

- **选定**：2️⃣ Vite + React + Express（tRPC）
- **前端**：Vite 7 / React 19 / TypeScript 5 / Tailwind CSS 4 / shadcn/ui
- **后端**：Express 4 / tRPC 11 / TypeScript 5
- **数据库**：MySQL 8 / Drizzle ORM
- **爬虫引擎**：Playwright（headless Chromium）
- **AI 集成**：Vercel AI SDK + Claude API（可切换 OpenAI）
- **定时任务**：node-cron
- **部署**：本地单机（`pnpm dev` 一键启动前后端）
- **关键依赖**：TanStack Table / Drizzle / Playwright / @ai-sdk/claude / node-cron
- **理由**：复用用户既有技术栈（React 19 / Vite 7 / tRPC 11 / Drizzle / MySQL 8），零学习成本。Playwright 处理 JS 渲染页面，Vercel AI SDK 统一 AI 调用，node-cron 轻量满足单用户定时需求。
- **明确排除**：
  - Next.js — 爬虫是长运行后端任务，Route Handlers 不适合 cron + headless browser
  - Python 后端 — 引入新语言分裂技术栈，Node 生态 Playwright + AI SDK 完全胜任
  - BullMQ/Redis — 单用户场景 node-cron 足够，Redis 是过度依赖

---

## 0.5 既有架构对齐

> 新创项目，本段写 N/A。

N/A — 绿地项目，无既有架构。

---

## 1. 决策清单

| # | 决策 | 备选 | 选择理由 | 取舍代价 |
|---|---|---|---|---|
| D1 | 爬虫引擎选 Playwright | Puppeteer / Cheerio+axios / Scrapy(Python) | Playwright 支持多浏览器、API 更现代、自动等待机制好、能处理 JS 渲染页面（H3C 这类 SPA） | 比 Cheerio 重（需下载 Chromium ~200MB）；比 Puppeteer 生态略小但 API 更一致 |
| D2 | AI 提取用 Vercel AI SDK | 原生 fetch / langchain.js | SDK 统一 provider 接口（Claude/OpenAI 一行切换），自带 streaming、重试、structured output | 多一个依赖；langchain 更重且本场景不需要 chain/agent |
| D3 | 定时任务用 node-cron | BullMQ + Redis / 系统 crontab | 单用户场景无需分布式队列，node-cron 零外部依赖、API 简洁、在 Express 进程内运行 | 进程重启丢失内存状态（通过 DB 状态恢复）；不支持重试/优先级（单用户不需要） |
| D4 | 动态参数用 JSON 列存储 | EAV 表 / 独立字段表 / MongoDB | MySQL 8 JSON 列支持 `JSON_EXTRACT` / `JSON_TABLE` 索引查询，一条 SQL 能查能排序，无需 EAV 的多 JOIN | JSON 列内字段无法做外键约束；深度查询性能不如关系列（但单机 <1M 行无压力） |
| D5 | 前后端 tRPC 单仓库 | REST API / GraphQL | tRPC 端到端类型安全，前后端共享类型零成本，用户已有 tRPC 11 经验 | 非 tRPC 客户端无法调用（V1 单人无需考虑） |
| D6 | 采集模板存 JSON（数据库字段） | 文件系统 / 独立模板服务 | 模板与竞品源一一绑定，直接存 DB 的 JSON 字段最简单，无需额外文件管理 | 模板编辑器需自己做（V1 用 JSON 编辑器组件即可） |
| D7 | Diff 算法用 JSON key-value 逐字段对比 | jsondiffpatch 库 / 版本号 diff | 产品参数本质是 flat key-value，逐字段对比足够，能精确标出新增/修改/删除，无需引入 diff 库 | 嵌套结构需递归处理（V1 参数拍平为一层，不需要递归） |
| D8 | UI 表格用 TanStack Table | AG Grid / 自建 | TanStack Table 无头设计 + shadcn 集成好，支持排序/筛选/虚拟滚动，MIT 协议 | 无内置 Excel-like 体验（AG Grid 企业版有，但付费） |
| D9 | 单体 Express 进程（爬虫+API 同进程） | 独立 worker 进程 / 微服务 | 单用户、20 站点，Express 内跑 Playwright + node-cron 完全够用，架构最简 | 爬虫阻塞时 API 响应变慢（缓解：Playwright async + 并发限制 3） |

---

## 2. 数据流 / 架构图

```
┌─────────────────────────────────────────────────────────┐
│                    React SPA (Vite)                      │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌───────────┐  │
│  │竞品源管理 │ │产品对比表 │ │变更Diff  │ │采集历史   │  │
│  └─────┬────┘ └─────┬────┘ └─────┬────┘ └─────┬─────┘  │
│        └──────────┬──┴───────────┘             │         │
│                   │ tRPC                       │         │
├───────────────────┼────────────────────────────┼─────────┤
│              Express + tRPC Server              │         │
│  ┌────────┐ ┌─────────┐ ┌──────────┐ ┌────────┴──────┐ │
│  │竞品源   │ │产品查询  │ │Diff计算  │ │采集调度器     │ │
│  │CRUD    │ │+排序筛选 │ │(D7)     │ │(node-cron)   │ │
│  └───┬────┘ └───┬─────┘ └────┬─────┘ └──────┬────────┘ │
│      │          │            │              │           │
│      └──────────┼────────────┼──────────────┘           │
│                 │            │                          │
│  ┌──────────────┴────────────┴──────────────┐           │
│  │            爬虫引擎层 (Playwright)         │           │
│  │  ┌─────────┐  ┌────────────┐             │           │
│  │  │页面抓取  │  │AI参数提取   │             │           │
│  │  │(fetch   │  │(Claude API │             │           │
│  │  │HTML/JS) │  │structured  │             │           │
│  │  │         │  │output)     │             │           │
│  │  └────┬────┘  └─────┬──────┘             │           │
│  └───────┼─────────────┼────────────────────┘           │
│          │             │                                 │
│  ┌───────┴─────────────┴────────────────────┐           │
│  │          MySQL 8 (Drizzle ORM)            │           │
│  │  competitors │ products │ snapshots       │           │
│  │  templates   │ groups   │ crawl_logs      │           │
│  └───────────────────────────────────────────┘           │
└─────────────────────────────────────────────────────────┘
```

### 采集流程（核心数据流）

```
用户添加竞品 URL
       │
       ▼
  保存竞品源到 DB
       │
       ▼
  首次采集触发
       │
       ▼
  Playwright 抓取页面 ──── JS 渲染等待 ────┐
       │                                    │
       ▼                                    │
  有模板？── 是 → 用模板提取                  │
       │                                    │
       否                                   │
       │                                    │
       ▼                                    │
  发送 HTML 到 Claude API                   │
  (structured output: 产品列表+参数)          │
       │                                    │
       ▼                                    │
  自动生成模板并存 DB ◄──────────────────────┘
       │
       ▼
  结构化参数写入 products + snapshots
       │
       ▼
  与上次快照对比 → 标记变更
       │
       ▼
  返回采集结果摘要
```

---

## 3. 关键状态机

### 采集任务状态

```
  idle ──(手动触发/定时)──> pending ──(worker pickup)──> running
                                                          │
                                      ┌───────────────────┼───────────────────┐
                                      │                   │                   │
                                      ▼                   ▼                   ▼
                                   completed          partial             failed
                                   (全成功)         (部分失败)           (全失败)
                                      │                   │                   │
                                      └───────────────────┴───────────────────┘
                                                          │
                                                          ▼
                                                      idle (等待下次)
```

### 竞品源状态

```
  active ──(用户禁用)──> paused ──(用户启用)──> active
     │                                            │
     └──(连续3次失败)──> error ──(用户修复+手动触发)──> active
```

---

## 4. 数据模型

```
competitors (竞品源)
├── id: int PK
├── name: varchar(255)           -- "H3C WLAN"
├── url: text                    -- 产品页 URL
├── status: enum(active|paused|error)
├── schedule_cron: varchar(100)  -- cron 表达式，如 "0 */6 * * *"
├── schedule_enabled: boolean
├── group_id: int FK → groups
├── created_at / updated_at

groups (分组)
├── id: int PK
├── name: varchar(100)
├── created_at

templates (采集模板)
├── id: int PK
├── competitor_id: int FK → competitors (1:1)
├── extraction_rules: json       -- 提取规则（选择器/AI prompt）
├── ai_generated: boolean        -- 是否 AI 自动生成
├── updated_at

products (产品)
├── id: int PK
├── competitor_id: int FK → competitors
├── model: varchar(255)          -- "WA7638"
├── category: varchar(255)       -- "高密型AP"
├── sub_category: varchar(255)   -- "Wi-Fi 7"
├── source_url: text             -- 产品详情页 URL
├── group_id: int FK → groups
├── created_at / updated_at

snapshots (采集快照)
├── id: int PK
├── product_id: int FK → products
├── crawl_log_id: int FK → crawl_logs
├── params: json                 -- {"速率": "18.442Gbps", "流数": "三频12流", ...}
├── snapshot_hash: varchar(64)   -- MD5 of params JSON，快速判断是否有变更
├── created_at

crawl_logs (采集日志)
├── id: int PK
├── competitor_id: int FK → competitors
├── status: enum(completed|partial|failed)
├── trigger_type: enum(manual|scheduled)
├── products_found: int
├── products_new: int
├── products_changed: int
├── products_unchanged: int
├── error_message: text          -- 失败原因
├── duration_ms: int
├── started_at / completed_at
```

---

## 5. ADR 索引

| ADR | 标题 | 可逆性 |
|-----|------|--------|
| [ADR-001](.specs/adr/001-playwright-as-scraper.md) | Playwright 作为爬虫引擎 | 中（可换 Puppeteer，代价 1-2 天） |
| [ADR-002](.specs/adr/002-json-column-dynamic-params.md) | MySQL JSON 列存储动态参数 | 低（数据已入库后迁移成本高） |
| [ADR-003](.specs/adr/003-vercel-ai-sdk.md) | Vercel AI SDK 统一 AI 调用 | 高（一层抽象，切换 provider 零成本） |

---

## 6. 风险

| # | 风险 | 类型 | 影响 | 概率 | 缓解 |
|---|---|---|---|---|---|
| R1 | AI 提取不稳定，不同网站准确率差异大 | 实现 | 数据质量差 | 高 | 首次采集后展示预览让用户确认；模板微调覆盖 80% 场景后 AI 只做兜底 |
| R2 | Playwright headless 在 Windows 上的稳定性 | 上线 | 采集任务中断 | 中 | 限制并发 3 个浏览器实例；采集失败自动重试 1 次；错误日志记录截图 |
| R3 | 竞品网站改版导致模板失效 | 长期 | 后续采集结果为空或错误 | 中 | 对比快照 hash 检测异常（参数数量骤降 >50% 标红）；通知用户重新配置 |
| R4 | Claude API 调用成本（首次采集发送大段 HTML） | 实现 | 费用超预期 | 中 | 对 HTML 做 sanitize（去 script/style/nav），只发 body 内产品区域；首采后模板接管减少 AI 调用 |
| R5 | JSON 列查询性能随数据量增长 | 长期 | 表格加载变慢 | 低 | 单机 <1M 行 MySQL JSON_EXtract 性能足够；超限时加 generated column 索引 |

---

## 7. 不在范围

- 多用户权限系统（V2）
- 告警通知（V2）
- 导出 Excel/PDF（V2）
- 趋势图表（V2）
- 登录态爬取 / Cookie 管理（V2）
- 移动端适配（内部工具，桌面优先）
- 国际化（V1 中文界面）

---

## 9. 架构沉淀建议（本 change 完成后供 A-evolve 同步用）

### 9.1 新增的可复用抽象

| 路径 | 能力 | 触发场景 | 复用建议 |
|---|---|---|---|
| `server/lib/scraper.ts` | Playwright 封装（抓取+等待+并发控制） | 任何需要抓取网页的场景 | 以后扩展爬虫类型时复用 |
| `server/lib/ai-extractor.ts` | AI 结构化提取（HTML→JSON） | 任何需要从非结构化文本提取数据的场景 | 以后做文档解析/邮件解析可复用 |
| `server/lib/snapshot-diff.ts` | JSON 快照 diff 计算（新增/修改/删除） | 任何需要对比两次数据差异的场景 | 以后做配置变更追踪可复用 |

### 9.2 新增的项目级技术决策

| 决策 | 取值 | 影响范围 | 推翻代价 |
|---|---|---|---|
| 爬虫引擎 | Playwright | 所有采集任务 | 中（换引擎需重写 scraper 层） |
| AI 提取方式 | Claude API via Vercel AI SDK | 所有 AI 相关调用 | 低（SDK 抽象层，切 provider 一行代码） |
| 动态参数存储 | MySQL JSON 列 | 所有产品参数查询 | 高（数据迁移 + 重写查询层） |
| 定时调度 | node-cron（进程内） | 所有定时任务 | 低（单文件替换） |

### 9.3 新增的跨模块契约

```
- tRPC router: competitor / product / snapshot / crawlLog / group / template 六个路由组
- 采集模板 JSON schema: { selectors, aiPrompt, extractMode: "template"|"ai"|"hybrid" }
- 快照 params JSON: flat key-value { "参数名": "参数值" }，值统一为 string
- Diff 结果 schema: { added: string[], modified: {key, old, new}[], removed: string[] }
```

### 9.4 新增的依赖

| 包 | 版本 | 用途 | 是否替换既有 |
|---|---|---|---|
| playwright | ^1.52 | headless 浏览器爬虫 | 新增 |
| @ai-sdk/claude | ^1.0 | Claude API 集成 | 新增 |
| ai (Vercel AI SDK) | ^4.0 | AI 调用统一抽象 | 新增 |
| node-cron | ^3.0 | 定时任务调度 | 新增 |
| @tanstack/react-table | ^8.0 | 无头表格组件 | 新增 |

### 9.5 禁动清单变化

```
- 新增禁动：server/lib/scraper.ts 不允许绕过并发控制直接 import playwright
- 新增禁动：snapshots.params JSON 值必须为 string（不允许嵌套对象），所有 diff 逻辑依赖此约束
```

---

> 本文件不包含完整代码实现。函数签名、伪代码、接口定义可以；函数体不行。
