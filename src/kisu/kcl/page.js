// KCL Page 只读投影（MVP-06 / INH-1147）。
// 只包装上游 Popup 已有机制（docs/architecture/control-paths.md Path 1）：
// 状态经 MSG_TRANS_GETRULE 拉取，本模块不读写 storage、不复制规则引擎。
// 上游无订阅通道，活跃态按 ADR-014 以 pull-only 轮询同步。
import { MSG_TRANS_GETRULE } from "../../config/msg";
import { GLOBLA_RULE } from "../../config/rules";
import { kclOk, kclError } from "./result";
import { isSiteBlacklisted } from "./sites";

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
    provider: Object.freeze({ apiSlug }),
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
