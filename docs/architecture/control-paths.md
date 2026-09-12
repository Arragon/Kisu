# Control paths

Authority: `KISU-ROADMAP-v2.md` P0-T05. This is the gating artefact for P1: every later KCL
task must be able to name the exact existing upstream mechanism it wraps.

Baseline traced: **KISS v2.0.32 (`7dfc03eb`)**. All line references are against that commit.

Every path below uses the same structure: entry files, state/settings fields, key
functions, message/event boundaries, likely KCL seam, TRACK-protected files.

---

# Path 1 — Popup / full-page translation

## Entry files

`src/popup.js` → `src/views/Popup/index.js` → `src/views/Popup/PopupCont.js`, `Header.js`
Communication: `src/libs/msg.js` (`sendTabMsg:41`), constants `src/config/msg.js`
Background: `src/background.js`
Content: `src/content.js` → `src/common.js` (`run():234`) → `src/libs/translatorManager.js`
→ `src/libs/translator.js`
Rules/storage: `src/libs/rules.js`, `src/libs/storage.js`, `src/libs/blacklist.js`, `src/libs/batchQueue.js`
Schema: `src/config/rules.js`, `src/config/setting.js`, `src/config/storage.js`, `src/config/api.js`
React state: `src/hooks/Setting.js`, `src/hooks/Storage.js`, `src/hooks/Rules.js`
Request: `src/apis/index.js:627` `apiTranslate`
In-page popup: `src/views/Action/index.js`

## Trigger

`handleTransToggle` (`PopupCont.js:109`), bound to the bilingual toggle switch at
`PopupCont.js:331`. Siblings: `handleChange:185`, `handleSaveRule:211`,
`handleAddToBlacklist:81`. Keyboard shortcuts, context menu and touch fire the same message
(`background.js:600`, `translatorManager.js:523`, `:588`).

## State and settings fields

Per-page rule object, defined `src/config/rules.js:66`, defaults `GLOBLA_RULE:119`:

| Field | Line | Notes |
| --- | --- | --- |
| `transOpen` | `rules.js:80` | whether translation is on |
| `transOnly` | `rules.js:91` | `"true" \| "false" \| "*"`, validated at `:361` |
| `transOrder` | `rules.js:94` | `"original-first" \| "translation-first"` |
| `transOnlyRevert` | `rules.js:92` | |
| `apiSlug` | `rules.js:74` | page provider, default `"*"` (GLOBAL_KEY) |
| `fromLang` / `toLang` | | |
| `textStyle`, `autoScan`, `hasRichText`, `scanAll`, `isPlainText` | | |

Global settings, `src/config/setting.js:239`: `transApis:262`, `blacklist:271`,
`minLength:245`, `rootMargin:284`, `shortcuts:266`, `mouseHoverSetting:279`,
`inputRule:267`, `tranboxSetting:268`.

Persistence keys `STOKEY_SETTING` (`storage.js:20`) and `STOKEY_RULES:22`, accessed through
`useStorage` (`src/hooks/Storage.js:50`). Popup state arrives via `MSG_TRANS_GETRULE`
(`src/views/Popup/index.js:191`) and is kept in memory with optimistic local updates.

## Message and event boundaries

Messages (`src/config/msg.js`): `MSG_TRANS_GETRULE:25` (read state), `MSG_TRANS_TOGGLE:21`,
`MSG_TRANS_PUTRULE:26` (runtime rule change), `MSG_SAVE_RULE:20` (persist), `MSG_UPDATE_ICON:45`.

Routing: `TranslatorManager.#handleBrowserMessage` (`translatorManager.js:572`) →
`#processActions:654`. `MSG_TRANS_GETRULE` breaks out at `:674`, so the handler falls back to
returning `{rule, setting}` at `:575-577`. Unknown actions return `{error}` at `:708`.
`sendTabMsg` silently swallows "connection not established" (`msg.js:51`).

> `MSG_TRANS_CURRULE:27` is defined but has no sender or consumer in production code. Treat
> as dead. Do not build on it.

Events: `EVENT_KISS_INNER` (`msg.js:49`) for in-page CustomEvents, dispatched by
`PopupManager.toggle` (`libs/popupManager.js:33`), listened to by `views/Action/index.js:56`.
Userscript/iframe paths use `window.postMessage` (`translatorManager.js:501`, `:566`).

