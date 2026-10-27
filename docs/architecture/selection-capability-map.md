# Selection capability map（MVP-26 / INH-1167）

- Authority：`docs/architecture/control-paths.md` Path 2（v2.0.32 `7dfc03eb` 精确行号）。
  **行号漂移警示**：`next` 上的 EU-004 修改了 `TranForm.js`/`TranCont.js`，相关行号在
  next 上近似；一律按符号重定位。
- 性质：只读盘点，不改代码。逐项给出上游实现与 Kisu 处置建议，供 D5
  （并行 overlay vs 窄 renderer hook）拍板。
- 处置词汇：**REUSE** = 经 KCL 复用上游机制（KCL 已有 #7 Selection 接口）；
  **RE-PRESENT** = Kisu surface 用 primitives 重呈现（消费 view-model）；
  **HIDE** = 不暴露为产品能力；**OWN-DECISION** = 决策逻辑上游内联不可复用、
  Kisu 重推导（受 ADR-015 边界约束，禁止照抄）。

## 1. Trigger（划词触发）

| 能力 | 上游实现 | Kisu 处置（建议） | 依据 |
| --- | --- | --- | --- |
| 浮动按钮点击 | `useSelectionController.js:484-491`（btnEvent onMouseUp） | REUSE | trigger 生命周期含选区快照/抑制/自动隐藏逻辑，重写即分叉；D5 前提 |
| 浮动按钮悬停 | 同上 :487-489 | REUSE | 同上 |
| 选中即译 | `processSelectionSnapshot → commitSelectionSnapshot` :356-362 | REUSE | 同上 |
| 双击取词 | listener :497-499 | REUSE | 同上 |
| 面板内选中重译 | `tranboxInteractMode`，`handleInteract` :528-559 | REUSE（语义）/ RE-PRESENT（控件） | 交互语义属上游，呈现归 Kisu |
| 快捷键 | `tranboxShortcut`，`shortcutRegister` `translatorManager.js:603-605` | REUSE | 同一注册器服务两套 UI |
| 右键菜单/命令 | `contextMenuType`，`background.js:606/:643` → MSG_OPEN_TRANBOX | REUSE | 后台通道与 UI 无关 |
| 输入框翻译 | `inputRule.transSign`，`InputTranslator` `inputTranslate.js:547/:610` | HIDE（V0.1） | MVP-26..35 范围外；保留上游可达性 |
| 油猴 GM 菜单 | `useTranboxShortcuts.js:60-68` | HIDE（V0.1） | 同上 |

**抑制规则**（REUSE，不改）：`hideTranBtn` :364-367、纯数字/`skipLangs` :305-326、
右键/收起选区自动隐藏 `useAutoHideTranBtn.js:20-33`。

## 2. 浮动按钮（TranBtn）

- 上游：`TranBtn.js`（z-index 2147483647，`position:absolute`）；**非 ShadowRoot
  隔离**（挂 body/head，`TranBtn.js:62`）；宿主 `position:relative`/`transform`
  会破坏定位（上游自注 :36）。
- Kisu 处置（建议）：**REUSE 生命周期、RE-PRESENT 视觉**——按钮渲染面可换 Kisu
  primitives，但挂载/定位/抑制逻辑不动。非隔离例外是 P4-T09 hostile-page 验收的
  重点测试对象。

## 3. 决策层（词条 vs 句子 vs 词典 vs AI 词典）

- 上游：**全部内联在 `TranForm.js` 渲染期**——`isWord=isValidWord` :179、
  `defaultDictAvailable` :189-190、`aiDictApiSetting` :191-218、`aiDictAvailable`
  :219、默认 tab :221-235、tabs 渲染 :519-579；`singleWordNoTrans` 强制空
  apiSlugs 在 `TranBox.js:442-447`。
- Kisu 处置：**OWN-DECISION**——MVP-27（INH-1168）以可解释启发式重建轻量分类器
  （词条/句子/长文本/不支持），**禁止照抄 TranForm**（架构禁复制 + 该逻辑 EU-004
  已动过，逐行复刻会把 carried patch 语义焊死进 Kisu）。ADR-015 在该卡定稿。

## 4. 翻译与词典执行

