// KCL Page 只读投影（MVP-06 / INH-1147）。
// 只包装上游 Popup 已有机制（docs/architecture/control-paths.md Path 1）：
// 状态经 MSG_TRANS_GETRULE 拉取，本模块不读写 storage、不复制规则引擎。
// 上游无订阅通道，活跃态按 ADR-014 以 pull-only 轮询同步。
import { MSG_TRANS_GETRULE, MSG_TRANS_PUTRULE, MSG_TRANS_TOGGLE, MSG_SAVE_RULE } from "../../config/msg";
import { GLOBLA_RULE, GLOBAL_KEY } from "../../config/rules";
import { kclOk, kclError } from "./result";
import { isSiteBlacklisted } from "./sites";
import { listProviders } from "./providers";

export const PAGE_DISPLAY_ORDERS = Object.freeze([
  "original-first",
  "translation-first",
]);

const asString = (v) => (typeof v === "string" ? v : "");

// 将 GETRULE 响应 { rule, setting } 投影为归一化只读状态。
// 缺失/非法值回退到上游全局兜底规则 GLOBLA_RULE（src/config/rules.js:119），
// 不自造第二套默认值。显示模式无单一上游字段，由 transOnly × transOrder 组合表达。
// 规则字段中的 GLOBAL_KEY("*") 表示继承全局，投影时直接落到全局默认。
export const normalizePageState = (payload, href = "") => {
  const rule =
    payload && typeof payload === "object" && payload.rule && typeof payload.rule === "object"
      ? payload.rule
      : {};
  const setting =
    payload && typeof payload === "object" && payload.setting && typeof payload.setting === "object"
      ? payload.setting
      : {};

  const transOpen = asString(rule.transOpen) === "true";
  // "*"/非法值 → 双语（GLOBLA_RULE.transOnly 默认）
  const onlyTranslation = asString(rule.transOnly) === "true";
  const orderRaw = asString(rule.transOrder);
  const order = PAGE_DISPLAY_ORDERS.includes(orderRaw)
    ? orderRaw
    : GLOBLA_RULE.transOrder;
  const apiSlugRaw = asString(rule.apiSlug);
  const apiSlug = apiSlugRaw && apiSlugRaw !== "*" ? apiSlugRaw : GLOBLA_RULE.apiSlug;
  // registered：false = 注册表中确认不存在（失效引用）；null = 注册表不可得（无法判定）
  const apis =
    setting && Array.isArray(setting.transApis) ? setting.transApis : null;
  const providerRegistered =
    apis === null
      ? null
      : apis.some((a) => a && a.apiSlug === apiSlug);
  // Provider 注册表投影（MVP-21）：白名单 descriptor 列表随状态下行为 surface 供选择
  const registry = listProviders(setting);
  const providers = registry.ok ? registry.value : [];
  const toLangRaw = asString(rule.toLang);
  const toLang = toLangRaw && toLangRaw !== "*" ? toLangRaw : GLOBLA_RULE.toLang;
  const blacklisted = href
    ? isSiteBlacklisted(href, asString(setting.blacklist))
    : false;

  // translation 与 site.autoTranslate 同源于合并规则的 transOpen：
// 前者表达"当前页面翻译态"（Popup 语义，上游唯一的页面状态字段），
// 后者表达"该站点的自动翻译偏好"，供站点策略区独立消费。
  return Object.freeze({
    translation: transOpen ? "active" : "idle",
    displayMode: Object.freeze({ onlyTranslation, order }),
    provider: Object.freeze({ apiSlug, registered: providerRegistered }),
    providers,
    targetLanguage: toLang,
    site: Object.freeze({ autoTranslate: transOpen, blacklisted }),
  });
};

// 经注入的 sendAction(message)（如包装上游 sendTabMsg）读取当前页面状态。
// sender 缺失/非函数 → UNSUPPORTED_INPUT；
// 响应缺失、携带 error 或无 rule（含内容脚本未注入、连接失败被上游静默吞掉）
// → TRANSPORT_UNAVAILABLE。
export const readPageState = async (sendAction, href = "") => {
  if (typeof sendAction !== "function") {
    return kclError(
      "UNSUPPORTED_INPUT",
      "readPageState requires a sendAction(message) function"
    );
  }
  let res;
  try {
    res = await sendAction(MSG_TRANS_GETRULE);
  } catch (err) {
    return kclError(
      "TRANSPORT_UNAVAILABLE",
      `page state request failed: ${err && err.message ? err.message : String(err)}`
    );
  }
  if (!res || res.error || !res.rule) {
    return kclError(
      "TRANSPORT_UNAVAILABLE",
      "no page rule available (content script not connected or returned error)"
    );
  }
  return kclOk(normalizePageState(res, href));
};

