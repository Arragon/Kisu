# Kisu Architecture Decision Records

> **恢复状态（2026-10-24）**：原 feature/m0-mvp 分支丢失（见 `docs/upstream/recovery-report.md`），
> 其中完整 ADR 文本不可恢复。本文件只收录可验证证据支持的内容；丢失条目在对应能力
> 重建时重新推导后正式落档，不提前臆造决策内容。

## ADR-011 · KP-001 字幕运行时访问采用只读快照访问器（收窄版）

- 状态：部分恢复（原文本丢失；决策要点由两处独立证据佐证）
- 证据：
  1. INH-1228 原实现评论（2026-09-13）：「KP-001 收窄版 carried patch……只读 `getStatusSnapshot()` 访问器，约 15 行净增量，唯一上游分歧（ADR-011 批准）」
  2. `docs/upstream/carried-patches.md` KP-001 条目（control-path 追踪产物）
- 决策：字幕运行时状态经**只读冻结快照**暴露；不交出 provider 实例或任何可变引用；不提供写通道（字幕写命令按 KP-002 / 决策 D3 处理）。快照字段限于原始值（videoId、mounted、autoTranslate、progressed、processing、activeTrackKey、fromLang）。

## ADR-014 · Page 状态同步采用轮询（pull-only）

- 状态：部分恢复（两条独立来源佐证）
- 证据：
  1. INH-1147 原实现评论：「`subscribePageState` 按 ADR-014 用轮询实现 pull-only 订阅」
  2. M0 计划 D4 决策记录：Page 写命令与状态同步不引入事件总线，M0 用轮询（1–2s、仅可见时、focus 即刷新），KP-004（上游窄通知）延后到 M2 评估
- 决策：Kisu 产品层不接入 KISS 内部事件总线；Page 活跃态经 KCL 以短周期轮询同步。

## 丢失待重建

| ADR | 主题（据现存引用推断） | 重建时机 |
| --- | --- | --- |
| ADR-012 | 字幕 provider 切换 live / next-load 语义（与决策 D3 相关） | INH-1152 重建时 |
| ADR-015 | Selection 内容分类边界（词条 / 句子 / 长文本） | INH-1168 重建时 |

引用过 ADR 编号但同样丢失的产物：`docs/architecture/youtube-lifecycle.md`（5c007cd）、`docs/architecture/selection-capability-map.md` 等，见 recovery-report.md。
