# DESIGN-DIRECTION · Ink（冻结）

- 冻结来源：DES-02 用户拍板「黑白极简」（2026-10-27），经 DES-03/04 转正为默认
  tokens。本文件记录该决定及其设计语义；**值的事实源是 `ui/tokens/tokens.js`**，
  本文不得与之冲突。反悔方向 = 重开 DES-02 Gate（重选/改 token 值），不是改 KCL。
- 适用范围：全部 Kisu 自有表面（Popup / Options / Selection 控件 / YouTube 控件 /
  Onboarding）。DES-05..08 的 composition 工作以本文为唯一方向依据。

## 1. 色彩（Color）

- **单色高对比**：light = 纸白底 + 近黑字；dark = 近黑底 + 纸白字。唯一"色彩"
  是 status 四对语义 fg/bg（灰基 + 必要的红/绿语义），不引入品牌色、渐变、彩色点缀。
- 主操作 = `action.primary`（light 近黑 / dark 纸白）+ `text.onAction` 反色文字。
- 层级靠灰度（text.primary > secondary > disabled）表达，不靠色相。
- 规范值见 tokens.js `lightPalette` / `darkPalette`；WCAG 电池（10 组对 ≥4.5:1）
  在 directions.test.js 持续强制。

## 2. 密度（Density）

- **紧凑而透气**：控件组内 gap = `space.xs`（4），组间 gap = `space.md`（12），
  容器内边距 = `space.md`（12），状态占位 = `space.xl`（24）。
- Popup 固定 360px 宽（上游同宽）；不追求信息密度最大化，行高 `lineHeight.normal`。

## 3. 字体（Typography）

- 系统栈（`type.fontFamily`），不引入 Web 字体。
- 三级层级，全部来自 token：
  - 标题（Popup/页头）：`size.md` + `weight.strong` + `text.primary`；
  - 组标签：`size.sm` + `weight.medium` + `text.secondary`；
  - 控件正文：`size.md` + `text.primary`；行内状态：`size.sm`。

## 4. 圆角与投影（Radius / Elevation）

- **近直角**：控件 `radius.sm`（2），容器/表面 `radius.md`（4），胶囊 chips 用
  `radius.round`（999）仅限 aria-pressed 选择态（Selection 设置页）。
- 投影仅用于真悬浮物（跟随时浮窗/按钮气泡），一律 `elevation.low`；面板不用投影。

## 5. 动效（Motion）

- **零动效**：全部 duration = 0，easing = linear。状态切换即时呈现。
- reduced-motion 复核（DES-09）：**结构性满足**——`ui/` 不存在任何
  transition/animation/@keyframes（`a11yBoundary.test.js` 持续强制），
  `prefers-reduced-motion` 用户无需额外分支。

## 6. 构图与层级（Composition / Hierarchy）

- **线条分层，不靠色块**：同级组之间用 1px `border.default` 发丝线分隔
  （Popup：主动作 / 翻译设置 / 站点策略三组）。
- 每屏一个强调元素：主翻译动作全宽 `variant=primary`，其余控件一律中性态。
- 控件组合成：标签在上、控件在下；Select 与伴随按钮同行时 Select `flex:1 min-width:0`
  （长名称安全），等权动作（站点三态）均分一行。
- 长文案安全：错误/状态行 `overflow-wrap: anywhere`，禁止横向溢出 360px。

## 7. 期望 / 不期望（Patterns）

**期望**
- 单色、发丝线、留白建立的秩序感；原生控件（select/button）+ token 化皮肤；
  即时状态反馈（零动效）；键盘可达（原生语义优先）。

**不期望**
- 品牌色/渐变/彩色徽标；过渡动画、微交互弹性；大圆角（Paper 风）、重投影；
  自绘非原生复杂控件（除非原生语义无法满足）；图标先于文字。