// ADR-014：pull-only 轮询订阅。单飞（上一轮未返回时不发起新请求），
// 状态序列化后无变化不重复回调；shouldPoll 可控制仅可见时轮询。
// 返回取消函数。错误经 onError(kclResult) 上报，不中断轮询。
export const subscribePageState = (
  sendAction,
  { href = "", intervalMs = 2000, onState, onError, shouldPoll } = {}
) => {
  if (typeof sendAction !== "function" || typeof onState !== "function") {
    throw new TypeError("subscribePageState requires sendAction and onState");
  }
  let stopped = false;
  let inFlight = false;
  let lastJson = null;

  const poll = async () => {
    if (stopped || inFlight) {
      return;
    }
    if (typeof shouldPoll === "function" && !shouldPoll()) {
      return;
    }
    inFlight = true;
    try {
      const result = await readPageState(sendAction, href);
      if (stopped) {
        return;
      }
      if (result.ok) {
        const json = JSON.stringify(result.value);
        if (json !== lastJson) {
          lastJson = json;
          onState(result.value);
        }
      } else if (typeof onError === "function") {
        onError(result);
      }
    } finally {
      inFlight = false;
    }
  };

  poll();
  const timer = setInterval(poll, intervalMs);
  return () => {
    stopped = true;
    clearInterval(timer);
  };
};

// ---------------------------------------------------------------------------
// 写命令（MVP-07 / INH-1148）。
// 上游 `toggle()` 非幂等、`updateRule` 只改运行态不落盘（control-paths Path 1 陷阱），
// 故 set 语义一律由「GETRULE 读 → 校验 → TOGGLE/PUTRULE」组合实现（D4：M0 不引入
// KP-003 消息路由）。落盘走 MSG_SAVE_RULE（background 通道），黑名单增删无消息通道、
// 需注入 setting 读写器（popup 侧可用 storage hooks 提供实现）。
//
// transport 形态：{ sendTab(action, args?), sendBg(action, args)?, readSetting()?,
// writeSetting(updater)? }；也接受裸函数（视为仅 sendTab，可用于除落盘/黑名单外的一切）。

const asTransport = (transport) => {
  if (typeof transport === "function") {
    return { sendTab: transport };
  }
  if (
    transport &&
    typeof transport === "object" &&
    typeof transport.sendTab === "function"
  ) {
    return transport;
  }
  return null;
};

const transportError = (detail) =>
  kclError("TRANSPORT_UNAVAILABLE", detail);

const fetchRuleContext = async (sendTab) => {
  let res;
  try {
    res = await sendTab(MSG_TRANS_GETRULE);
  } catch (err) {
    return transportError(
      `page state request failed: ${err && err.message ? err.message : String(err)}`
    );
  }
  if (!res || res.error || !res.rule) {
    return transportError(
      "no page rule available (content script not connected or returned error)"
    );
  }
  return kclOk(res);
};

// 开/关页面翻译。目标态与当前态一致时不发消息（上游 toggle 非幂等，禁止盲发）。
export const setPageTranslation = async (transport, { active } = {}) => {
  const t = asTransport(transport);
  if (!t) {
    return kclError("UNSUPPORTED_INPUT", "page commands require a transport with sendTab");
  }
  if (typeof active !== "boolean") {
    return kclError("UNSUPPORTED_INPUT", "setPageTranslation requires { active: boolean }");
  }
  const ctx = await fetchRuleContext(t.sendTab);
  if (!ctx.ok) {
    return ctx;
  }
  if ((ctx.value.rule.transOpen === "true") !== active) {
    let res;
    try {
      res = await t.sendTab(MSG_TRANS_TOGGLE);
    } catch (err) {
      return transportError(`toggle failed: ${err && err.message ? err.message : String(err)}`);
    }
    if (res && res.error) {
      return transportError(`toggle rejected: ${res.error}`);
    }
  }
  return kclOk(
    normalizePageState({
      rule: { ...ctx.value.rule, transOpen: active ? "true" : "false" },
      setting: ctx.value.setting,
    })
  );
};