## Key functions

| Function | Location |
| --- | --- |
| `Translator.toggle()` | `translator.js:3943` |
| `Translator.enable()` / `disable()` | `translator.js:3871` / `:3910` |
| `Translator.rescan()` / `stop()` | `translator.js:3929` / `:3978` |
| `Translator.updateRule()` | `translator.js:3995` |
| `Translator.toggleTransOnly()` | `translator.js:3947` |
| `TranslatorManager.#processActions` | `translatorManager.js:654` |
| `matchRule()` / `mergeRules()` / `saveRule()` | `libs/rules.js:191` / `:103` / `:404` |
| `run()` | `common.js:234` (`matchRule:294`, `new TranslatorManager:307`, `start():316`) |
| DOM write | `#processNode:1645` → `#translateNodeGroup:2335` → `#translateFetch:3137` |
| stream flush | `translator.js:2368`, `:2435` |

Provider resolution: `rule.apiSlug` → `Translator.#apiSetting` getter (`translator.js:755-762`),
backed by `#apisMap` built from `setting.transApis` (`:861`), dispatched in
`apiTranslate` (`apis/index.js:648`).

> **Trap:** `updateRule({apiSlug})` changes runtime state only and does **not** persist.
> Persistence requires a separate `MSG_SAVE_RULE` (`PopupCont.js:220`). Any KCL provider
> setter must handle both, following `saveRule`'s default-stripping and merge semantics.

## Status and progress

There is no percentage progress. Page state is expressed solely by `rule.transOpen`
(`translator.js:3874`, `:3913`), pulled once when the Popup opens. The toolbar icon is
updated via `MSG_UPDATE_ICON` (`translator.js:3891`, `:3925`, `background.js:578`).
Paragraph-level streaming (`translator.js:2450`, `batchQueue.js:103`) never reaches the
Popup. Errors go to `kissLog` and a page-top banner via `showErr` (`common.js:87`, `:332`).

**Consequence:** a Kisu surface cannot observe state changed elsewhere. No subscription exists.

## Display mode

Composed from three independent fields — there is no single display-mode value:

- `transOnly` (`rules.js:91`), applied as `hideOrigin = transOnly === "true"` at
  `translator.js:2359`, toggled at `:3432`
- `transOrder` (`rules.js:94`)
- `transOpen` (`rules.js:80`)

## Site rules

Owned by `src/libs/rules.js`. Precedence: personal > subscribed > global
(`matchRule:191-239`). Auto-enable is driven by `transOpen` (`translator.js:919`).
Blocking is owned by `src/libs/blacklist.js:19`, enforced at `common.js:271`, `:281`,
`:285`, `:289` (page / selection / input box / hover).

There is no single-page site preference API. Reading the raw per-site rule requires reading
`STOKEY_RULES` directly; the existing message returns only the merged rule for the current page.

---

# Path 2 — Selection / dictionary

## Entry files

Overlay bootstrap: `src/libs/tranbox.js` (`TransboxManager`)
React root: `src/views/Selection/index.js` (`handleOpenTranbox:110-113`)
Controller: `src/hooks/useSelectionController.js`
State: `useTranBoxState.js`, `useTranboxShortcuts.js`, `useAutoHideTranBtn.js`, `src/libs/tranboxPosition.js`
Surfaces: `TranBox.js` (shell, `:42-342`; `SettingProvider context="tranbox"` `:451`),
`TranForm.js`, `TranCont.js`, `DictCont.js`, `DictHandler.js`, `AiDictCont.js`, `Zdic.js`,
`SugCont.js`, `TranBtn.js`, `CopyBtn.js`, `AudioBtn.js`, `FavBtn.js`, `DraggableResizable.js`
Requests: `src/apis/index.js`, `src/apis/trans.js`, `src/apis/zdic.js`
Settings: `src/config/setting.js` (`tranboxSetting:124-153`, `mouseHoverSetting:228-236`)
Wiring: `translatorManager.js:239`, `:603`, `:689`; `background.js:606`, `:643`
Siblings: `src/subtitle/wordHover.js`, `favoriteWords.js`, `src/libs/inputTranslate.js`

