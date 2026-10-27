# Upstream intake report：KISS v2.0.32 → v2.1.1（UP-01 / INH-1213）

- 日期：2026-10-27（M2 intake 准备；UP-02 选型决策仍待 M2 正式启动）
- 方法：`compare/v2.0.32...v2.1.1` 实测（95 commits / 300 files）+ 关键文件 diff 抽查。
- 结论倾向：**可升级候选**——三核心域（Popup/Selection/Subtitle TRACK 面）零改动，
  新增内容以 additive 为主；storage 层重构是最大成本项，需 UP-03 实测。

## 1. 范围概览

| 项 | 值 |
| --- | --- |
| 上游新 stable | v2.1.0（2026-09-24）、v2.1.1（2026-10-13） |
| commits / files | 95 / 300 |

## 2. 三核心域影响（Kisu 最关心）

| 域 | 上游变化 | 对 Kisu |
| --- | --- | --- |
| **Subtitle（Path 3）** | `src/subtitle/*` 全部 **+0/-0** | KP-001 re-apply 平凡；字幕 KCL 契约（#9/#10）不受影响 |
| **Page（Path 1 Popup）** | `views/Popup/*`、`libs/translator*`、`libs/tranbox*` **+0/-0** | Page KCL（#4/#5）与 MVP-18..25 不受影响 |
| **Selection（Path 2）** | `views/Selection/*`、`hooks/useSelection*` **+0/-0** | Selection KCL（#7）与 MVP-27..32 不受影响 |

## 3. 主要变化分类（TRACK/FILTER/OWN + 处置建议）

| 变化 | 分类 | 规模 | 处置建议 |
| --- | --- | --- | --- |
| storage 层重构（storageCoordination/Events/State/Equality/Refresh + Storage.js 重写 + IndexedDB） | TRACK | 大 | **升级主要成本项**。KCL 经注入访问器读 SETTING/RULES，键不变则透明；但 KP-001 re-apply 与全量测试需 UP-03 实测验证 |
| i18n 大扩（i18n.js +2646、新 ru.js、locales/settings.js） | FILTER | 大 | additive，低风险；Kisu i18n 未深度依赖 |
| 新组件/hook：TextareaResizeGrip、TranslationPanel/Header、M3Theme | TRACK（新 OWN 面） | 中 | M3Theme 印证 control-paths §3 watch item（上游 M3 迁移推进）；V0.1 不采纳，留给 M1 DG 参考 |
| api.js +116/-67：新 provider APIMart/Requesty | FILTER | 小 | additive——KCL #6 registry 自动收录；capability 位自动派生 |
| setting.js schema 新字段（popupDefaultView、mouseHover 按住模式族、textareaGripStyle、checkUpdate、parseLatex 等） | EXISTING additive | 小 | projection map §10"未知键透传"规则覆盖；Kisu 不需动作 |
| rules.js | 无内容变化（+0/-0） | — | 无影响 |
| 测试大批新增（batchLine/translate/Storage lifecycle/blacklistStartup 等） | FILTER | 大 | 升级后可借力上游新测试加固回归 |

## 4. Carried patches 重验预判（UP-04 输入）

| Patch | 预判 |
| --- | --- |
| EU-001..004 | 三个 EU 涉及的文件在 v2.1.1 无上游等价修复迹象（subtitle/零变化；trans.js 有改动需 UP-03 逐个核对是否已吸收）；re-apply 仍需 |
| KP-001 | subtitle 域零变化 → re-apply 平凡 |
| KP-002..004 | 仍 proposed；storage 重写不触及 updateSetting 分支缺口 |

## 5. UP-02 决策输入摘要

- **支持升级**：三核心零改动；provider/语言/测试 additive 收益；不升级则 storage 隔阂随时间扩大。
- **成本/风险**：storage 层重构是唯一大成本项（KCL 注入访问器是否完全透明需实测）；`api.js` 的 -67 行删除需核对是否触及我们引用的常量（OPT_LANGS_TO/UI_LANGS 未在删除迹象中出现，UP-03 复核）。
- **建议**：UP-02 选 **v2.1.1** 为候选 baseline，进 UP-03 `upstream-sync/<date>` 实测；若 storage 冲突超预期，回退方案是仅吸收 i18n/provider additive（部分升级需 UP-02 批准，默认整段升级）。

## 6. 遗留观察

- 上游 v2.1.x 大量新增测试（Storage lifecycle、migration acceptance 等）——升级后可直接借力。
- `blacklistStartup.js` 为新文件（黑名单启动预检），与 KCL `isSiteBlacklisted` 平行——升级后需核对语义是否一致（一致性断言测试会捕获）。
