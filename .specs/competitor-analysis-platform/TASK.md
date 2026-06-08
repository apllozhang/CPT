# TASK: 竞品分析平台 — 自动采集与参数对比系统

- **Change ID**: competitor-analysis-platform
- **关联**: `@.specs/competitor-analysis-platform/REQUIREMENT.md`、`@.specs/competitor-analysis-platform/DESIGN.md`

---

## 波次划分

```
Wave 1 (parallel):  T01[P], T02[P]                        — 项目骨架 + 数据模型
Wave 2 (parallel):  T03[P], T04[P], T05[P]                — 爬虫/AI/Diff 核心模块
Wave 3 (parallel):  T06[P], T07[P], T08[P], T09[P], T10[P] — 后端 tRPC 路由
Wave 4 (parallel):  T11[P], T12[P], T13[P], T14[P], T15[P] — 前端页面
Wave 5:             T16                                     — 真实数据验证
```

> 同 wave = 可并行；跨 wave = 必须顺序执行。

---

## 任务清单

```xml
<!-- ==================== WAVE 1: 骨架 ==================== -->

<task id="T01" parallel="true" status="pending">
  <name>项目骨架搭建（Vite + Express + tRPC + monorepo）</name>
  <read_files>
    skills/flow-kit/templates/*
    .specs/competitor-analysis-platform/DESIGN.md
  </read_files>
  <write_files>
    package.json
    tsconfig.json
    vite.config.ts
    server/index.ts
    server/trpc.ts
    server/_core/*
    shared/*
    client/index.html
    client/main.tsx
    client/App.tsx
    client/vite-env.d.ts
    drizzle.config.ts
    .env.example
  </write_files>
  <action>
    搭建 monorepo 骨架：
    - pnpm package.json（workspaces: client/ server/ shared/）
    - Vite 7 前端入口（React 19 + Tailwind 4 + shadcn/ui 初始化）
    - Express 4 后端入口（tRPC 11 middleware + CORS）
    - shared/ 放 tRPC router 类型定义
    - .env.example 含 DATABASE_URL、CLAUDE_API_KEY
    参考 DESIGN.md § 0 技术栈选定。
  </action>
  <verify>pnpm install && pnpm dev → 前后端均启动无报错</verify>
  <done>pnpm dev 启动后，前端 http://localhost:3000 可访问，后端 tRPC ping 正常返回</done>
  <depends_on></depends_on>
</task>

<task id="T02" parallel="true" status="pending">
  <name>数据库 Schema（Drizzle ORM + MySQL 8 全部表）</name>
  <read_files>
    .specs/competitor-analysis-platform/DESIGN.md
    server/trpc.ts
  </read_files>
  <write_files>
    server/db/schema.ts
    server/db/index.ts
    server/db/migrations/*
  </write_files>
  <action>
    按 DESIGN.md § 4 数据模型，用 Drizzle ORM 定义全部 6 张表：
    - competitors（竞品源）：id, name, url, status, schedule_cron, schedule_enabled, group_id, timestamps
    - groups（分组）：id, name, timestamps
    - templates（采集模板）：id, competitor_id(1:1), extraction_rules(json), ai_generated, updated_at
    - products（产品）：id, competitor_id, model, category, sub_category, source_url, group_id, timestamps
    - snapshots（采集快照）：id, product_id, crawl_log_id, params(json), snapshot_hash, created_at
    - crawl_logs（采集日志）：id, competitor_id, status, trigger_type, products_found/new/changed/unchanged, error_message, duration_ms, timestamps
    JSON 列用 drizzle `json()` 类型（ADR-002）。建立外键关系。
    drizzle.config.ts 指向 MySQL 8。
  </action>
  <verify>pnpm db:push 成功，MySQL 中 6 张表均已创建</verify>
  <done>pnpm db:push 成功；show tables 返回 6 张表；字段类型与 DESIGN § 4 一致</done>
  <depends_on>T01</depends_on>
</task>

<!-- ==================== WAVE 2: 核心模块 ==================== -->

<task id="T03" parallel="true" status="pending">
  <name>Playwright 爬虫模块</name>
  <read_files>
    .specs/competitor-analysis-platform/DESIGN.md
    .specs/adr/001-playwright-as-scraper.md
    server/db/schema.ts
  </read_files>
  <write_files>
    server/lib/scraper.ts
    server/lib/__tests__/scraper.test.ts
  </write_files>
  <action>
    封装 Playwright 为可复用爬虫模块（DESIGN D1）：
    - `fetchPage(url): Promise<{html, statusCode}>` — 抓取并等待 JS 渲染完成
    - `fetchPages(urls, concurrency=3): Promise<results[]>` — 并发控制（D9 限制 3）
    - 自动重试 1 次（R2 缓解）
    - 超时 30s，User-Agent 伪装
    - 资源拦截（block image/font/media 减少流量）
    - 错误时截图保存到 temp/ 供诊断
  </action>
  <verify>pnpm vitest run server/lib/__tests__/scraper.test.ts</verify>
  <done>测试通过；能抓取静态页面和 JS 渲染页面并返回 HTML；并发限制生效</done>
  <depends_on>T01</depends_on>
</task>

<task id="T04" parallel="true" status="pending">
  <name>AI 参数提取模块</name>
  <read_files>
    .specs/competitor-analysis-platform/DESIGN.md
    .specs/adr/003-vercel-ai-sdk.md
    server/db/schema.ts
  </read_files>
  <write_files>
    server/lib/ai-extractor.ts
    server/lib/__tests__/ai-extractor.test.ts
  </write_files>
  <action>
    封装 AI 结构化提取（DESIGN D2, ADR-003）：
    - `extractProducts(html, url): Promise<Product[]>` — 从 HTML 提取产品列表 + 参数
    - 使用 Vercel AI SDK `generateObject()` + Zod schema 定义输出结构
    - 对 HTML 做 sanitize（去 script/style/nav/footer，R4 缓解）
    - Provider 通过环境变量切换（CLAUDE_API_KEY / OPENAI_API_KEY）
    - 输出 Zod schema：{ model, category, subCategory, params: Record<string,string>, sourceUrl }
  </action>
  <verify>pnpm vitest run server/lib/__tests__/ai-extractor.test.ts</verify>
  <done>测试通过；给定 HTML 片段能提取出结构化产品数据；Zod schema 校验通过</done>
  <depends_on>T01</depends_on>
</task>

<task id="T05" parallel="true" status="pending">
  <name>快照 Diff 计算模块</name>
  <read_files>
    .specs/competitor-analysis-platform/DESIGN.md
    .specs/adr/002-json-column-dynamic-params.md
    server/db/schema.ts
  </read_files>
  <write_files>
    server/lib/snapshot-diff.ts
    server/lib/__tests__/snapshot-diff.test.ts
  </write_files>
  <action>
    实现 JSON 快照逐字段 diff（DESIGN D7）：
    - `diffSnapshots(prev: Record<string,string>, curr: Record<string,string>): DiffResult`
    - DiffResult = { added: string[], modified: {key,old,new}[], removed: string[], unchanged: string[] }
    - `hashParams(params): string` — MD5 hash 用于快速判断是否有变更
    - params 值统一 string 比较（§ 9.5 禁动约束）
  </action>
  <verify>pnpm vitest run server/lib/__tests__/snapshot-diff.test.ts</verify>
  <done>测试通过；新增/修改/删除/无变更 四种场景 diff 结果正确</done>
  <depends_on>T01</depends_on>
</task>

<!-- ==================== WAVE 3: 后端 API ==================== -->

<task id="T06" parallel="true" status="pending">
  <name>竞品源 + 分组 CRUD API</name>
  <read_files>
    .specs/competitor-analysis-platform/REQUIREMENT.md
    server/db/schema.ts
    server/db/index.ts
    server/trpc.ts
    shared/*
  </read_files>
  <write_files>
    server/competitor/router.ts
    server/competitor/service.ts
    server/group/router.ts
    server/group/service.ts
  </write_files>
  <action>
    实现 tRPC 路由（AC-1, AC-6）：
    - competitor: list / create / update / delete / toggleStatus
    - group: list / create / update / delete / addItems / removeItems
    - create competitor 时自动创建空 template 关联
    - 使用 Drizzle query builder，返回类型来自 shared/
  </action>
  <verify>pnpm vitest run server/competitor/ && pnpm vitest run server/group/</verify>
  <done>CRUD 接口测试通过；竞品源创建时自动生成 template 记录；分组增删改查正常</done>
  <depends_on>T02</depends_on>
</task>

<task id="T07" parallel="true" status="pending">
  <name>采集模板 CRUD + 自动生成</name>
  <read_files>
    .specs/competitor-analysis-platform/REQUIREMENT.md
    server/db/schema.ts
    server/db/index.ts
    server/trpc.ts
    server/lib/ai-extractor.ts
  </read_files>
  <write_files>
    server/template/router.ts
    server/template/service.ts
  </write_files>
  <action>
    实现 tRPC 路由（AC-8）：
    - template: getByCompetitor / update / regenerate
    - 自动生成：首次采集后调用 ai-extractor 提取结果，生成 extraction_rules JSON 存入 DB
    - 微调：用户可编辑 extraction_rules（选择器/AI prompt）
    - 提取模式：template / ai / hybrid（DESIGN D6）
  </action>
  <verify>pnpm vitest run server/template/</verify>
  <done>模板 CRUD 通过；首次采集后自动生成模板；更新模板后重新采集走模板路径</done>
  <depends_on>T02, T04</depends_on>
</task>

<task id="T08" parallel="true" status="pending">
  <name>采集编排器（核心：抓取→提取→存储→对比）</name>
  <read_files>
    .specs/competitor-analysis-platform/REQUIREMENT.md
    .specs/competitor-analysis-platform/DESIGN.md
    server/db/schema.ts
    server/lib/scraper.ts
    server/lib/ai-extractor.ts
    server/lib/snapshot-diff.ts
  </read_files>
  <write_files>
    server/crawl/orchestrator.ts
    server/crawl/__tests__/orchestrator.test.ts
  </write_files>
  <action>
    实现采集编排核心（AC-1, AC-3, AC-9）：
    - `crawlCompetitor(competitorId, triggerType): Promise<CrawlResult>`
    - 流程：加载模板 → scraper 抓取 → template 优先 / AI 兜底提取 → 写 products + snapshots → diff 对比 → 写 crawl_log
    - 部分失败处理（AC-9）：单产品失败不阻断，记录失败原因，成功部分正常入库
    - CrawlResult = { total, new, changed, unchanged, failed, errors[] }
    - 竞品源状态管理：连续 3 次全失败 → status=error
  </action>
  <verify>pnpm vitest run server/crawl/__tests__/orchestrator.test.ts</verify>
  <done>编排器测试通过；模拟 HTML 输入能走完抓取→提取→存储→对比全流程；部分失败不影响成功数据</done>
  <depends_on>T03, T04, T05, T02</depends_on>
</task>

<task id="T09" parallel="true" status="pending">
  <name>产品查询 + 快照 Diff API</name>
  <read_files>
    .specs/competitor-analysis-platform/REQUIREMENT.md
    server/db/schema.ts
    server/db/index.ts
    server/trpc.ts
    server/lib/snapshot-diff.ts
  </read_files>
  <write_files>
    server/product/router.ts
    server/product/service.ts
    server/snapshot/router.ts
    server/snapshot/service.ts
  </write_files>
  <action>
    实现 tRPC 路由（AC-4, AC-5）：
    - product: list（支持按 competitor/group/category 筛选 + 按任意参数排序 + 关键词搜索）+ get
    - snapshot: listByProduct + diff（对比两次快照，返回 DiffResult）
    - JSON 列查询用 MySQL JSON_EXTRACT（ADR-002）
    - 排序：将 JSON 字段 extract 为 generated 临时列排序
  </action>
  <verify>pnpm vitest run server/product/ && pnpm vitest run server/snapshot/</verify>
  <done>产品列表支持筛选+排序+搜索；快照 diff 返回正确的新增/修改/删除标记</done>
  <depends_on>T02, T05</depends_on>
</task>

<task id="T10" parallel="true" status="pending">
  <name>采集日志 API + 定时调度（node-cron）</name>
  <read_files>
    .specs/competitor-analysis-platform/REQUIREMENT.md
    server/db/schema.ts
    server/trpc.ts
    server/crawl/orchestrator.ts
  </read_files>
  <write_files>
    server/crawllog/router.ts
    server/crawllog/service.ts
    server/scheduler.ts
  </write_files>
  <action>
    实现 tRPC 路由 + 定时调度（AC-2, AC-3, AC-7）：
    - crawllog: list（按时间范围筛选）+ getDetail
    - scheduler: 启动时从 DB 加载 schedule_enabled=true 的竞品源，注册 node-cron 任务（D3）
    - 手动触发接口：crawllog/trigger → 调用 orchestrator.crawlCompetitor(id, 'manual')
    - 定时触发：cron 到期 → orchestrator.crawlCompetitor(id, 'scheduled')
    - 进程重启后从 DB 恢复定时任务（D3 代价缓解）
  </action>
  <verify>pnpm vitest run server/crawllog/ && pnpm vitest run server/scheduler</verify>
  <done>手动触发产生 crawl_log 记录；定时注册后 cron 触发执行；日志列表按时间筛选正常</done>
  <depends_on>T08, T02</depends_on>
</task>

<!-- ==================== WAVE 4: 前端页面 ==================== -->

<task id="T11" parallel="true" status="pending">
  <name>AppShell + 导航布局（工业风）</name>
  <read_files>
    .specs/competitor-analysis-platform/DESIGN.md
    .specs/CONTEXT.md
    client/App.tsx
    shared/*
  </read_files>
  <write_files>
    client/components/layout/AppShell.tsx
    client/components/layout/Sidebar.tsx
    client/components/layout/Header.tsx
    client/lib/api.ts
    client/router.tsx
  </write_files>
  <action>
    实现 AppShell 布局（工业风视觉，参考 Bloomberg/Grafana）：
    - 左侧 Sidebar 导航：竞品源管理 / 产品对比 / 变更历史 / 采集历史 / 分组管理
    - 顶栏 Header：当前页面标题 + 手动采集按钮
    - tRPC React Query 客户端初始化（client/lib/api.ts）
    - React Router 路由注册
    - Tailwind 4 全局样式：等宽字体优先（JetBrains Mono）、深色主题基调、8/16/24/32 间距 scale
  </action>
  <verify>pnpm dev → 页面布局正确渲染，侧边栏导航可切换路由</verify>
  <done>AppShell 渲染正常；侧边栏 5 个导航项可切换；tRPC 客户端连接后端正常</done>
  <depends_on>T01</depends_on>
</task>

<task id="T12" parallel="true" status="pending">
  <name>竞品源管理页面</name>
  <read_files>
    .specs/competitor-analysis-platform/REQUIREMENT.md
    client/components/layout/AppShell.tsx
    client/lib/api.ts
    shared/*
  </read_files>
  <write_files>
    client/pages/competitors/CompetitorList.tsx
    client/pages/competitors/CompetitorForm.tsx
    client/pages/competitors/CompetitorCard.tsx
  </write_files>
  <action>
    竞品源管理页面（AC-1, AC-3）：
    - 列表：卡片展示所有竞品源（名称/URL/状态/上次采集时间/下次采集时间）
    - 添加/编辑表单：名称 + URL + 分组选择 + 采集频率选择 + 启停开关
    - 每个卡片有「立即采集」按钮，点击触发手动采集，完成后 toast 展示结果摘要
    - 状态标识：active(绿) / paused(灰) / error(红)
  </action>
  <verify>pnpm dev → 添加 H3C WLAN URL 保存成功，卡片显示在列表中</verify>
  <done>竞品源 CRUD 正常；手动采集触发后显示结果摘要；状态标识正确</done>
  <depends_on>T06, T10, T11</depends_on>
</task>

<task id="T13" parallel="true" status="pending">
  <name>产品对比表格页面（TanStack Table）</name>
  <read_files>
    .specs/competitor-analysis-platform/REQUIREMENT.md
    .specs/CONTEXT.md
    client/components/layout/AppShell.tsx
    client/lib/api.ts
    shared/*
  </read_files>
  <write_files>
    client/pages/products/ProductTable.tsx
    client/pages/products/ProductFilters.tsx
    client/components/ui/data-table.tsx
  </write_files>
  <action>
    产品参数对比表格（AC-4, AC-6）：
    - TanStack Table 无头表格 + shadcn 风格包装（DESIGN D8）
    - 列：型号 / 分类 / WiFi 标准 + 所有动态参数列（从 JSON 展开）
    - 筛选：按竞品源 / 按分组 / 按分类 / 关键词搜索
    - 排序：所有列可点击排序
    - 行点击跳转到产品变更历史
    - 虚拟滚动（大数据量时保持性能）
  </action>
  <verify>pnpm dev → 选择分组后表格展示对应产品，排序和筛选正常</verify>
  <done>表格渲染正确；筛选排序可用；动态参数列从 JSON 展开显示；虚拟滚动无卡顿</done>
  <depends_on>T09, T06, T11</depends_on>
</task>

<task id="T14" parallel="true" status="pending">
  <name>变更 Diff 查看页面</name>
  <read_files>
    .specs/competitor-analysis-platform/REQUIREMENT.md
    client/components/layout/AppShell.tsx
    client/lib/api.ts
    shared/*
  </read_files>
  <write_files>
    client/pages/snapshots/DiffViewer.tsx
    client/pages/snapshots/SnapshotTimeline.tsx
    client/components/ui/diff-tag.tsx
  </write_files>
  <action>
    变更 Diff 查看页面（AC-5）：
    - 产品选择后展示采集时间线（横向 timeline，每个节点 = 一次快照）
    - 选择任意两次快照，展示参数 diff 表格
    - 新增字段：绿色背景 + "+" 标记
    - 修改字段：黄色背景 + "旧值→新值"
    - 删除字段：红色背景 + "-" 标记
    - 未变更字段：灰色，可折叠
  </action>
  <verify>pnpm dev → 选择两次快照后 diff 高亮正确</verify>
  <done>Timeline 渲染正确；diff 新增(绿)/修改(黄)/删除(红) 高亮准确</done>
  <depends_on>T09, T11</depends_on>
</task>

<task id="T15" parallel="true" status="pending">
  <name>采集历史 + 模板编辑页面</name>
  <read_files>
    .specs/competitor-analysis-platform/REQUIREMENT.md
    client/components/layout/AppShell.tsx
    client/lib/api.ts
    shared/*
  </read_files>
  <write_files>
    client/pages/crawllog/CrawlLogList.tsx
    client/pages/crawllog/CrawlLogDetail.tsx
    client/pages/templates/TemplateEditor.tsx
  </write_files>
  <action>
    采集历史 + 模板编辑（AC-7, AC-8）：
    - 采集历史列表：时间 / 竞品名 / 状态(success/partial/fail) / 发现数 / 变更数 / 耗时
    - 详情：展开显示每个产品的采集结果（成功/失败/失败原因）
    - 模板编辑器：JSON 编辑器组件，展示当前采集模板，可修改 extraction_rules 后保存
    - 合规使用提示：页面底部固定提示条
  </action>
  <verify>pnpm dev → 历史列表展示采集记录；模板可查看和编辑</verify>
  <done>采集历史列表正常展示；状态标色正确；模板 JSON 可编辑保存</done>
  <depends_on>T10, T07, T11</depends_on>
</task>

<!-- ==================== WAVE 5: 真实数据验证 ==================== -->

<task id="T16" parallel="false" status="pending">
  <name>H3C 真实数据端到端验证</name>
  <read_files>
    .specs/competitor-analysis-platform/REQUIREMENT.md
    server/crawl/orchestrator.ts
    server/lib/scraper.ts
    server/lib/ai-extractor.ts
    server/lib/snapshot-diff.ts
  </read_files>
  <write_files>
    scripts/seed-h3c.ts
  </write_files>
  <action>
    端到端验证（验收线全部 3 条）：
    - 用 H3C WLAN 页面 (https://www.h3c.com/cn/.../IP_Wlan/) 作为测试数据
    - 脚本：创建竞品源 → 触发首次采集 → 验证产品入库 → 触发第二次采集 → 验证 diff
    - 验收线 1：能添加 URL 并成功采集到产品参数（至少 10 个产品）
    - 验收线 2：同一产品两次采集间有变更时 diff 高亮正确
    - 验收线 3：配置每天定时采集，确认 cron 注册成功
    - 修复验证过程中发现的问题
  </action>
  <verify>pnpm tsx scripts/seed-h3c.ts → 输出「验收线 1/2/3 全部通过」</verify>
  <done>3 条验收线全部通过；H3C 页面采集到 ≥10 个产品；diff 计算正确；定时任务注册成功</done>
  <depends_on>T08, T10, T12, T13, T14, T15</depends_on>
</task>
```

---

## 状态字段说明

- `status="pending"` — 未开始
- `status="in_progress"` — 进行中（同时只允许一个非 [P] 任务为此状态）
- `status="done"` — 已完成（verify 通过）
- `status="blocked"` — 阻塞（必须在文件末尾「阻塞日志」记录）

---

## 阻塞日志

| 任务 | 阻塞原因 | 待人工决策项 | 时间 |
|---|---|---|---|
|  |  |  |  |

---

## Fix 任务（来自 REVIEW / INTEGRATION）

> 此区域由 review/integration 阶段自动追加，编号 `T-FIX-XX`。

```xml
<!-- 占位 -->
```
