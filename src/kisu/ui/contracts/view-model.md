# Feature Controller / View-Model 约定（冻结）

MVP-15 / INH-1156 冻结的 Kisu 前端分层约定。首例实现：
`src/kisu/product/page/controller.js`。后续 feature controller（Selection、
Subtitle、Settings）必须遵循同一形状，违例由 P2-T05 boundary test 与各
controller 的形状测试拦截。

## 分层

```text
KCL（归一化状态/命令，无 UI 概念）
  → feature controller（唯一状态归宿；纯 JS，无 React 依赖）
    → view-model（冻结快照，渲染的全部输入）
      → surface / renderer（只消费 view-model + primitives）
```

## View-Model 形状

```js
Object.freeze({
  status: "loading" | "idle" | "active" | "error", // 生命周期态（各 feature 可扩展枚举）
  data: null | Object.freeze({ ...产品语义字段 }),  // KCL 投影的产品语义字段
  can: Object.freeze({ ...动作名: boolean }),       // 可用性判定（独立冻结）
  blockedBy: null | "site" | "provider" | ...,      // 阻断原因（产品语义）
  error: null | { code, message },                  // 归一化错误（无 stack）
})
```

## 规则

1. **零视觉字段**：view-model / controller 不得出现颜色、圆角、阴影、字体、
   布局尺寸、MUI props 或任何样式值——视觉只存在于 tokens / primitives /
   surface。替换视觉风格不需要改 controller 或 KCL。
2. **`can` 冻结**：可用性判定与 `data` 分层，独立 `Object.freeze`。renderer
   只看 `can` 决定禁用/启用，不复算条件；`blockedBy` 给出语义原因供文案。
3. **controller 是唯一状态归宿**：订阅 KCL（如 ADR-014 的
   `subscribePageState`）、执行命令、把结果折叠为下一个 view-model；
   不持有 DOM、不 import React。
4. **订阅协议**：`subscribe(listener)` 立即回放当前 view-model 并返回退订
   函数；`getView()` 返回当前快照；`dispose()` 停止 KCL 订阅并忽略后续事件。
5. **错误归一化**：错误进入 `error: { code, message }`（KCL 错误码），
   `status: "error"` 不携带 stack trace；debug 细节归 Advanced/日志，不上
   view-model。
6. **命令经 `actions`**：动作方法先检查 `can`（不满足即 no-op，不发消息），
   执行 KCL 命令后以真实回读状态折叠新 view-model。
