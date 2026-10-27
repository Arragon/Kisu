# Design directions 探索准备（M1 DES-01 前置）

- 日期：2026-10-25（M1 准备 / 非决策）
- 权力归属：**DES-02 由用户拍板方向**；本文件与其代码（`ui/tokens/directions.js`）
  只是探索输入，不是决定。DG（Design Freedom Gate）前不冻结任何审美。

## DES-01 将做什么

用**同一 MVP 功能状态**（PR #3–#54 的全部 KCL/controller/surface，零改动）渲染
2–4 套显著不同的方向，供用户选择。机制已由 `resolveTokens` 证明：换值不改语义。

## 已实体化的四套方向预设（`ui/tokens/directions.js`）

| 方向 | 色彩 | 非色变化 |
| --- | --- | --- |
| **Aurora** | 冷色蓝青（light/dark） | 紧凑圆角（sm 4/md 8）、快动效 |
| **Ember** | 暖色赭橙（light/dark） | 中圆角 |
| **Ink** | 单色高对比 | **直角**（sm 2/md 4）+ **零动效** |
| **Paper** | 暖灰橄榄 | **大圆角**（md 14）+ 舒缓动效（normal 300ms） |

## 质量门（每套强制，测试断言）

- 与默认 tokens 的语义键签名**完全一致**（换值不改语义的结构证明）
- light/dark 各 10 组 WCAG 对比度 ≥4.5:1（正文）/≥3:1（border.strong）
- 四套彼此值集互异（非重命名）

## DES-01 正式执行时还缺什么

1. 同一功能状态下的**整页渲染对比**（需要 entry options/popup 页装配完成——
   依赖 MVP-49..60 各 section 的 entry 接线，非本准备范围）。
2. 用户在四方向（或其变体）中选择 → DES-02 冻结 `DESIGN-DIRECTION.md`。
3. 选中方向经 `resolveTokens` 转正为默认 tokens（DES-03/04），其余废弃。