// 设置显示模式（transOnly × transOrder）。两字段至少提供一个；均为运行态修改，
// 不落盘——持久化由 saveSiteRule 显式触发，与 Popup 行为一致。
export const setPageDisplayMode = async (
  transport,
  { onlyTranslation, order } = {}
) => {
  const t = asTransport(transport);
  if (!t) {
    return kclError("UNSUPPORTED_INPUT", "page commands require a transport with sendTab");
  }
  if (onlyTranslation === undefined && order === undefined) {
    return kclError("UNSUPPORTED_INPUT", "setPageDisplayMode requires onlyTranslation and/or order");
  }
  if (onlyTranslation !== undefined && typeof onlyTranslation !== "boolean") {
    return kclError("UNSUPPORTED_INPUT", "onlyTranslation must be boolean");
  }
  if (order !== undefined && !PAGE_DISPLAY_ORDERS.includes(order)) {
    return kclError("UNSUPPORTED_INPUT", `order must be one of ${PAGE_DISPLAY_ORDERS.join(", ")}`);
  }
  const patch = {};
  if (onlyTranslation !== undefined) {
    patch.transOnly = onlyTranslation ? "true" : "false";
  }
  if (order !== undefined) {
    patch.transOrder = order;
  }
  return putRulePatch(t, patch);
};

// 设置页面 Provider。setting.transApis 可得时做存在性校验（未找到 → PROVIDER_NOT_FOUND）；
// GLOBAL_KEY("*") 表示继承全局，允许。
export const setPageProvider = async (transport, { apiSlug } = {}) => {
  const t = asTransport(transport);
  if (!t) {
    return kclError("UNSUPPORTED_INPUT", "page commands require a transport with sendTab");
  }
  if (typeof apiSlug !== "string" || !apiSlug) {
    return kclError("UNSUPPORTED_INPUT", "setPageProvider requires { apiSlug: non-empty string }");
  }
  const ctx = await fetchRuleContext(t.sendTab);
  if (!ctx.ok) {
    return ctx;
  }
  const apis =
    ctx.value.setting && Array.isArray(ctx.value.setting.transApis)
      ? ctx.value.setting.transApis
      : null;
  if (
    apis &&
    apiSlug !== GLOBAL_KEY &&
    !apis.some((a) => a && a.apiSlug === apiSlug)
  ) {
    return kclError(
      "PROVIDER_NOT_FOUND",
      `provider "${apiSlug}" is not present in setting.transApis`
    );
  }
  return putRulePatch(t, { apiSlug }, ctx);
};

// 设置目标语言。仅做非空校验——KCL 不维护第二份语言 registry（MVP-20 的语言表
// 校验由产品层复用上游 OPT_LANGS_TO 完成）。
export const setPageTargetLanguage = async (transport, { toLang } = {}) => {
  const t = asTransport(transport);
  if (!t) {
    return kclError("UNSUPPORTED_INPUT", "page commands require a transport with sendTab");
  }
  if (typeof toLang !== "string" || !toLang) {
    return kclError("UNSUPPORTED_INPUT", "setPageTargetLanguage requires { toLang: non-empty string }");
  }
  return putRulePatch(t, { toLang });
};

const putRulePatch = async (t, patch, preloadedCtx) => {
  const ctx = preloadedCtx || (await fetchRuleContext(t.sendTab));
  if (!ctx.ok) {
    return ctx;
  }
  let res;
  try {
    res = await t.sendTab(MSG_TRANS_PUTRULE, patch);
  } catch (err) {
    return transportError(
      `putrule failed: ${err && err.message ? err.message : String(err)}`
    );
  }
  if (res && res.error) {
    return transportError(`putrule rejected: ${res.error}`);
  }
  return kclOk(
    normalizePageState({
      rule: { ...ctx.value.rule, ...patch },
      setting: ctx.value.setting,
    })
  );
};

// 将当前页面运行态规则（可叠加 patch）以指定 pattern 持久化为站点规则。
// 复刻 Popup handleSaveRule：整规则 + pattern 经 MSG_SAVE_RULE 发往 background，
// 由上游 saveRule 做模糊合并与全局等值剥离（rules.js:404，含其已知误合并隐患）。
export const saveSiteRule = async (transport, { pattern, patch } = {}) => {
  const t = asTransport(transport);
  if (!t) {
    return kclError("UNSUPPORTED_INPUT", "page commands require a transport with sendTab");
  }
  if (typeof pattern !== "string" || !pattern) {
    return kclError("UNSUPPORTED_INPUT", "saveSiteRule requires { pattern: non-empty string }");
  }
  if (typeof t.sendBg !== "function") {
    return transportError("saveSiteRule requires transport.sendBg (background channel)");
  }
  const ctx = await fetchRuleContext(t.sendTab);
  if (!ctx.ok) {
    return ctx;
  }
  const curRule = { ...ctx.value.rule, ...(patch || {}), pattern };
  let res;
  try {
    res = await t.sendBg(MSG_SAVE_RULE, curRule);
  } catch (err) {
    return transportError(
      `save rule failed: ${err && err.message ? err.message : String(err)}`
    );
  }
  if (res && res.error) {
    return transportError(`save rule rejected: ${res.error}`);
  }
  return kclOk(
    normalizePageState({ rule: curRule, setting: ctx.value.setting })
  );
};

