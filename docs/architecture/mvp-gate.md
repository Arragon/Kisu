# M0 MVP Architecture / Upstream / UI-Freedom Gate（MVP-59 / INH-1200）

- 日期：2026-10-25
- 被测树：`feat/INH-1198-vertical-regression`（next@m0-start + PR #3–#53 全部 M0 变更）
- 方法：每项给出**仓库可验证来源**（测试文件/文档/diff），证据可独立复跑。
  原计划引用的"roadmap §26 十二条"随丢失分支灭失——本清单从现存权威来源
  （control-paths.md、KISU-ROADMAP-v2 各阶段 Gate、architecture 文档）重构。

## 十二项核对

| # | 项 | Verdict | 证据 |
| --- | --- | --- | --- |
| 1 | KCL semantic contracts 全绿（含 schema 漂移网） | ✅ | `kcl/__tests__/contracts.test.js` + 47 suites / 420 tests（PR #11 起持续） |
| 2 | P2-T05 Design-Change Resilience Boundary | ✅ PASS | `ui/__tests__/boundary.test.js` 五层规则 + 夹具自测非空转（PR #16） |
| 3 | KCL 纯度：无 React/MUI、方向禁止 | ✅ | 同上 kcl 层规则；扫描零违规 |
| 4 | **零未登记 TRACK 修改** | ✅ | `git diff m0-start -- src/ ':!src/kisu'` = 恰好 KP-001 两文件（+39/-3, +72）；page/selection/entry 域空 diff |
| 5 | Upstream divergence audit（字幕域） | ✅ PASS | carried-patches.md 2026-10-25 二次审计（PR #41） |
| 6 | 页/选/字三核 round-trip + 跨核无串扰 | ✅ | `entry/__tests__/verticalRegression.test.js`（PR #53） |
| 7 | Settings projection map 冻结（先于 UI） | ✅ | `architecture/settings-projection.md`（PR #42，先于 MVP-48..60 全部 UI） |
| 8 | 无 destructive migration + 未知键透传 + stale 保留 | ✅ | `product/settings/__tests__/migration.test.js`（PR #52） |
| 9 | Legacy reachability（15 条契约） | ✅ | `AdvancedSection.LEGACY_CAPABILITIES`（PR #49，漏项即测试失败） |
| 10 | UI-Freedom：tokens provisional、换值不改语义 | ✅ | `tokens.test.js` resolveTokens 签名不变断言；DG 前不冻结（TOKEN_STATUS） |
| 11 | 语义诚实：不发明枚举/不营销化 capability | ✅ | subtitle-modes.md（#32）、isMatch/`API_SPE_TYPES` 一致性断言、capability 四态 |
| 12 | Upstream schema 漂移网 | ✅ | contracts 套件 + isMatch parity + `API_SPE_TYPES.ai` 全引擎矩阵 + DIVERGENCE audit |

## Verdict

**PASS（M0 自动化范围）**——架构边界、上游治理、UI 自由度三项全部有可复跑证据。
附条件：INH-1200 的**正式关闭**待 P4 剩余四卡（INH-1170/1174/1175/1176，全部前置
D5 用户拍板）合入后复核第 4 项（届时 diff 仍须仅含已登记 patches）。

## 显式 open items（不属本 gate 但须跟踪）

1. **D5 未拍板**（用户）：P4 INH-1170/1174/1175/1176。
2. **S2 浏览器 smoke**：page-smoke 十步 + YouTube SPA 六步 + INH-1199 双浏览器
   人工矩阵（自动化预检已双 ✅，PR #24）。
3. **S3 Gemini 真实请求**（EU-002 终验）。
4. **S1 Mimosa hook**：3 个上游 high 的修复/豁免决策。
