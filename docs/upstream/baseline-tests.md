# Untouched Upstream Baseline Tests

- 日期：2026-10-24
- 被测提交：`next` = `m0-start`（6037227，a775d12 + main f08bf89 的 merge；树等同 a775d12 = KISS v2.0.32 + EU-001..004 + 治理文档）
- 平台：macOS darwin 27.0 arm64
- 工具链：Node v22.23.3（mise）、pnpm 9.14.4（corepack，`packageManager` pin）
- 基线元数据：`docs/upstream/baseline.json`（kisuVersion 0.0.0-dev）

## 命令与结果

```bash
corepack prepare pnpm@9.14.4 --activate
pnpm install --frozen-lockfile          # ✅ Done in 54.2s
CI=true pnpm test -- --watchAll=false --runInBand
pnpm test:subtitle-segmentation         # ✅ 18/18 样本组合 100% coverage、0 errors
pnpm build:chrome                       # ✅
pnpm build:firefox                      # ✅
```

（实际执行通过 `mise exec node@22 -- corepack pnpm@9.14.4 <cmd>` 固定版本。）

### Jest 全量

| 指标 | 数值 |
| --- | --- |
| Test Suites | 70 total：67 通过 / **3 失败** |
| Tests | 709 total：707 通过 / **2 失败** |
| 耗时 | 11.9s |

## 已知失败复核（对照 2026-09-12 记录的 BL-01..04）

| ID | 位置 | 本次状态 | 说明 |
| --- | --- | --- | --- |
| BL-01 | `src/libs/batchQueue.test.js` › BatchQueue "keeps batches serial by default" | 失败（复现） | 断言与 concurrency 默认值不一致（上游默认 5→10 后测试前提过期），测试自身缺陷 |
| BL-02 | `src/apis/trans.dict.test.js` › handleDict "falls back to default dictionary user prompt for old api settings" | 失败（复现） | 与 `trans.translate.test.js` 断言互相矛盾，二者不可能同时通过 |
| BL-03 | `src/subtitle/BilingualSubtitleManager.test.js` | **通过** | EU-001 提交（749f5d7）为该套件补充了 mock，绕开 ESM 加载问题 |
| BL-04 | `src/views/Options/Layout.test.js` | 失败（套件加载失败） | `@streamparser/json@0.0.22` 仅发布 mjs，react-scripts 5 / Jest 27 不 transform node_modules ESM，经 `src/libs/stream.js → fetch → gm → storage → hooks` 传导 |

3 个失败 suite 中：trans.dict / batchQueue 为断言失败（BL-01/02），Layout 为加载失败（BL-04）。

**结论**：所有失败均为上游既有问题，非 Kisu 改动引入。修复需修改 TRACK 文件（`config-overrides.js` Jest transform 配置）或上游测试文件，须走 carried-patch 流程另行决策，本基线按 untouched 原则不修。

## 与历史记录对账

- 2026-09-12 评论（Node 22.22.2 / pnpm 9.15.9）：69 suites / 666 tests，2 失败 + 4 suite 失败。本次差异（70/709、BL-03 转通过）来自 EU 补丁新增测试及其 mock。
- 2026-10-23 INH-1143 评论声称 "78 suites / 810 tests 通过、无 warning，含 1 个 Jest mapping 与 4 个 upstream 测试文件调整"：与本仓库 untouched 基线不符，该产物不存在（见 `recovery-report.md`）。

## 复现

```bash
mise exec node@22 -- corepack pnpm@9.14.4 install --frozen-lockfile
CI=true mise exec node@22 -- corepack pnpm@9.14.4 test -- --watchAll=false --runInBand
mise exec node@22 -- corepack pnpm@9.14.4 test:subtitle-segmentation
mise exec node@22 -- corepack pnpm@9.14.4 build:chrome
mise exec node@22 -- corepack pnpm@9.14.4 build:firefox
```
