# feature/m0-mvp 恢复报告（M0-REC / INH-1980）

- 日期：2026-10-24
- 结论：**恢复失败**（recovered 0），47 张 M0 卡全部转 rebuild。

## 探测过程（时间盒内完成）

Linear 评论中提取的 19 个自述 SHA：af554b7、4d04d13、e9b6102、4959da0、2126f5e、265e41b、175aca2、7c27a03、fe1f904、ed871c4、6a2621f、20cfddb、f2021e9、3fda9f5、6928d20、0e7ee62、ca44779、779c7d8、5c007cd。

| 探测 | 结果 |
| --- | --- |
| `git cat-file -t <sha>`（本地对象库） | 0/19 存在 |
| `git branch -a --contains <sha>` | 无 |
| `git fsck --full --unreachable --no-reflogs` | 无 dangling commit |
| `git stash list` | 空 |
| `git log --all -- src/kisu` | 无任何提交 |
| `gh api repos/Arragon/Kisu/commits/<sha>` | 全部 422 |
| GitHub PR / 分支 | 无 PR；分支仅 dev/main/next |
| 本机其他目录 | 无 kisu 克隆 |

## 卡片映射

| 结论 | 范围 | 处置 |
| --- | --- | --- |
| recovered | 0 | — |
| rebuild | 47 张 M0 卡：MVP-02（INH-1143）、MVP-05..24（INH-1146..1165）、MVP-26..28（INH-1167..1169）、MVP-30..32（INH-1171..1173）、MVP-36..38（INH-1177..1179）、MVP-40..44（INH-1181..1185）、MVP-47..56（INH-1188..1197）、MVP-60（INH-1226）、KP-001（INH-1228） | In Progress + `rebuild` 标签 |
| 保持 Done（有仓库产物） | MVP-01（baseline.json）、MVP-03（ownership.md）、MVP-04（control-paths.md） | 不变 |
| duplicate | INH-1229 | 已关闭；KP-001 canonical = INH-1228 |
| 误标 Done/In Progress | M2 UP-01..06（INH-1213..1218）及 epic INH-1212 | 回退 Backlog（M2 未开始） |

## 状态漂移记录

计划快照时 25 张 leaf Done；本次审计时 **55 张**（P2/P3/P4/P5/P6 与 M2 UP 卡均被标 Done），而仓库无任何 `src/kisu/` 产物。2026-10-23 INH-1143 评论声称的 `baseline-tests.md`（78 suites / 810 tests）不存在于任何分支。诚实化后 Done 仅剩 3 张可验证卡。原卡评论全部保留作为重建的设计证据。

## 丢失的关键设计产物（重建时优先恢复）

- `docs/architecture/decisions.md` 中的 ADR-011/012/014/015（本 PR 按 可验证证据部分重建，见该文件）
- `docs/architecture/youtube-lifecycle.md`（5c007cd，INH-1177 产物）
- `docs/architecture/selection-capability-map.md`（INH-1167 产物）
- `src/kisu/kcl/*` 全部实现与测试（21 suites / 285 tests，据 INH-1147 评论）

## 后续路径

按 M0 计划 P1 → P6 逐卡重建，一卡一 PR；ADR 在对应卡片重建时重新推导并落档 `docs/architecture/decisions.md`。
