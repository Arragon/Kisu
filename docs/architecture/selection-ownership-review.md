# Selection ownership review（MVP-35 / INH-1176）

- 日期：2026-10-27（P4 收官卡）
- 方法：与字幕域 divergence audit（PR #41）同法——实证 diff + 引用面 grep，
  非断言。被审范围：Kisu Selection 域全部交付（PR #25–#30、#64–#66）。

## 1. TRACK 面零修改（实证）

`git diff m0-start..工作区 -- src/views/Selection/ src/hooks/useSelection*.js
src/hooks/useTranbox*.js src/hooks/useAutoHideTranBtn.js src/libs/tranbox*.js
src/views/Action/ src/libs/inputTranslate.js` → **空 diff**。

Selection 域上游 TRACK 文件（九种触发模式、浮动按钮、检测逻辑、TranForm
决策层）**零修改**——与字幕域（KP-001 两文件）形成对照。

## 2. 零检测逻辑复制（引用面 grep）

`src/kisu/**` 全量 grep `useSelectionController|views/Selection|TranForm|
TranCont|tranboxPosition` → **4 处命中全部为注释文字**（上游来源标注，
classifier.js:3、geometry.js:6-19、providers.js:59），零实际 import。
Kisu Selection 域为 OWN 分类：

| 组件 | 分类 | 说明 |
| --- | --- | --- |
| classifier.js | OWN | 可解释启发式（ADR-015 定稿），不复刻 TranForm 内联决策 |
| geometry.js | OWN | 上游语义**重推导**（16/52/20/12 数值常量 + 翻转/钳制算法按 control-paths 记录重写），非逐行复制 |
| trigger.js | OWN 适配器 | 只路由 DOM 信号到 controller；上游九模式检测仍由上游执行 |
| controller.js | OWN | 纯状态折叠；runner 注入绑定上游执行 API |
| 三个结果面 + ActionRow | OWN surface | 只消费 view-model，零上游依赖 |

## 3. 语义忠实性验证

- `isMatch` parity：Kisu sites.js 复刻上游宽匹配（含已知问题），9 组逐例断言
  （PR #25）；**注意**：这是 utils.js 的逐行复刻（contract test 锁定漂移），
  若判定为不可接受的复制，M2 升级时改用上游 import 即可（单文件改）。
- 几何语义：16px/52px/20/12 数值常量 + 翻转/钳制算法按 control-paths 记录
  重写（PR #64），矩阵验证（PR #66 hostile-page 六类环境）。
- 上游抑制语义（hideTranBtn/纯数字/skipLangs）由调用方 guard 注入承载，
  不在 Kisu 内复制检测代码（PR #65）。

## 4. 结论

**PASS**——Selection 域对上游的差异为**零 TRACK 修改 + 全 OWN 实现**，
符合 ownership 三分类（TRACK/FILTER/OWN）中 Kisu 侧的全部预期。
P4（10/10）收官。

## 5. M2 注意事项

- geometry.js 的语义重推导在 M2 升级时需对照上游变更复核（数值常量若有变，
  测试会显式失败）。
- isMatch 复刻若上游修改宽匹配算法，parity 测试显式失败——届时评估是否
  改 import 上游 utils（属 contract test 设计意图）。
