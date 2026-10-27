# Kisu UI Tokens（provisional）

`tokens.js` 是 Kisu 的语义 token 契约（MVP-13 / INH-1154）。

## 规则

1. **provisional**：全部数值只保证可读 / 可访问（WCAG 对比度）/ light-dark 双模式，
   不表达最终品牌风格；M1 Design Freedom Gate（DES-03/04）收敛前不冻结，
   替换为正式值属于纯值变更（`resolveTokens` 的存在就是机制面证明）。
2. **语义在键名，不在值**：产品代码只按语义名引用（`text.secondary`、`space.md`…），
   禁止依赖具体 hex / px / shadow / duration 值——P2-T05（MVP-17）boundary test 强制。
3. **不引入架构性风格参考**：不把 Linear / Arc / Raycast / Material 等任何外部产品
   的视觉写成约束；M1 探索方向时本文件整体可被替换。
4. status token 为 `{ fg, bg }` 成对出现，保证前景/背景同时替换、对比度成对成立。
5. `zIndex` 只定义 Kisu 自有表面层级；与上游 tranbox（2147483647）的共存策略由
   各 surface 的挂载决策（P4/P5）负责。

## 命名空间

| 命名空间 | 内容 |
| --- | --- |
| `color`（light/dark 双色板） | `bg` / `text` / `border` / `action` / `status` |
| `space` | none/xs/sm/md/lg/xl/xxl（px） |
| `type` | fontFamily / size / weight / lineHeight |
| `radius` | none/sm/md/round |
| `elevation` | none/low/mid/high（box-shadow） |
| `motion` | durationMs / easing |
| `zIndex` | content/overlay/toast |

## 消费方式

```js
import { getColorPalette, space, radius } from "../tokens";
const palette = getColorPalette("dark");
// palette.text.primary / palette.status.info.fg ...
```

MVP-14（primitives）把 tokens 接入组件；在那之前无其他消费方。