## Trigger modes

| Mode | Config field | Handler |
| --- | --- | --- |
| floating button click | `triggerMode="click"` `setting.js:97` | `btnEvent="onMouseUp"` `useSelectionController.js:484-491` |
| floating button hover | `triggerMode="hover"` `setting.js:98` | `useSelectionController.js:487-489` |
| translate on select | `triggerMode="select"` `setting.js:99` | `processSelectionSnapshot` → `commitSelectionSnapshot` `:356-362` |
| double-click word | `triggerMode="dblclick"` `setting.js:100` | listener `:497-499` |
| in-panel selection | `tranboxInteractMode` `setting.js:145`, `:114-115` | `handleInteract:528-559` |
| keyboard shortcut | `tranboxShortcut` `setting.js:116`, `:133` | `shortcutRegister` `translatorManager.js:603-605` |
| command / context menu | `contextMenuType` `setting.js:256` | `background.js:606`, `:643` → `MSG_OPEN_TRANBOX` → `translatorManager.js:679-685` |
| userscript GM menu | `contextMenuType !== 0` | `useTranboxShortcuts.js:60-68` |
| input-box translate | `inputRule.transSign` `setting.js:78-89` | `InputTranslator` `inputTranslate.js:547`, `:610` |

Suppressed when `hideTranBtn=true` (`useSelectionController.js:364-367`) or when
`isPureNumberText` / `skipLangs` match (`:305-326`). Auto-hide on right-click or collapsed
selection: `useAutoHideTranBtn.js:20-33`.

## State and settings fields

`tranboxSetting` (`setting.js:124-153`): `transOpen`, `apiSlugs`, `singleWordNoTrans`,
`fromLang`, `toLang`, `toLang2`, `hideTranBtn`, `hideClickAway`, `simpleStyle`,
`followSelection`, `autoHeight`, `triggerMode`, `btnPositionMode`, `btnOffsetX/Y`,
`boxOffsetX/Y`, `tranboxInteractMode`, `skipLangs`, `enDict`, `enSug`, `aiDictApiSlug`,
`aiDictPromptSlug`, `autoFavWord`.

Runtime: `useTranBoxState.js:78-88` (`boxSize`, `boxPosition`, `simpleStyle`,
`hideClickAway`, `followSelection`) and `useSelectionController.js:239-246` (`showBox`,
`showBtn`, `selectedText`, `text`, `textContext`, `position`). Debounced persistence at
`useTranBoxState.js:132-139`.

## Decision logic — the important part

The choice between dictionary, plain translation and AI dictionary is made **inline at
render time inside an unexported component**:

- `isWord = isValidWord(text)` — `TranForm.js:179`
- `defaultDictAvailable = (isWord && OPT_DICT_MAP.has(enDict)) || isSingleChineseChar(text)` — `:189-190`
- `aiDictApiSetting` constructed from `aiDictApiSlug` + `aiDictPromptSlug`, requires
  `dictPrompt` when `follow_api` — `:191-218`
- `aiDictAvailable` — `:219`
- default tab selection — `:221-235`
- UI branch, tabs only when both are available — `:519-579`
- `singleWordNoTrans` forcing `realApiSlugs=[]` — `TranBox.js:442-447`

No provider-type branching occurs beyond the AI-capability check (`apiDict`,
`apis/index.js:871-873`).

## Provider resolution

Selection provider is `tranboxSetting.apiSlugs` — a **multi-select array**
(`setting.js:127`), not a single slug. It is resolved only by lookup inside `TranCont`
(`transApis.find(a => a.apiSlug === apiSlug)` `TranCont.js:121-124`), and it is independent
of page-level `rule.apiSlug` and of `mouseHoverSetting.apiSlug` / `subtitleSetting.apiSlug`
(`setting.js:234`, `:173`).

Prompt enrichment happens once in `libs/tranbox.js:12-21` via `resolveApiPromptList`
(`config/prompt.js:1026`).

## Request path

- plain translation: `TranCont.js:168-179` → `apiTranslate` `apis/index.js:627` →
  `handleTranslate` `apis/trans.js:1916` (batch queue `:740`); streaming via
  `onStreamChunk` `TranCont.js:144-160`
