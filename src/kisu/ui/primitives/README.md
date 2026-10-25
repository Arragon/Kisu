# Kisu UI Primitives（provisional）

MVP-14 / INH-1155 交付的七件最小 semantic primitives。**实现决策**：全部基于原生
元素 + tokens 内联样式，不引入 MUI/emotion——原生 `button` / `select` / radio
语义自带键盘与焦点行为（验收要求的最可靠路径），无样式注入机制，ShadowRoot
友好，且不违反"不引入新 UI framework"。卡片允许内部用 MUI，但当前七件无需。

## 规则

1. **feature 层只组合 primitives**，不得接触 raw styling API 或具体样式值
   （P2-T05 / MVP-17 boundary test 强制）。
2. primitives 内**禁止出现任何 hex / px / shadow 字面量**——一切取自
   `src/kisu/ui/tokens/`（对照 tokens 的 `px` 值属于 token 本身）。
3. `mode`（light/dark）经 `ModeProvider` 传播，组件可用 `mode` prop 覆盖；
   颜色一律经 `useColorPalette` 解析。
4. 可访问性：`IconButton` 强制 `label`（aria-label）；`SegmentedControl` 是
   `radiogroup` + roving tabindex（方向键/Home/End）；`Tooltip` 用
   `aria-describedby` + focus/hover；`InlineStatus` 是 `role="status"`；
   focus ring 统一来自 `useFocusRing`。

## 清单

| 组件 | 语义 | 关键 props |
| --- | --- | --- |
| `Button` | 原生 button | `variant: primary\|secondary`、`disabled` |
| `IconButton` | 原生 button + 强制 aria-label | `label`、`size: sm\|md` |
| `SegmentedControl` | radiogroup + roving tabindex | `options`、`value`、`onChange` |
| `Select` | 原生 select | `options`、`value`、`onChange`、`aria-label` |
| `Surface` | 中性容器 | `level`、`padding`、`bordered`、`lift` |
| `InlineStatus` | role="status" | `tone: info\|success\|warning\|error` |
| `Tooltip` | aria-describedby + focus/hover | `label` |
