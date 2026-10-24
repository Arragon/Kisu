# EU-001..004 运行验证（P0-EU / INH-1979）

- 日期：2026-10-24
- 被测提交：`next` = `m0-start`（6037227；EU 补丁集 = 749f5d7 / 230375d / d8760c7 / 3a7a4e8）
- 环境：macOS darwin 27 arm64 · Node v22.23.3 · pnpm 9.14.4
- 方法：定向单测（Jest）+ 关键 diff 人工复核。浏览器 smoke 与真实 API 请求见文末 Pending。

## 结果矩阵

| EU | commit | 单测面 | 单测 | diff 人工复核 | 浏览器 smoke | 结论 |
| --- | --- | --- | --- | --- | --- | --- |
| EU-001 字幕位置跨视频记忆 | 749f5d7 | BilingualSubtitleManager / YouTubeCaptionProvider / subtitle | ✅ 162/162（含 EU-001 新增用例） | — | pending | 单测通过，不 revert |
| EU-002 Gemini 3.x 不发送 unsupported minimal thinking level | 230375d | trans.translate / config/api | ✅ | — | 真实请求 pending（需 API key） | 同上 |
| EU-003 悬浮按钮跨视口越界修复 | d8760c7 | Action/Draggable | ✅ | — | pending | 同上 |
| EU-004 LanguageDetector 回退配置检测服务 | 3a7a4e8 | TranForm / TranCont / apis/index | ✅ | ✅ 见下 | pending | 同上 |

## EU-004 `src/apis/index.js` 人工复核

计划特别警告该文件曾被自动合并。复核结果（3a7a4e8 对该文件 +72 行，纯新增）：

- 新增 import：`OPT_LANGDETECTOR_MAP`、`OPT_TRANS_GOOGLE/BAIDU/TENCENT`、`getSetting`、`kissLog`
- 新增 `LANGDETE_FNS` 映射（与 `libs/detect.js` 的 langdetectFns 保持一致，单独维护以避免循环依赖，代码内有注释说明）
- 新增 `resolveBuiltinAISourceLang(text)`：内置检测器失败后经用户配置的远程检测服务解析源语言，映射 `OPT_LANGS_TO_CODE` 后返回；全部失败返回空串并保留原始错误

与提交信息描述一致，无意外合并产物、无行为外溢。结论：复核通过。

## 定向单测命令与结果

```bash
CI=true pnpm test -- --watchAll=false --runInBand \
  src/subtitle/BilingualSubtitleManager.test.js \
  src/subtitle/YouTubeCaptionProvider.test.js \
  src/subtitle/subtitle.test.js \
  src/views/Action/Draggable.test.js \
  src/views/Selection/TranForm.test.js \
  src/views/Selection/TranCont.test.js \
  src/apis/index.test.js \
  src/apis/trans.translate.test.js \
  src/config/api.test.js
# Test Suites: 9 passed, 9 total
# Tests:       162 passed, 162 total
```

## Pending（人工验收步骤，任一失败 → revert 对应 EU commit 并在此记录）

- **EU-001**：Chrome 加载 `build/chrome` → YouTube → 拖动字幕位置 → 切换视频 → 刷新页面，位置保持。
- **EU-002**：配置 Gemini 3.x non-lite flash 模型 API key，发起翻译，请求体不含 minimal thinking level 且翻译成功。
- **EU-003**：视口边缘拖动浮动按钮、页面缩放 80%/125%/200%、滚动后按钮仍可见且可拖回。
- **EU-004**：禁用内置 AI（或 Chrome < 127）+ `fromLang=auto` + 配置远程检测服务，划词翻译经回退成功。