- default dictionary: `DictCont.js:24` `useAsyncNow(dict.apiFn, text)` → `DictHandler.js:13`
  `apiMicrosoftDict` (`apis/index.js:256`) / `:127` `apiYoudaoDict` (`:469`)
- single Chinese character: `Zdic.js:31` → `apiZdic` `apis/zdic.js:129`
- AI dictionary: `AiDictCont.js:86` → `apiDict` `apis/index.js:852` → `handleDict`
  `apis/trans.js:1756`
- suggestions: `SugCont.js:15`, `:48` → `apiBaiduSuggest` `apis/index.js:410` /
  `apiYoudaoSuggest:436`

## Result surface ownership

`TranBox` owns the shell and header. `TranForm` owns layout and state (tabs, language
selects, text field, `editMode`, `dictTab`). `TranCont` owns one provider's
loading/error/streaming (`:116-118`, `:162-205`). `DictCont` owns word/phonetic/actions
(`:70-106`); `DictHandler` owns per-dictionary rendering. `CopyBtn`
(`navigator.clipboard.writeText:20`), `AudioBtn`/`BaiduAudioBtn`/`BrowserTtsBtn`
(`speech.js`), `FavBtn` (`EVENT_FAVORITE_WORD_CHANGE:32-36`).

## Overlay geometry

Follow-selection positioning `getFollowBoxPosition` flips above when the box would
overflow, clamped by `getMaxTranBoxX/Y` (`useSelectionController.js:174-187`). Button
anchor `getPointerButtonPosition:54-93` flips near viewport edges. The box is
`position:fixed`, 3×3 grid with 8 resize grips plus header drag
(`DraggableResizable.js:262-432`); clamped on move `:134-143` and resize
(`useTranBoxState.js:21-35`); `autoHeight` via `ResizeObserver`
(`DraggableResizable.js:222-239`).

> `tranboxPosition.js:2-4` reserves 16px side grips and 52px chrome because grips sit
> outside the content box. This is why clamp values differ from content size. Do not
> "simplify" it without understanding that.

## Isolation

`TransboxManager.enable` creates the container and attaches
`attachShadow({mode:"open"})` (`libs/tranbox.js:46-53`), with an Emotion cache scoped to the
shadow root (`:55-59`). z-index `2147483647` (`TranBtn.js:33`, `DraggableResizable.js:275`).

> **Exception:** `TranBtn` and the `wordHover.js` AI dictionary bubble are appended to
> `document.body` / `head` and are **not** ShadowRoot-isolated (`TranBtn.js:62`,
> `wordHover.js:124`, `:251`). `TranBtn` uses `position:absolute`, so a host
> `position:relative` or `transform` breaks it — upstream's own review notes this at
> `TranBtn.js:36`.

---

# Path 3 — YouTube subtitles

## Entry files

`src/content.js:1` → `src/common.js:324` `runSubtitle` → `src/subtitle/subtitle.js:24`
Provider orchestration: `src/subtitle/YouTubeCaptionProvider.js`
Injection: `src/injector-subtitle.js:4` → `src/injectors/xmlhttp.js:12`; `src/injectors/index.js:26` `injectJs`, `:9` `INJECTOR.subtitle`
Discovery: `src/subtitle/youtubeCaptionTracks.js`
Processing: `youtubeSubtitleProcessing.js`, `youtubeAiSegmentation.js`, `sentenceBreaker.js`
Render/translation: `BilingualSubtitleManager.js`, `YouTubeSubtitleList.js`, `youtubePlayerUi.js`, `Menus.js`
Translation entry: `apis/index.js:944` `apiSubtitle`, `:627` `apiTranslate`; `apis/trans.js:2192` `handleSubtitle`; `libs/batchQueue.js`
Config: `config/setting.js:171`, `config/api.js:129`

## Lifecycle

