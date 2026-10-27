# Subtitle product modes → KISS 真实语义映射（MVP-37 / INH-1178）

- Authority：`docs/architecture/control-paths.md` Path 3、
  `docs/architecture/youtube-lifecycle.md`（MVP-36）、KCL 契约
  （`kcl/subtitles.js` PR #9、`kcl/subtitleRuntime.js` + next-load 命令 PR #10）。
- 性质：只读契约冻结。**原则：每个产品标签必须有真实 setting/capability 映射；
  上游不存在的能力不得包装成存在（无营销标签）。**

## 1. 显示模式（isBilingual × displayOrder 组合，无枚举）

上游无单一 displayMode 字段（`BilingualSubtitleManager.js:543/:545` 两字段组合）。
产品模式 = 组合的呈现折叠，与 KCL `normalizeSubtitleState().displayMode` 一一对应：

| 产品模式 | isBilingual | displayOrder | KCL 补丁（setSubtitleDisplayMode） |
| --- | --- | --- | --- |
| 双语 · 原文优先 | true | "original-first" | `{bilingual:true, order:"original-first"}` |
| 双语 · 译文优先 | true | "translation-first" | `{bilingual:true, order:"translation-first"}` |
| 仅译文 | false | —（保留原值） | `{bilingual:false}` |

- **"仅原文"不是显示模式**：上游翻译激活后不存在"只显示原文"的渲染分支——该
  产品诉求映射为**停用字幕**（`setSubtitleEnabled(false)`，next-load），不得伪造。
- 显示模式写入为 next-load 语义（PR #10；实时通道需 KP-002 + D3）。

## 2. 处理轴（三条独立轴，不得折叠为一个"模式"枚举）

| 轴 | 产品标签 | 真实映射 | capability 依据 |
| --- | --- | --- | --- |
| 断句 | Standard（标准断句） | `segSlug:"-"` → `builtinSegment`；`useAlgorithmBreaker` 决定 rule/statistical 断行 | 始终可用（本地算法） |
| 断句 | AI 断句 | `segSlug`=AI apiSlug → `eventsToSubtitles` AI 路径 + chunk 惰性调度 | KCL 四态（absent/unregistered/incompatible/supported）；**上游不硬校验，机器翻译 slug 会静默回退——KCL 命令层已拒绝** |
| 上下文 | Contextual（视频摘要上下文） | `aiContextSlug`=AI apiSlug → `#enrichDocInfoWithAI` → `apiSummarizeContext` → docInfo.summary 进字幕 system prompt | KCL 四态 + 运行时硬约束：非 "-"、transApis 可解析、apiType ∈ AI、**transcript < 200 字符静默跳过** |

**命名依据**：Contextual 只承诺"视频摘要参与翻译提示词"（control-paths Path 3
Conclusion），不承诺对话式上下文；`useContext`（翻译会话历史）是**另一机制**，
与字幕无关，产品词汇不得混用。

## 3. unsupported / fallback 规则（产品层呈现义务）

| 情形 | 真实行为 | 产品呈现义务 |
| --- | --- | --- |
| segSlug 选了非 AI provider | 上游静默回退 builtin | KCL 命令层已拒绝（CONTEXT_UNSUPPORTED/PROVIDER_NOT_FOUND）；UI 不得出现该选项 |
| aiContextSlug 无效 | 同上 | 同上 |
| transcript < 200 字符 | 运行时静默跳过 enrichment | 状态区提示"本视频未应用上下文"（KP-001 快照无此粒度，呈现为 capability supported 但"本视频未生效"，不做错误） |
| provider 启动快照 | apiSlug/toLang/enabled 仅启动读取 | 所有变更 UI 明示"下次加载生效"（PR #10 契约） |
| AI 断句失败 | 上游自动回退 builtin 断句 | 非错误；不提示失败（上游语义），MVP-45 SPA 回归覆盖 |

## 4. 命令映射（KCL，PR #10）

| 产品动作 | KCL 命令 | 生效语义 |
| --- | --- | --- |
| 开/关字幕 | `setSubtitleEnabled` | next-load |
| 显示模式 | `setSubtitleDisplayMode` | next-load |
| 换字幕服务 | `setSubtitleProvider` | next-load |
| 目标语言 | `setSubtitleTargetLanguage` | next-load |
| 开/关 Contextual | `setSubtitleContextMode` | next-load |

运行时**读**：`normalizeSubtitleState(setting, {getStatus})`（capability 四态 +
KP-001 快照）。MVP-40..43 控件只消费本文件词汇与 KCL 命令。
