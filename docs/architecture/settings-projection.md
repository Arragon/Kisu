# Simple Settings → KISS/Kisu settings projection map（MVP-47 / INH-1188）

- Authority：`src/config/setting.js:241`（DEFAULT_SETTING）、`src/config/rules.js`
  （DEFAULT_RULE/GLOBLA_RULE）、`src/config/setting.js:124/:171`（tranbox/subtitle）。
- 性质：**P6 硬门禁**——任何 Simple Settings UI 先于本图字段级冻结。原则：
  单一事实源、additive 迁移（无 destructive）、legacy Advanced 永远可达。
- 分类：**EXISTING** = KISS 既有 setting（Kisu 直读直写，不改 schema）；
  **ADDITIVE** = Kisu 新增（独立命名空间，缺省合并，不触碰既有键）；
  **DERIVED** = KCL 运行时派生（无存储）。
- 存储键：`STOKEY_SETTING`（全局）、`STOKEY_RULES`（站点规则列表）——均为上游键，
  Kisu 不新增存储键（onboarding 状态除外，见 ADDITIVE）。

## 1. General section（MVP-60/1226）

| 字段 | 分类 | 事实源 / 默认 | 读写路径 | 迁移 |
| --- | --- | --- | --- | --- |
| 界面语言 | EXISTING | `uiLang` / "en" | storage 直读 | 无（上游键保留） |
| 深浅色 | EXISTING | `darkMode` / "auto" | `ModeProvider` 消费 | 无 |
| 快捷键展示 | EXISTING | `shortcuts` | 只读展示 | 无 |
| Onboarding 完成标记 | **ADDITIVE** | `kisuMeta.onboardingDone` / false | Kisu 写入；缺省=未完成→进 onboarding | additive 合并；旧用户无此键 → 视为已配置用户分流（读 `transApis`/`rules` 判断），不弹重置 |

## 2. Page section（MVP-49/1190）

| 字段 | 分类 | 事实源 / 默认 | 读写路径 |
| --- | --- | --- | --- |
| 默认目标语言 | EXISTING | `GLOBLA_RULE.toLang` / "zh-CN" | `setPageTargetLanguage`（PUTRULE）+ `saveSiteRule` 持久化 |
| 页面 provider | EXISTING | `GLOBLA_RULE.apiSlug` / "Microsoft" | `setPageProvider`（PUTRULE，transApis 校验） |
| 自动开翻译 | EXISTING | `GLOBLA_RULE.transOpen` / "false" | `setPageTranslation`（幂等组合）/ `setSitePreference("auto")` |
| 显示模式 | EXISTING（组合） | `transOnly`×`transOrder` | `setPageDisplayMode`（PUTRULE） |
| 站点策略 | EXISTING | `setting.blacklist` + `STOKEY_RULES` | `setSitePreference`（auto/never/clear，#21） |

## 3. Selection section（MVP-50/1191）

| 字段 | 分类 | 事实源 / 默认 | 读写路径 |
| --- | --- | --- | --- |
| 触发模式 | EXISTING | `tranboxSetting.triggerMode` / "click" | Simple Settings 直写 tranboxSetting |
| 划词 provider（多选） | EXISTING | `tranboxSetting.apiSlugs` / ["Microsoft"] | `setSelectionProviders`（#7，未知 slug 整批拒绝） |
| 目标语言 | EXISTING | `tranboxSetting.toLang` / "zh-CN" | 同上直写 |
| 词典来源 | EXISTING | `tranboxSetting.enDict` / "Bing" | 直写 |
| 单词仅查词 | EXISTING | `tranboxSetting.singleWordNoTrans` / false | 直写 |

## 4. YouTube section（MVP-51/1192）

