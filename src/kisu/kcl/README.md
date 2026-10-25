# KCL — KISS Compatibility Layer

KCL 是 Kisu 产品层与 KISS Translator 之间的唯一边界。产品代码（`src/kisu/product`、
`src/kisu/ui`）不得绕过 KCL 直接读取 KISS 的 settings schema、调用其内部函数或复制其算法。

## 边界规则（已验证的约定）

1. **intent-level contract**：KCL 只暴露意图级读/写命令（如"设置页面翻译模式"），
   不暴露 KISS 内部实现细节；调用方不需要知道底层 setting 字段名。
2. **禁止复制算法**：translator、subtitle segmentation、provider 请求构造等算法一律
   复用上游实现（经调用或注入 transport），KCL 不出现第二份实现。
3. **capability 必须显式**：任何能力（如 context mode）必须经 `capabilities.js` 显式
   声明为 supported，未声明的能力不得出现在产品 UI；上游不存在的能力不得包装成存在。
4. **产品层优先经 KCL**：产品层读取 KISS 状态、下发命令、感知 capability 都走 KCL；
   唯一例外是经登记的 carried patch（`docs/upstream/carried-patches.md`）。

## 目录约定

| 文件 | 职责 | 引入卡 |
| --- | --- | --- |
| `version.js` | Kisu 版本（M0 来源：`docs/upstream/baseline.json` 的 `kisuVersion`） | MVP-05 |
| `result.js` | 归一化结果契约 `{ ok, value, error: { code, message } }` 与错误码 | MVP-05 |
| `capabilities.js` | 显式 capability 声明与形状 | MVP-05 |
| `page.js` / `sites.js` | Page 只读投影 / 写命令（经注入的 transport adapter） | MVP-06/07 |
| `providers.js` | Provider 安全列表与 descriptor | MVP-08 |
| `selection.js` | Selection 最小接口 | MVP-09 |
| `subtitles.js` / `subtitleRuntime.js` | Subtitle 读写 / KP-001 运行时访问 | MVP-10/11 |
| `__tests__/contracts.test.js` | 语义 contract 套件（schema 漂移必须失败） | MVP-12 |

## 结果契约

```js
import { kclOk, kclError, KCL_ERROR_CODES } from "./result";

kclOk(value);                          // { ok: true, value, error: null }
kclError("PROVIDER_NOT_FOUND", "..."); // { ok: false, value: null, error: { code, message } }
```

错误码（`KCL_ERROR_CODES`）：`PROVIDER_NOT_FOUND`、`PROVIDER_DISABLED`、
`UNSUPPORTED_INPUT`、`CAPTION_UNAVAILABLE`、`CONTEXT_UNSUPPORTED`、
`TRANSPORT_UNAVAILABLE`（消息通道不可用/无响应，如内容脚本未注入）、
`PROVIDER_REQUEST_FAILED`（provider 请求执行失败）。

## Selection（MVP-09）

- provider = `tranboxSetting.apiSlugs` **多选数组**（独立于 page 的 `rule.apiSlug`）；
  读写见 `getSelectionProviders` / `setSelectionProviders`（经注入 setting 读写器，
  未知 slug 整批拒绝）
- `translateSelection` / `lookupSelection` 为执行包装器：runner 由产品层注入并绑定
  上游 `apiTranslate` / `apiDict` 等（P4 surface，D5）。KCL 不静态 import `src/apis/*`
  ——其依赖链含 Jest 27 无法加载的 `@streamparser/json` ESM（BL-04）
- 词条/句子/长文本分类边界（ADR-015）在 MVP-27（INH-1168）重建时定稿

## Subtitle 运行时（KP-001）

- TRACK 补丁 KP-001（ADR-011，见 `docs/upstream/carried-patches.md`）在
  `YouTubeCaptionProvider` 上暴露只读冻结快照：`getYouTubeCaptionStatus()`
  未初始化返回 null，快照字段为原始值，无写通道
- `readSubtitleRuntime(getStatus)`：访问器注入（content bootstrap 绑定）；
  未注入 → `TRANSPORT_UNAVAILABLE`；未挂载（null）是合法状态 → `kclOk({mounted:false})`
- 设置层读取（MVP-10）由 `subtitles.js` 的 `normalizeSubtitleState(setting, {getStatus})`
  提供：enabled、显示模式（`isBilingual × displayOrder` 组合，**不发明枚举**）、
  provider（含 registered 标记）、目标语言、AI 断句/上下文 capability
  （absent / unregistered / incompatible / supported 四态；上游对 segSlug 不做的
  硬校验由 KCL 补上）与 runtime 状态；回退默认取 `DEFAULT_SUBTITLE_SETTING`

### Subtitle 写命令（MVP-11）——D3 的 M0 回退：next-load

`setSubtitleEnabled / setSubtitleDisplayMode / setSubtitleProvider /
setSubtitleTargetLanguage / setSubtitleContextMode`（经注入 setting 读写器）：
只持久化 `subtitleSetting`，**下次字幕系统启动（新视频/刷新）生效**；产品层 UI
必须向用户明示。上游 `updateSetting` 的实时通道（isBilingual/displayOrder 等
六字段）不对 KCL 开放（KP-001 只读），实时切换需 KP-002 扩展，留待 D3 正式拍板。
context mode 不支持/不兼容时**显式拒绝**（`CONTEXT_UNSUPPORTED` /
`PROVIDER_NOT_FOUND`），绝不静默假成功。每条命令写后重读 setting 并返回归一化
投影（验证真实持久状态）。

## Page 写命令 transport（MVP-07）

命令接受 transport：`{ sendTab(action, args?), sendBg(action, args)?,
readSetting()?, writeSetting(updater)? }`（或裸函数 = 仅 sendTab）。

- 开/关由「GETRULE 读 + 条件 TOGGLE」组合实现幂等（上游 `toggle()` 非幂等，禁止盲发）
- `MSG_TRANS_PUTRULE` 只改运行态；持久化显式走 `saveSiteRule`（`MSG_SAVE_RULE` →
  background，由上游 `saveRule` 做模糊合并与全局等值剥离）
- 黑名单存于 setting（无消息通道），`setSitePreference("never"/"clear")` 需注入
  setting 读写器，缺失时明确失败
- 已知未覆盖：站点规则的删除/停用语义（`saveRule` 的 enabled/removal 路径）未经验证，
  留给 MVP-22（INH-1163）按证据补齐

## 禁止事项

- 不在 KCL 内直接读写 storage（经注入的 transport adapter）
- 不引入 React/MUI 或任何 UI 概念（P2 boundary test 会拦截）
- 不为"未来可能"预建抽象；每个导出必须有当前调用方或 contract test