| Stage | Owner | Location |
| --- | --- | --- |
| SPA navigation | `yt-navigate-finish` listener | `YouTubeCaptionProvider.js:158` |
| inject XHR interceptor | `runSubtitle` → `injectJs` | `subtitle.js:41`, `injectors/xmlhttp.js:12` |
| mount button/menu | `waitForElement` → `injectToggleButton` | `YouTubeCaptionProvider.js:182`, `youtubePlayerUi.js:89` |
| intercepted caption response | `postMessage` → `#handleInterceptedRequest` | `xmlhttp.js:19`, `YouTubeCaptionProvider.js:149`, `:487` |
| track discovery | `getCaptionTracks` / `findCaptionTrack` | `youtubeCaptionTracks.js:174`, `:79` |
| caption acquisition | `getSubtitleEvents` | `youtubeCaptionTracks.js:203` |
| clean / flatten | `prepareTimedTextEvents` | `youtubeSubtitleProcessing.js:58` |
| segmentation | `eventsToSubtitles` | `youtubeAiSegmentation.js:276` |
| translation queue | `#translateAndStore` → `apiTranslate` | `BilingualSubtitleManager.js:628`, `apis/index.js:627` |
| render | `#startManager` → `start` → `#updateCaptionDisplay` | `YouTubeCaptionProvider.js:917`, `BilingualSubtitleManager.js:81`, `:503` |
| user control | `Menus` → `updateSetting` | `Menus.js:244`, `YouTubeCaptionProvider.js:320` |

## Mount and teardown

Duplicate protection: `YouTubeInitializer` `initialized` guard
(`YouTubeCaptionProvider.js:1020-1031`), button guard `youtubePlayerUi.js:93`, manager guard
`YouTubeCaptionProvider.js:922`.

SPA reaction: listens **only** to `yt-navigate-finish` (`:158`), which resets fields,
increments `#processingVersion` and calls `abort()` (`:161-179`). It does **not** listen to
`yt-navigate-start`.

Teardown: `#destroyManager:993` → `BilingualSubtitleManager.destroy:96` (increments
`#translationSessionId`, `abort()`, removes listeners and DOM); `removeToggleButton`
(`youtubePlayerUi.js:145`).

Known weaknesses, several acknowledged in upstream's own review comments:

- **in-flight race** — `#isStaleProcessing:474` only checks after `await`;
  `youtubeAiSegmentation.js:624-625` explicitly admits in-flight requests still execute
  after a video switch
- **seek race** — `BilingualSubtitleManager.js:617-624` admits that seeking does not
  increment `#translationSessionId` and does not abort, so results can be written back to
  the wrong position
- **stale observer** — `#observeYtSubtitleState:205` is only invoked from a one-shot
  `waitForElement` callback; rebinding after SPA reconstruction of the control bar is
  **unverified**
- **late captions** — `#startManager:930` returns with a notice when no captions exist yet,
  relying on an incremental callback (`:760-763`) to start later

## Caption discovery and acquisition — the fragile part

Discovery `fetchCaptionTracks` (`youtubeCaptionTracks.js:149`) fetches the watch page and
regex-extracts `ytInitialPlayerResponse` (`:153`), then reads
`captions.playerCaptionsTracklistRenderer.captionTracks` (`:157`) plus
`videoDetails.shortDescription`.

Acquisition intercepts the `timedtext` XHR (`xmlhttp.js:12`). For a matching track it
`JSON.parse(responseText).events` directly; otherwise it rewrites URL parameters and
re-fetches json3 (`youtubeCaptionTracks.js:203-231`), **mutating the passed
`potUrl.searchParams` in place** (`:219`).

Upstream dependencies that would break this: the XHR hijack (it does not hook `fetch` —
`xmlhttp.js:16` warns about this), the inline `ytInitialPlayerResponse` JSON shape, and
timedtext URL parameters (`v`, `lang`, `kind`, `name`, `tlang`).

## Segmentation

Default entry `builtinSegment` (`youtubeSubtitleProcessing.js:439`). With
`useAlgorithmBreaker:"rule"` → `formatSubtitles:312` / `processSubtitles:184`; with
`"statistical"` → `algorithmicSegment:414` → `intelligentSentenceBreak`
(`sentenceBreaker.js:820`). AI failure always falls back here.

AI path: `eventsToSubtitles` decides `useAiSegmentation = segSlug && segSlug !== "-" &&
segApiSetting` (`youtubeAiSegmentation.js:297`), chunks via `splitEventsIntoChunks`
(`youtubeSubtitleProcessing.js:489`), then `aiSegment:130` → `apiSubtitle` →
`handleSubtitle`. The first chunk is rendered first; the rest load lazily through
`createAiChunkScheduler:410` keyed to the playback window.