// 站点策略：auto = 持久化站点规则并自动开翻译；never = 加入黑名单；
// clear = 从黑名单移除，并在提供 rules 读写器时一并移除该域名的持久化站点规则。
// 黑名单存于 setting（无消息通道），需注入 readSetting/writeSetting；缺失时明确
// 失败而非静默假成功。
// 与上游的差异（均已注明）：never 对完全相同条目去重（上游会重复追加）；
// clear 的规则移除复刻上游 Options 的 del(pattern)（hooks/Rules.js:44，精确
// pattern 匹配、'*' 受保护）——上游 Popup 没有规则移除通道，此能力只在
// Options 直连存储路径存在（S8 证据核实结论）。
export const setSitePreference = async (
  transport,
  { mode, pattern, domain } = {}
) => {
  const t = asTransport(transport);
  if (!t) {
    return kclError("UNSUPPORTED_INPUT", "page commands require a transport with sendTab");
  }
  if (mode !== "auto" && mode !== "never" && mode !== "clear") {
    return kclError("UNSUPPORTED_INPUT", 'setSitePreference requires { mode: "auto" | "never" | "clear" }');
  }
  if (mode === "auto") {
    if (typeof pattern !== "string" || !pattern) {
      return kclError("UNSUPPORTED_INPUT", 'mode "auto" requires { pattern }');
    }
    return saveSiteRule(t, { pattern, patch: { transOpen: "true" } });
  }

  if (typeof domain !== "string" || !domain) {
    return kclError("UNSUPPORTED_INPUT", `mode "${mode}" requires { domain }`);
  }
  if (
    typeof t.readSetting !== "function" ||
    typeof t.writeSetting !== "function"
  ) {
    return transportError(
      `mode "${mode}" requires transport.readSetting/writeSetting (blacklist lives in setting)`
    );
  }
  let setting;
  try {
    setting = await t.readSetting();
  } catch (err) {
    return transportError(
      `readSetting failed: ${err && err.message ? err.message : String(err)}`
    );
  }
  const current = (setting && typeof setting.blacklist === "string")
    ? setting.blacklist
    : "";
  const entries = current ? current.split(/\n|,/).map((u) => u.trim()).filter(Boolean) : [];
  let next;
  if (mode === "never") {
    next = entries.includes(domain) ? entries : [...entries, domain];
  } else {
    next = entries.filter((u) => u !== domain);
  }
  try {
    await t.writeSetting((pre) => ({
      ...pre,
      blacklist: next.join("\n"),
    }));
  } catch (err) {
    return transportError(
      `writeSetting failed: ${err && err.message ? err.message : String(err)}`
    );
  }

  // clear 的完整形态：同时移除精确匹配 domain 的持久化站点规则（上游 del 语义）。
  // rules 读写器未注入时跳过（黑名单清除仍生效），在结果中明示。
  let ruleRemoved = false;
  if (
    mode === "clear" &&
    typeof t.readRules === "function" &&
    typeof t.writeRules === "function"
  ) {
    let rules;
    try {
      rules = await t.readRules();
    } catch (err) {
      return transportError(
        `readRules failed: ${err && err.message ? err.message : String(err)}`
      );
    }
    const list = Array.isArray(rules) ? rules : [];
    if (
      list.some(
        (item) => item && item.pattern === domain && item.pattern !== GLOBAL_KEY
      )
    ) {
      try {
        await t.writeRules((prev) =>
          (Array.isArray(prev) ? prev : []).filter(
            (item) => item && item.pattern !== domain
          )
        );
        ruleRemoved = true;
      } catch (err) {
        return transportError(
          `writeRules failed: ${err && err.message ? err.message : String(err)}`
        );
      }
    }
  }

  return kclOk(
    Object.freeze({
      mode,
      domain,
      blacklisted: mode === "never",
      ruleRemoved,
    })
  );
};