| 字段 | 分类 | 事实源 / 默认 | 读写路径 |
| --- | --- | --- | --- |
| 启用字幕 | EXISTING | `subtitleSetting.enabled` / true | `setSubtitleEnabled`（#10 next-load） |
| 字幕 provider | EXISTING | `subtitleSetting.apiSlug` / "Microsoft" | `setSubtitleProvider`（#10） |
| 目标语言 | EXISTING | `subtitleSetting.toLang` / "zh-CN" | `setSubtitleTargetLanguage`（#10） |
| 显示模式 | EXISTING（组合） | `isBilingual`×`displayOrder` | `setSubtitleDisplayMode`（#10，词汇见 subtitle-modes.md） |
| AI 断句 | EXISTING | `subtitleSetting.segSlug` / "-" | capability 门控（#9） |
| Context | EXISTING | `subtitleSetting.aiContextSlug` / "-" | `setSubtitleContextMode`（#10，门控） |
| 运行时状态 | DERIVED | KP-001 快照（PR #8） | `readSubtitleRuntime` 只读 |

## 5. Translation Services section（MVP-52/1193）

| 字段 | 分类 | 事实源 / 默认 | 读写路径 |
| --- | --- | --- | --- |
| Provider 列表 | EXISTING | `transApis`（DEFAULT_API_LIST） | 读：KCL `listProviders`（#6 白名单 descriptor）；写：**复用上游编辑器**（凭证/模型经 Advanced/legacy 入口，Simple Settings 不复制 credential 表单） |
| 已删除内置 | EXISTING | `deletedTransApiSlugs` / [] | 上游编辑器管理 |

## 6. Appearance section

| 字段 | 分类 | 事实源 / 默认 | 读写路径 |
| --- | --- | --- | --- |
| 主题 | EXISTING | `darkMode` / "auto" | `ModeProvider`（V0.1 跟随 General，不重复字段） |
| 视觉 tokens | DERIVED | `ui/tokens`（provisional） | Design Freedom Gate 前不暴露 |

## 7. Sites section（MVP-22 同源）

| 字段 | 分类 | 事实源 | 读写路径 |
| --- | --- | --- | --- |
| 黑名单 | EXISTING | `setting.blacklist` | `setSitePreference("never"/"clear")` / 直读列表 |
| 站点规则 | EXISTING | `STOKEY_RULES`（精确 pattern del，hooks/Rules.js:44） | 列表只读 + 跳 legacy 编辑（V0.1 不重做规则编辑器） |

## 8. Advanced / Legacy section（MVP-53/1194）

所有未列入 Simple Settings 的 EXISTING 字段（`minLength/maxLength/httpTimeout/
csplist/orilist/skipLangs/translateVariants/transInterval/langDetector/mouseHoverSetting/
preInit/transAllnow/rootMargin/customStyles/subrulesList/prompts/touchModes/
inputRule/contextMenuType/fabClickAction/clearCache/autoTranslateClipboard/
injectRules/logLevel`）**保持 legacy Options 全量可达**——Simple Settings 不复制、
不隐藏、不破坏。

## 9. Onboarding（MVP-54/55/1195/1196）

- 状态机三步（目标语言 → 服务 → 默认行为）全部写入 §1–§4 的 EXISTING 事实源；
- 唯一 ADDITIVE 写入：`kisuMeta.onboardingDone`（完成标记）；
- 分流规则：fresh install（无 `transApis` 变更 + 无 `kisuMeta`）→ 走引导；
  既有 KISS 用户 → 不强制引导，Advanced 可达；
- 中断恢复：状态机可重入（无部分提交——所有写入最后一步统一提交）。

## 10. 迁移与不变量（硬规则）

1. **无 destructive migration**：Kisu 升级只 additive 合并 `kisuMeta`；既有
   KISS 键永不删除/改写语义。
2. **单一事实源**：任何字段不得同时出现在两个可写路径（页面 provider 与字幕
   provider 分离是上游字段本身分离）。
3. **DERIVED 永不落盘**：capability/分类器/黑名单判定等一律运行时派生。
4. **未知键保留**：读侧遇到的未知 KISS 键原样透传（上游升级兼容）。
