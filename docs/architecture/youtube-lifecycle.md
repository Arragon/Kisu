# YouTube SPA / Caption / Subtitle lifecycle（MVP-36 / INH-1177）

- Authority：`docs/architecture/control-paths.md` Path 3（v2.0.32 `7dfc03eb`）。
  **行号漂移**：`next` 上 EU-001 修改 `BilingualSubtitleManager.js`/`subtitle.js`/
  `YouTubeCaptionProvider.js`，按符号重定位。
- 性质：只读契约冻结，不改代码。本文件是**重建产物**（原 `5c007cd` 丢失，见
  `docs/upstream/recovery-report.md`），在 KP-001（INH-1228，PR #8）实装后重推导。
- 消费方：`kcl/subtitles.js`（#9/#10）、MVP-39 控制挂载（INH-1180）。

## 1. 全链路（stage → owner → 清理点）

```text
content bootstrap (src/content.js → common.js runSubtitle → subtitle.js)
  → XHR 拦截注入 (injector-subtitle.js → injectors/xmlhttp.js)
  → YouTubeInitializer 单例 (YouTubeCaptionProvider.js, initialized guard)
  → initialize(): message 监听 + yt-navigate-finish + waitForElement 控制栏/广告容器
  → [每次视频] yt-navigate-finish 重置序列（见 §2）
  → 拦截 timedtext XHR (postMessage MSG_XHR_DATA_YOUTUBE → #handleInterceptedRequest)
  → 字幕轨发现 (getCaptionTracks: watch 页正则抽 ytInitialPlayerResponse)
  → 字幕获取 (getSubtitleEvents: 匹配轨直接 JSON.parse；否则重写 timedtext 参数
    重取 json3——原地变更 potUrl.searchParams)
  → 规范化/展平 (prepareTimedTextEvents)
  → 断句 (builtinSegment；useAlgorithmBreaker=statistical → intelligentSentenceBreak；
    AI: segSlug + chunk 调度 createAiChunkScheduler 按播放窗口惰性)
  → 翻译队列 (#translateAndStore → apiTranslate；preTrans 90s 前瞻 + throttleTrans；
    batch 队列键 = apiSlug+语言+prompt 签名+并发)
  → 渲染 (#startManager → BilingualSubtitleManager.start → #updateCaptionDisplay；
    侧栏 YouTubeSubtitleList)
```

## 2. SPA 重置序列（yt-navigate-finish，`YouTubeCaptionProvider` 内）

每次导航按序执行：`#destroyManager`（manager.destroy：递增
`#translationSessionId`、abort、移除监听与 DOM；侧栏销毁；恢复原生字幕显示）→
`clearMsgHistory(apiSlug)` → 清空 `#subtitles/#events/#rawSubtitleEvents/#flatEvents` →
`#progressed=0` → `#fromLang="auto"` → `#docInfo`/`#fullDescription` 清空 →
`#processingId=null` → **`#processingVersion += 1`** → `#activeTrackKey=null` →
`#aiChunkScheduler=null` → abort controller 复位 → `autoTranslate` 回落
`#defaultAutoTranslate` → 菜单刷新。

**只监听 `yt-navigate-finish`，不监听 `yt-navigate-start`**——重置发生在新视频页
就绪后，晚到的字幕轨仍有增量回调入口。

## 3. Kisu 挂接点（presentation seam）

| Seam | 机制 | 状态 |
| --- | --- | --- |
| 运行时**读** | KP-001 `getYouTubeCaptionStatus()`（冻结快照：videoId/mounted/autoTranslate/progressed/processing/activeTrackKey/fromLang；未初始化 null） | active（PR #8）；KCL `readSubtitleRuntime` 消费 |
| 设置**写** | 无实时通道——`updateSetting` 六字段上游自用；apiSlug/toLang/enabled 仅启动读取 | KCL 命令 next-load（PR #10）；实时化需 KP-002 + D3 |
| 控件挂载 | `youtubePlayerUi.injectToggleButton`（上游按钮/菜单）；Kisu 控制挂载属 MVP-39（INH-1180）——**subtitle disabled 时也须挂载** | 待做 |
| provider 资格 | `API_SPE_TYPES.ai` + transApis（KCL #9 capability 四态已上游化上游缺失的校验） | active |

## 4. TRACK 保护模块（read through KCL，never edit）

`src/subtitle/*` 全部（除 KP-001 已登记的只读访问器增量）、`src/injectors/*`、
`src/injector-subtitle.js`、`apis/index.js` 的 `apiSubtitle`/`apiTranslate`、
`libs/batchQueue.js`。字幕菜单/播放器 UI（`youtubePlayerUi.js`/`Menus.js`）同为
TRACK；Kisu 控件必须**并行挂载**而非改写（D5 同款结论适用于播放器域）。

## 5. Stale state 风险点（control-paths 记录 + 保留）

| 风险 | 位置 | 现状 |
| --- | --- | --- |
| in-flight race | `#isStaleProcessing` 仅 await 后检查；`youtubeAiSegmentation` 自注切视频后 in-flight 仍执行 | 上游已知，未修 |
| seek race | seek 不递增 `#translationSessionId` 不 abort，结果可写错位置（`BilingualSubtitleManager` 自注） | 上游已知，未修 |
| 控制栏 observer 重绑 | `#observeYtSubtitleState` 只在一次性 waitForElement 回调触发；SPA 重建控制栏后重绑未证实 | control-paths Unconfirmed #1 |
| 晚到字幕 | `#startManager` 无字幕即返回，靠增量回调 (:760-763) 后启动 | 上游机制，MVP-45 SPA 回归覆盖 |
| observability | 闭包单例无公共 API（KP-001 已补只读口） | 已缓解（读侧） |

**Kisu 含义**：MVP-39 控件不得依赖上述任何未证实行为；状态一律经 KP-001 快照 +
轮询（readSubtitleRuntime），不在 provider 外部维护第二份字幕状态。

## 6. 硬约束（不得越过的语义线）

1. **显示模式**：无单一枚举——`isBilingual × displayOrder` 组合（KCL #9 已按组合投影）。
2. **context 语义**：仅 `aiContextSlug`（视频摘要进字幕 system prompt）与
   `useContext`（翻译会话历史，另一机制）——不得营销化为 "Contextual AI" 保证；
   <200 字符 transcript 不启用。
3. **AI 断句资格**：上游不硬校验 segSlug（机器翻译 slug 静默回退）——KCL 已补校验。
4. **provider 启动快照**：`subtitle.js:46` 启动时解析一次 → 运行时改 provider 无效果
   （next-load 语义的根源）。