| 能力 | 上游实现 | Kisu 处置（建议） |
| --- | --- | --- |
| 划词翻译 | `TranCont.js:168-179` → `apiTranslate`（apis/index.js:627）→ `handleTranslate`（trans.js:1916，batch :740）；流式 `onStreamChunk` :144-160 | REUSE（KCL `translateSelection` runner 绑定，#7 已定） |
| 默认词典 | `DictCont.js:24` → `apiMicrosoftDict` :256 / `apiYoudaoDict` :469（DictHandler 分发） | REUSE 同上（`lookupSelection`） |
| 单汉字（Zdic） | `Zdic.js:31` → `apiZdic`（apis/zdic.js:129） | REUSE |
| AI 词典 | `AiDictCont.js:86` → `apiDict` :852 → `handleDict`（trans.js:1756） | REUSE；AI provider 资格由 KCL capability（#9/#6 模式）上游化校验 |
| 联想建议 | `SugCont.js:15/:48` → `apiBaiduSuggest` :410 / `apiYoudaoSuggest` :436 | HIDE（V0.1，非 MVP 面） |
| Prompt 富化 | `libs/tranbox.js:12-21` `resolveApiPromptList`（config/prompt.js:1026） | REUSE（请求构造复用上游） |

## 5. Provider

- 上游：`tranboxSetting.apiSlugs` **多选数组**（setting.js:127），独立于 page
  `rule.apiSlug` 与 hover/subtitle；仅在 `TranCont.js:121-124` 查找解析。
- Kisu 处置：REUSE——KCL `getSelectionProviders`/`setSelectionProviders`（#7）
  已投影多选 + 失效引用 `missing`；picker 重呈现（复用 MVP-21 形状）。

## 6. 结果面与动作

| 能力 | 上游实现 | Kisu 处置（建议） |
| --- | --- | --- |
| 面板壳/语言选择/编辑 | `TranBox`（:42-342）/ `TranForm` | RE-PRESENT（Kisu surface + primitives；view-model 消费） |
| 单服务结果/流式 | `TranCont` :116-118/:162-205 | RE-PRESENT（streaming 有界区域，MVP-31 验收） |
| 词条结果 | `DictCont` :70-106、`DictHandler` | RE-PRESENT（MVP-30） |
| 复制 | `CopyBtn`（clipboard.writeText:20） | RE-PRESENT（原生 clipboard API） |
| 发音 | `AudioBtn`/`BaiduAudioBtn`/`BrowserTtsBtn`（speech.js） | RE-PRESENT（speechSynthesis 优先，百度音频按需） |
| 收藏 | `FavBtn`（EVENT_FAVORITE_WORD_CHANGE :32-36） | REUSE 事件语义 + RE-PRESENT 入口 |

## 7. Overlay 几何与容器

| 能力 | 上游实现 | Kisu 处置（建议） |
| --- | --- | --- |
| 跟随选区定位 | `getFollowBoxPosition`（翻转/钳制，`useSelectionController.js:174-187`） | REUSE 语义 / RE-PRESENT 定位实现——**几何适配器（MVP-29/INH-1170）须单测覆盖翻转与钳制** |
| 按钮锚定 | `getPointerButtonPosition` :54-93（边缘翻转） | 同上 |
| 拖拽/缩放 | `DraggableResizable.js:262-432`（3×3 手柄，移动钳制 :134-143） | RE-PRESENT；**钳制值含 16px 侧握手 + 52px chrome 预留**（tranboxPosition.js:2-4）——不得"简化"，MVP-29 验收重点 |
| 自适应高度 | `autoHeight` ResizeObserver（:222-239） | RE-PRESENT |
| 隔离 | `TransboxManager.enable` ShadowRoot + Emotion cache（tranbox.js:46-59） | REUSE 容器机制；Kisu primitives 零样式注入 → ShadowRoot 天然友好（#13 决策的直接回报） |
| 点击外部关闭 | `hideClickAway`（useTranBoxState） | RE-PRESENT |
| 状态不重同步 | `useTranBoxState.js:40-44` 自注：挂载中 tranboxSetting 不重同步 | 已知上游限制，登记 control-paths Unconfirmed #4；Kisu surface 生命周期短（单次选区），影响有限 |

## 8. D5 决策输入摘要

**并行 overlay（计划推荐）需要**：复用 §1 trigger 全套 + §4 执行 API（KCL runner）+
§7 容器/几何语义；重推导 §3 决策层（MVP-27/ADR-015）；重呈现 §2/§6 视觉。
**边界成本**：TranBtn 与 wordHover 无 ShadowRoot（hostile-page 测试必须覆盖）；
几何钳制常量不可简化；`apiSlugs` 多选语义已由 KCL 承载。
**窄 renderer hook 备选**改动点：`TranBox.js` 结果区插槽——需 TRACK 修改（新
carried patch），与 control-paths "Selection 决策层不可复用"结论叠加后成本更高。
**结论倾向**：证据支持并行 overlay；正式拍板待 D5。
