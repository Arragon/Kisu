# Page 产品流 Smoke（MVP-25 / INH-1166）

- 日期：2026-10-25
- 被测树：`feat/INH-1165-page-matrix` 工作区（next@m0-start + Kisu P1–P3 全部变更，PR #3–#23）
- 环境：macOS darwin 27 arm64 · Node v22.23.3 · pnpm 9.14.4

## 1. 自动化预检（已完成，可复跑）

```bash
pnpm build:chrome && pnpm build:firefox   # 双浏览器构建成功
node src/scripts/verify-build-output.mjs  # 产物完整性校验
```

结果（2026-10-25 实测）：

```
✅ build/chrome (v2.0.32)
✅ build/firefox (v2.0.32)
```

校验覆盖：manifest 必填字段（chrome: background/action/permissions/host_permissions；
firefox: background/permissions）、版本号、icons 资产存在性、content_scripts 声明的
js/css 存在性、background 脚本存在性。

行为回归（同一工作树）：Kisu 定向 20 suites / 237 tests 全绿（含 MVP-24 行为矩阵）；
全量 90 suites / 949 tests，仅剩基线既有 BL-01/02/04。

## 2. 人工浏览器 Smoke 清单（S2 搁置，待人工执行）

加载方式：Chrome `chrome://extensions` → 加载已解压 `build/chrome`；
Firefox `about:debugging` → 临时载入 `build/firefox/manifest.json`。

任一步骤失败 → 记录现象与 URL，按 EU 矩阵惯例定位 revert/修复对象。

| # | 步骤 | 预期 |
| --- | --- | --- |
| S1 | 静态文章页（如 Wikipedia）打开 Popup → Translate | 正文双语；Stop 出现；完成后回 Translate |
| S2 | 同页显示模式三档切换 | 原文优先/译文优先/仅译文即时生效；关开 Popup 后保持 |
| S3 | 目标语言切 ja → 重开 Popup | 仍为 ja；翻译输出日语 |
| S4 | Provider 切换（Microsoft→其他） | 后续请求走新服务；无凭据报错时 PageStatus 呈现可行动信息 |
| S5 | GitHub 动态页（仓库页/issue） | 动态加载内容可翻译；无重复翻译节点 |
| S6 | 混排页（中英混排 + code block） | code/行内代码不被破坏（上游 keepSelector 行为） |
| S7 | 黑名单站点（先 Never 再访问） | 主动作禁用 + "Reset" 逃生舱可恢复 |
| S8 | 流式 provider（OpenAI 类） | 段落渐进渲染；Stop 中止无残留 |
| S9 | zoom 80% / 125% / 200% 下 Popup | 可读、可操作、无遮挡溢出 |
| S10 | Firefox 同矩阵抽查（S1/S2/S5/S7） | 与 Chrome 行为一致 |

## 3. 结论

自动化可验证部分全部通过；S2–S10 为人工步骤（SHELVED-LOCAL.md S2 登记）。
人工 smoke 通过前，INH-1166 保持 In Progress；不阻塞 P4 继续重建（P4 前置条件
为 Selection KCL 与 D5 决策，非本卡）。
