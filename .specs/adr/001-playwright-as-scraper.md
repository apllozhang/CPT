# ADR-001: Playwright 作为爬虫引擎

## Context

竞品分析平台需要从竞品网站抓取产品参数。目标网站可能是：
- 静态 HTML 页面（传统服务端渲染）
- JS 渲染的 SPA 页面（如 H3C 官网）
- 含动态加载内容的页面

需选择一个能在 Node.js 环境下运行的爬虫方案。

## Decision

使用 Playwright 作为爬虫引擎。

## Consequences

**优势**：
- 支持 Chromium / Firefox / WebKit，自动处理 JS 渲染
- 现代异步 API，auto-wait 机制减少 flaky
- 同一技术栈 TypeScript，与后端无缝集成
- 支持截图、PDF、网络拦截（可用于调试和采集失败诊断）

**代价**：
- 需下载 Chromium ~200MB（首次安装）
- 比 Cheerio/axios 重，内存占用更高
- 并发需手动控制（限制 3 实例）

**备选方案**：
- Puppeteer：更成熟但 API 不一致，只支持 Chrome
- Cheerio + axios：轻量但无法处理 JS 渲染页面
- Python Scrapy：生态好但引入语言分裂

**推翻条件**：如果所有目标网站都是静态 HTML，可降级为 Cheerio + axios 以减少资源占用。