> **Capability note:** `aiSegment` depends on the `apiSubtitle` AI prompt protocol, so it
> effectively requires the provider to be in `API_SPE_TYPES.ai`. But `eventsToSubtitles`
> performs **no hard validation** of this — only the menu filters to AI providers
> (`Menus.js:267`) keeps it honest. A machine-translation slug passed in will throw and
> fall back, not fail loudly. Any KCL capability check must therefore do the validation
> upstream does not.

## Translation

`#translateAndStore` (`BilingualSubtitleManager.js:628`) calls `apiTranslate`
(`apis/index.js:627`) per unit, triggered within a look-ahead window `preTrans` (default
90s, `:581`), throttled by `throttleTrans` (`:55`). Batch queueing engages when `apiType`
supports `API_SPE_TYPES.batch` and `useBatchFetch` is set (`apis/index.js:733`); the queue
key includes apiSlug, languages, prompt signature and concurrency. Streaming via
`onStreamChunk:685`.

Caches: `URL_CACHE_SUBTITLE` (`apis/index.js:1002`, AI segmentation), `URL_CACHE_TRAN:678`,
`URL_CACHE_CONTEXT:1040`.

Result matching: AI segmentation relies on `_si`/`_ei` and `_alignedSi`/`_alignedEi`
indexes (`youtubeAiSegmentation.js:15-62`); results are written back onto the subtitle
object (`BilingualSubtitleManager.js:640`); the provider upserts by `start:end` key
(`YouTubeCaptionProvider.js:716-743`).

Subtitle provider: `subtitleSetting.apiSlug`, resolved to `apiSetting` once at startup
(`subtitle.js:46`). Target language: `subtitleSetting.toLang` (`:543`).

## Settings

`subtitleSetting` (`setting.js:171`):

| Field | Values | Default |
| --- | --- | --- |
| `enabled` | bool | `true` |
| `apiSlug` | API slug | `"Microsoft"` |
| `toLang` | language code | `"zh-CN"` |
| `segSlug` | `"-"` or AI apiSlug | `"-"` |
| `aiContextSlug` | `"-"` or AI apiSlug | `"-"` |
| `autoTranslate` | bool | `true` |
| `isBilingual` | bool | `true` |
| `displayOrder` | `"original-first"` \| `"translation-first"` | `"original-first"` |
| `blurTranslation` | bool | `false` |
| `useAlgorithmBreaker` | `"rule"` \| `"statistical"` | `"rule"` |
| `showList` / `hoverLookupMode` | `"on"` \| `"off"` \| `"mobile_off"` | `"mobile_off"` |
| `chunkLength` / `longSentenceThreshold` / `preTrans` / `throttleTrans` | number | 1000 / 100 / 90 / 30 |
| `forceSubtitleRetranslate` | bool | `false` |

## Display modes — do not invent an enum

There is **no** single `displayMode` field in `subtitleSetting` (the only `displayMode`
upstream belongs to `mouseHoverSetting`). Bilingual display is the composition of two
fields:

- translated-only vs bilingual: `isBilingual` (`BilingualSubtitleManager.js:543`)
- order: `displayOrder` (`:545`)

A Kisu `setSubtitleDisplayMode()` must therefore map onto a legal pair of these two values.
A single-enum product vocabulary such as "original / bilingual / translated" cannot be
represented without inventing semantics upstream does not have.

## Context and AI capability — do not overpromise

`aiContextSlug` drives `#enrichDocInfoWithAI` (`YouTubeCaptionProvider.js:819`) →
`apiSummarizeContext` (`apis/index.js:1032`), which produces `docInfo.summary` that is
injected into the subtitle system prompt (`apis/trans.js:199-223`).

Hard constraints (`YouTubeCaptionProvider.js:822-829`): `aiContextSlug` must not be `"-"`,
must resolve within `transApis`, and the resolved `apiType` must satisfy
`API_SPE_TYPES.ai.has(apiType)`. Transcripts under 200 characters do not enable it (`:837`).

A **different** mechanism also called "context": `apiSetting.useContext` with
`API_SPE_TYPES.context` (`apis/trans.js:1946`) is translation **session history**, unrelated
to the subtitle `aiContextSlug`. Do not conflate them.

