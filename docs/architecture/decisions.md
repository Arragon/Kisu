# Kisu Architecture Decision Records

> **恢复状态（2026-10-24）**：原 feature/m0-mvp 分支丢失（见 `docs/upstream/recovery-report.md`），
> 其中完整 ADR 文本不可恢复。本文件只收录可验证证据支持的内容；丢失条目在对应能力
> 重建时重新推导后正式落档，不提前臆造决策内容。

## ADR-014 · Page 状态同步采用轮询（pull-only）

- 状态：部分恢复（两条独立来源佐证）
- 证据：
  1. INH-1147 原实现评论：「`subscribePageState` 按 ADR-014 用轮询实现 pull-only 订阅」
  2. M0 计划 D4 决策记录：Page 写命令与状态同步不引入事件总线，M0 用轮询（1–2s、仅可见时、focus 即刷新），KP-004（上游窄通知）延后到 M2 评估
- 决策：Kisu 产品层不接入 KISS 内部事件总线；Page 活跃态经 KCL 以短周期轮询同步。

## 丢失待重建

| ADR | 主题（据现存引用推断） | 重建时机 |
| --- | --- | --- |
| ADR-011 | 字幕运行时访问语义（与 KP-001 收窄版访问器相关） | INH-1228 / MVP-10/11 重建时 |
| ADR-012 | 字幕 provider 切换 live / next-load 语义（与决策 D3 相关） | INH-1152 重建时 |
| ADR-015 | Selection 内容分类边界（词条 / 句子 / 长文本） | INH-1168 重建时 |

引用过 ADR 编号但同样丢失的产物：`docs/architecture/youtube-lifecycle.md`（5c007cd）、`docs/architecture/selection-capability-map.md` 等，见 recovery-report.md。
