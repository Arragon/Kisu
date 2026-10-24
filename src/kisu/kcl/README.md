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
`TRANSPORT_UNAVAILABLE`（消息通道不可用/无响应，如内容脚本未注入）。

## 禁止事项

- 不在 KCL 内直接读写 storage（经注入的 transport adapter）
- 不引入 React/MUI 或任何 UI 概念（P2 boundary test 会拦截）
- 不为"未来可能"预建抽象；每个导出必须有当前调用方或 contract test