Conclusion: upstream can only guarantee "video summary context" and "AI segmentation",
via `aiContextSlug` and `segSlug`. Availability can be *derived* from `setting.transApis` +
`API_SPE_TYPES.ai/context` + `segSlug`, but the provider holds a startup snapshot and there
is no live capability registry. Kisu must not ship a product label such as "Contextual AI"
as a guarantee.

## Status and errors

Progress: `#progressed` (`YouTubeCaptionProvider.js:127`). Notifications: `showNotification`
with i18n keys `starting_to_process_subtitle`, `subtitle_load_failed`,
`subtitle_load_succeed`, `waitting_for_subtitle`, `subtitle_same_lang`,
`ai_processing_pls_wait`, `ai_context_analyzing` (`config/i18n.js:5060-5420`). Failure
marker: `subtitle.translation = "[Translation failed]"` (`BilingualSubtitleManager.js:701`),
plus `isTranslating` and `_isDraftTranslation`.

> **Observability is effectively nil.** The provider is a closure singleton
> (`:1020-1031`) never attached to `window` or `globalThis`, with no public API. Kisu cannot
> read subtitle state at all from outside. See KP-001.

---

# Cross-cutting findings

## 1. Upstream exposes almost no intent-level API

The three paths fail the "clean wrap" test in three different ways:

| Path | Obstruction | Nature |
| --- | --- | --- |
| Page | The mechanism exists but the semantics are wrong | `toggle()` is non-idempotent; state is pull-only with no subscription |
| Selection | The decision logic is inline and unexported | word-vs-sentence and dictionary-vs-translation live inside `TranForm.js` render |
| Subtitle | The subsystem is entirely private | closure singleton, no handle, three of seven intents unreachable |

This is the single most important input to P1. The architecture's assumption that KCL can
"use existing KISS hooks/events/settings whenever possible" (section 7.3) **holds for the
page path and only partially elsewhere**. The subtitle path requires upstream changes before
KCL can be truthful.

## 2. Consequence for P1

- Page KCL read intents: implementable now, zero upstream change.
- Page KCL write intents: implementable only via read-modify-write composition (KP-003) or
  an upstream change.
- Selection KCL: implementable for reads and for dictionary/translate *execution*, but the
  capability decision layer must be reimplemented by Kisu — which risks duplicating logic
  the architecture forbids copying. This needs an L4 decision before P1-T05.
- Subtitle KCL: **blocked** without KP-001 and KP-002. P1-T06 and P1-T07 cannot start as
  written.

## 3. Watch item

Upstream `dev` is unifying the UI to Material 3 (`226e5780`, unreleased as of 2026-09-13).
That touches `src/views/*` — the very surfaces the architecture keeps as legacy fallback.
Re-evaluate section 12 of the architecture when it reaches a stable release.

---

# Unconfirmed items

Recorded deliberately. Do not treat these as settled.

1. Whether the subtitle control-bar observer and button rebind correctly after an SPA
   navigation rebuilds the control bar (`#observeYtSubtitleState:205`).
2. The exact failure mode of `aiSegment` when given a non-AI provider slug.
3. Whether `MSG_TRANS_CURRULE:27` is genuinely dead or reachable from a build variant not
   inspected.
4. The live update channel (if any) for `tranboxSetting` while the box is mounted —
   `useTranBoxState.js:40-44` explicitly notes state does not re-sync.
5. Whether remote-tracking refs persist in a normal (non-sandboxed) git environment. See
   `docs/upstream/sync-procedure.md`.

Each needs real-browser verification before a KCL contract depends on it.

---

# TRACK-protected files — read through KCL, never edit from product code

```text
src/apis/*                                  src/config/{api,setting,rules,msg,storage,client}.js
src/libs/{translator,translatorManager,rules,storage,blacklist,msg,batchQueue,domManager,popupManager,tranbox,tranboxPosition}.js
src/subtitle/*                              src/injectors/*        src/injector-subtitle.js
src/{background,common,content}.js          src/views/Action/index.js
src/hooks/{Setting,Storage,Rules,useSelectionController,useTranBoxState,useTranboxShortcuts,useAutoHideTranBtn}.js
src/views/Popup/*                           src/views/Selection/*
```
