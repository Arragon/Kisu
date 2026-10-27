// Page feature controller（MVP-15 首例 / INH-1156）。
// 约定见 src/kisu/ui/contracts/view-model.md：纯 JS、无 React/DOM；
// 订阅 KCL（ADR-014 pull-only 轮询）折叠冻结 view-model；动作先查 can。
import {
  subscribePageState,
  setPageTranslation,
  setPageDisplayMode,
  setPageTargetLanguage,
  setPageProvider,
  setSitePreference,
  readPageState,
} from "../../kcl";

export const PAGE_VIEW_STATUSES = Object.freeze([
  "loading",
  "idle",
  "active",
  "error",
]);

const ACTION_KEYS = Object.freeze([
  "translate",
  "stop",
  "changeDisplayMode",
  "changeLanguage",
  "changeProvider",
  "changeSitePreference",
]);

const frozenCan = (flags) => {
  const can = {};
  ACTION_KEYS.forEach((key) => {
    can[key] = Boolean(flags[key]);
  });
  return Object.freeze(can);
};

const blockedCan = frozenCan({});
const loadingViewModel = () =>
  Object.freeze({
    status: "loading",
    data: null,
    can: blockedCan,
    blockedBy: null,
    error: null,
  });

const errorViewModel = (result) =>
  Object.freeze({
    status: "error",
    data: null,
    can: blockedCan,
    blockedBy: null,
    error: Object.freeze({
      code: result.error.code,
      message: result.error.message,
    }),
  });

const fromState = (state) => {
  const active = state.translation === "active";
  const blockedBy = state.site.blacklisted
    ? "site"
    : state.provider.registered === false
      ? "provider"
      : null;
  return Object.freeze({
    status: active ? "active" : "idle",
    data: Object.freeze({
      translation: state.translation,
      displayMode: state.displayMode,
      provider: state.provider,
      providers: state.providers,
      targetLanguage: state.targetLanguage,
      site: state.site,
    }),
    can: frozenCan({
      translate: !active && blockedBy === null,
      stop: active,
      changeDisplayMode: blockedBy === null,
      changeLanguage: blockedBy === null,
      // provider 失效时换一个有效 provider 正是恢复路径——保持可用
      changeProvider: blockedBy !== "site",
      // 站点策略是逃生舱：即使在黑名单站点上也保持可用（clear 即恢复路径）
      changeSitePreference: true,
    }),
    blockedBy,
    error: null,
  });
};

export const createPageController = ({
  sendAction,
  href = "",
  siteAccessors,
} = {}) => {
  if (typeof sendAction !== "function") {
    throw new TypeError("createPageController requires a sendAction(message) transport");
  }
  let current = loadingViewModel();
  const listeners = new Set();
  let disposed = false;

  const emit = (viewModel) => {
    current = viewModel;
    listeners.forEach((listener) => {
      listener(current);
    });
  };

  const unsubscribe = subscribePageState(sendAction, {
    href,
    onState: (state) => {
      if (!disposed) {
        emit(fromState(state));
      }
    },
    onError: (result) => {
      if (!disposed) {
        emit(errorViewModel(result));
      }
    },
  });

  const runToggle = async (active) => {
    if (!current.can[active ? "translate" : "stop"] || disposed) {
      return current;
    }
    const result = await setPageTranslation(sendAction, { active });
    if (disposed) {
      return current;
    }
    emit(result.ok ? fromState(result.value) : errorViewModel(result));
    return current;
  };

  // 显示模式（MVP-19）：经 KCL PUTRULE 写运行态（页面存活期间 GETRULE 回读得到，
  // 即"重开 Popup 保持"的语义来源）。命令失败保留上一个真实视图——
  // 错误的统一呈现归 MVP-23。
  const runSetDisplayMode = async (patch) => {
    if (!current.can.changeDisplayMode || disposed) {
      return current;
    }
    const result = await setPageDisplayMode(sendAction, patch);
    if (disposed) {
      return current;
    }
    if (result.ok) {
      emit(fromState(result.value));
    }
    return current;
  };

  // 目标语言（MVP-20）：经 KCL PUTRULE 写运行态。语言码合法性由产品层
  // （product/page/languages.js，OPT_LANGS_TO 唯一事实源）把关；KCL 只做非空校验。
  // 命令失败保留上一真实视图（错误呈现归 MVP-23）。
  const runSetTargetLanguage = async (toLang) => {
    if (!current.can.changeLanguage || disposed) {
      return current;
    }
    const result = await setPageTargetLanguage(sendAction, { toLang });
    if (disposed) {
      return current;
    }
    if (result.ok) {
      emit(fromState(result.value));
    }
    return current;
  };

  // Provider（MVP-21）：经 KCL setPageProvider（注册表校验 + PUTRULE）。
  // 失败保留上一真实视图（错误呈现归 MVP-23）。
  const runSetProvider = async (apiSlug) => {
    if (!current.can.changeProvider || disposed) {
      return current;
    }
    const result = await setPageProvider(sendAction, { apiSlug });
    if (disposed) {
      return current;
    }
    if (result.ok) {
      emit(fromState(result.value));
    }
    return current;
  };

  // 站点策略（MVP-22）：KCL setSitePreference（auto/never/clear）。
  // 黑名单/站点规则存于 popup 侧存储（无消息通道），入口组合须提供 siteAccessors
  // { readSetting, writeSetting, readRules?, writeRules? }。变更后立即重读页面
  // 状态折叠视图（黑名单变化会反映在 data.site / blockedBy / can 上）；
  // KCL 失败保留上一真实视图（错误呈现归 MVP-23）。
  const runSetSitePreference = async (request) => {
    if (!current.can.changeSitePreference || disposed) {
      return current;
    }
    const result = await setSitePreference(
      { sendTab: sendAction, ...(siteAccessors || {}) },
      request
    );
    if (disposed) {
      return current;
    }
    if (result.ok) {
      const refreshed = await readPageState(sendAction, href);
      if (!disposed && refreshed.ok) {
        emit(fromState(refreshed.value));
      }
    }
    return current;
  };

  return {
    getView: () => current,
    subscribe: (listener) => {
      if (typeof listener !== "function") {
        throw new TypeError("subscribe requires a listener function");
      }
      listeners.add(listener);
      listener(current);
      return () => {
        listeners.delete(listener);
      };
    },
    actions: {
      translate: () => runToggle(true),
      stop: () => runToggle(false),
      setDisplayMode: (patch) => runSetDisplayMode(patch),
      setTargetLanguage: (toLang) => runSetTargetLanguage(toLang),
      setProvider: (apiSlug) => runSetProvider(apiSlug),
      setSitePreference: (request) => runSetSitePreference(request),
    },
    dispose: () => {
      disposed = true;
      listeners.clear();
      unsubscribe();
    },
  };
};
