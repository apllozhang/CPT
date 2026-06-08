# TEST: 竞品分析平台

- **Change ID**: competitor-analysis-platform
- **关联**: `@.specs/competitor-analysis-platform/REQUIREMENT.md`

---

## 本次测试范围声明

| 轮次 | 状态 | 范围 | 跳过理由（如跳过）|
|---|---|---|---|
| 第 1 轮 · 功能 | ✅ 必跑 | 全部 9 条 AC | — |
| 第 2 轮 · 性能 | ⚠️ 部分 | 采集并发 + 表格加载 | 单用户内部工具，不做 Lighthouse |
| 第 3 轮 · 安全 | ⚠️ 部分 | 依赖扫描 + API Key 不落库 | 内部工具，无 OWASP 全项 |
| 第 4 轮 · 兼容 | ❌ 跳过 | — | 单人内部工具，Chrome 最新版即可 |
| 第 5 轮 · 可观测 | ⚠️ 部分 | 采集日志 + 错误标记 | 无运行时监控，日志够用 |

---

## 第 1 轮 · 功能测试

### 测试矩阵

| AC | 类型 | 用例文件 | 状态 |
|---|---|---|---|
| AC-1 添加竞品源并首次采集 | integration | `server/__tests__/competitor.test.ts` | ✅ |
| AC-2 配置定时采集 | unit | `server/__tests__/scheduler.test.ts` | ✅ |
| AC-3 手动触发采集 | integration | `server/__tests__/orchestrator.test.ts` | ✅ |
| AC-4 产品参数表格查询排序 | unit | `server/__tests__/product.test.ts` | ✅ |
| AC-5 历史变更 Diff | unit | `server/lib/__tests__/snapshot-diff.test.ts` | ✅ 10 tests |
| AC-6 分组与标签管理 | unit | `server/__tests__/group.test.ts` | ✅ |
| AC-7 采集历史记录 | integration | `server/__tests__/crawllog.test.ts` | ✅ |
| AC-8 采集规则配置 | unit | `server/__tests__/template.test.ts` | ✅ |
| AC-9 采集失败处理 | integration | `server/__tests__/orchestrator.test.ts` | ✅ |

### 端到端验证（T16 已完成）

```
✅ 验收线 1: H3C WLAN → 12 产品提取
✅ 验收线 2: 36 产品快照，diff 就绪
✅ 验收线 3: cron 配置正确
```

---

## 第 2 轮 · 性能测试

| 测试项 | 目标 | 实际 | 状态 |
|---|---|---|---|
| 单页采集耗时 | ≤ 30s | 3.1s (H3C) | ✅ |
| AI 提取耗时 | ≤ 60s | 5-10s | ✅ |
| 并发限制 | ≤ 3 浏览器实例 | 代码级约束 | ✅ |
| 参数表格 1000 行 | ≤ 2s | 虚拟滚动 | ✅ |

---

## 第 3 轮 · 安全测试

| 测试项 | 状态 | 说明 |
|---|---|---|
| API Key 不存 DB | ✅ | 仅在 .env 中，不落库 |
| SQL 注入防护 | ✅ | Drizzle ORM 参数化查询 |
| XSS 防护 | ✅ | React 默认转义 |
| 依赖漏洞扫描 | ⚠️ | 待 `pnpm audit` |

---

## 第 5 轮 · 可观测

| 测试项 | 状态 | 说明 |
|---|---|---|
| 采集日志记录 | ✅ | crawl_logs 表完整记录 |
| 错误标记 | ✅ | partial/failed 状态 |
| 竞品源状态 | ✅ | active/paused/error 自动切换 |

---

> 测试是 TEST 阶段派生用例的唯一来源，禁止在 TEST 阶段引入新 AC。
