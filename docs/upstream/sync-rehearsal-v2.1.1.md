# UP-03 sync 预演：v2.1.1 × Kisu-tip 冲突预扫描（INH-1213 追加 / 2026-10-27）

- 方法：临时 detached worktree 检出 Kisu 全量 tip
  （feat/UP02-api-deletion-audit = 5b8aebb8，含 PR #3–#61 全部变更），
  对上游 v2.1.1（a55d1a3）执行 `merge --no-commit --no-ff` 预扫描；
  结束后 merge --abort + worktree 移除 + 预演 tag 删除——**零正式改动落盘**。
- 结果快照：239 files added / 148 modified（干净合入）/ **9 个冲突文件**。

## 冲突清单与归因（全部 9 个）

| 文件 | 归因 |
| --- | --- |
| src/subtitle/BilingualSubtitleManager.test.js | EU-001（ KP-001 测试侧） |
| src/subtitle/YouTubeCaptionProvider.test.js | KP-001（快照测试） |
| src/subtitle/subtitle.js | EU-001 |
| src/subtitle/subtitle.test.js | EU-001 |
| src/views/Action/Draggable.js | EU-003 |
| src/views/Action/Draggable.test.js | EU-003 |
| src/views/Options/Subtitle.js | EU-001 |
| src/views/Selection/TranCont.js | EU-004 |
| src/views/Selection/TranForm.js | EU-004 |

## 关键实证：冲突 = 双方同改（最好情形）

EU-001/003/004 的上游原始提交（ca4ea90 / 02d362e / c95bd46）经
`merge-base --is-ancestor` 核验**全部已是 v2.1.1 的祖先**——即上游已原生吸收
我们的三个 exceptional intake，冲突产生于"我方 cherry-pick 副本 vs 上游正本"
的同改对撞，**不是语义分叉**。

## 对 UP-03 的含义

1. **storage 层重构零冲突**（intake §3 的最大成本项实测排除）——KCL 注入访问器
   预期透明。
2. 9 个冲突的解法方向：逐文件 diff 我方副本 vs 上游正本，确认等价后取上游侧；
   EU-001/003/004 转为 `obsolete`（上游已吸收），KP-001 re-apply 保留。
3. 冲突面收敛在 9 个文件、约 10 个 hunk（subtitle.js 3 + TranForm.js 7 等）——
   规模可控，UP-03 正式 sync 可直接执行。
4. 执行前提：UP-02 正式选型 v2.1.1（M2 启动时）。

## 现场

预演后已完整回滚：merge --abort、worktree 移除、预演 tag（v2.1.0/v2.1.1/v2.0.9）
删除。仓库无残留临时状态。

## 追加量化（2026-10-27）：9 冲突文件 ours-vs-theirs 差异

用冲突暂存区标准比较（stage 2 = 我方 tip，stage 3 = v2.1.1）逐文件量化：

| 文件 | 差异行 |
| --- | --- |
| src/views/Selection/TranForm.js | 1064 |
| src/views/Options/Subtitle.js | 988 |
| src/views/Action/Draggable.test.js | 475 |
| src/views/Selection/TranCont.js | 522 |
| src/subtitle/YouTubeCaptionProvider.test.js | 147 |
| src/subtitle/subtitle.test.js | 109 |
| src/views/Action/Draggable.js | 269 |
| src/subtitle/BilingualSubtitleManager.test.js | 30 |
| src/subtitle/subtitle.js | 44 |

**解读**：差异 = 上游 v2.1.1 的推进（新测试、M3 相关改动等）+ 我方 EU/KP-001 增量
的叠加，**不是字节等价的同改**。因此 UP-03 解法细化为：

1. EU-003/004 载体（Draggable/TranForm/TranCont）：上游已含 EU 提交（三提交
   ancestor 核验通过）→ 取上游侧即保留 EU 修复 + 获得上游推进；我方无独有内容
   需保留（EU 文件我方仅含 cherry-pick 副本）。
2. subtitle.js：同上（EU-001 上游已含）。
3. **KP-001 载体（YouTubeCaptionProvider.js 及其测试）例外**：`getStatusSnapshot()`
   + `getYouTubeCaptionStatus()` + 快照测试是我方独有——"取上游侧"后必须
   **re-apply KP-001 增量**（我方提交 7f73f3c 的精确 hunks 可直接复用）。
4. Options/Subtitle.js：EU-001 上游已含 → 取上游侧。

修订后解法仍为机械化操作，但 KP-001 载体两文件必须显式 re-apply——已列入
UP-03 正式 sync 的执行清单。

## 追加深化的完整实证（2026-10-27 二轮）

预演从"预扫描"推进到"**已验证解法**"：在临时 worktree 中实际构建
合并提交（Kisu 全量 tip + P6 线 + v2.1.1，9 冲突按上述解法解决），
并在合并树上完整运行 Kisu 套件：

```
Test Suites: 47 passed, 47 total
Tests:       420 passed, 420 total
```

- KCL contracts（漂移网）、P2 boundary 语义、三核 round-trip、迁移矩阵——
  全部在 v2.1.1 合并树上通过
- KP-001 访问器存活确认（merged 树中 getStatusSnapshot/getYouTubeCaptionStatus
  共 3 处引用 + KP-001 测试块已重接）
- **UP-03 从"预演"升级为"已验证解法"**：正式 sync 的结果树与测试结果已实测，
  剩余工作仅为 M2 启动后的正式分支化（UP-02 选型后）

预演用中间对象（GitHub 上的临时 commit/tree：56e98353/75516ef1/c4a61ef6/
1a980b59 与分支 tmp-up03-*）可留作 UP-03 的直接起点，或清理后重建。
