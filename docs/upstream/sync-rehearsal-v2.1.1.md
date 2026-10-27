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
