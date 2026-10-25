// YouTube subtitle feature controller（MVP-38 / INH-1179）。
// 遵循 ui/contracts/view-model.md：纯 JS、无 React/DOM、零视觉字段。
// 读侧：KCL normalizeSubtitleState（#9：enabled/显示模式组合/provider/语言/
// capability 四态/KP-001 运行时快照）；写侧：next-load 命令（#10，经注入
// setting 读写器，持久化 subtitleSetting、下次字幕启动生效——UI 明示义务见
// docs/product/subtitle-modes.md）。轮询沿用 ADR-014 模式（单飞 + 去重）。
// 状态语义：面板是设置面（非执行面）——provider 失效/capability 不支持不阻断
// 呈现（data 承载，can 保持可用，逃生舱语义同 Page 站点策略）。
import {
  normalizeSubtitleState,
  setSubtitleEnabled,
  setSubtitleDisplayMode,
  setSubtitleProvider,
  setSubtitleTargetLanguage,
  setSubtitleContextMode,
} from "../../kcl";

const ACTION_KEYS = Object.freeze([
  "setEnabled",
  "changeDisplayMode",
  "changeLanguage",
  "changeProvider",
  "changeContext",
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

const errorViewModel = (last, result) =>
  Object.freeze({
    status: "error",
    data: last ? last.data : null, // 保留数据：面板保持可用
    can: blockedCan,
    blockedBy: null,
    error: Object.freeze({
      code: result.error.code,
      message: result.error.message,
    }),
  });

const fromState = (state) =>
  Object.freeze({
    status: "ready",
    data: Object.freeze({
      enabled: state.enabled,
      displayMode: state.displayMode,
      provider: state.provider,
      targetLanguage: state.targetLanguage,
      autoTranslate: state.autoTranslate,
      segmentation: state.segmentation,
      context: state.context,
      runtime: state.runtime,
    }),
    // 设置面：所有写动作就绪时可用（各命令自身做校验与明确失败）
    can: frozenCan({
      setEnabled: true,
      changeDisplayMode: true,
      changeLanguage: true,
      changeProvider: true,
      changeContext: true,
    }),
    blockedBy: null,
    error: null,
  });

export const createSubtitleController = ({
  getSetting,
  getStatus,
  writeSetting,
  intervalMs = 2000,
  shouldPoll,
} = {}) => {
  if (typeof getSetting !== "function") {
    throw new TypeError("createSubtitleController requires a getSetting accessor");
  }
  const transport = { readSetting: getSetting, writeSetting };
  let current = loadingViewModel();
  const listeners = new Set();
  let disposed = false;
  let inFlight = false;
  let lastJson = null;

  const emit = (viewModel) => {
    current = viewModel;
    listeners.forEach((listener) => {
      listener(current);
    });
  };

  const refresh = async () => {
    if (disposed || inFlight) {
      return;
    }
    if (typeof shouldPoll === "function" && !shouldPoll()) {
      return;
    }
    inFlight = true;
    try {
      const setting = await getSetting();
      const result = normalizeSubtitleState(setting, { getStatus });
      if (disposed) {
        return;
      }
      if (result.ok) {
        const json = JSON.stringify(result.value);
        if (json !== lastJson) {
          lastJson = json;
          emit(fromState(result.value));
        }
      } else {
        emit(errorViewModel(current, result));
      }
    } catch (err) {
      if (!disposed) {
        emit(errorViewModel(current, {
          error: {
            code: "TRANSPORT_UNAVAILABLE",
            message: `setting read failed: ${err && err.message ? err.message : String(err)}`,
          },
        }));
      }
    } finally {
      inFlight = false;
    }
  };

  // next-load 写命令共用折叠：KCL 命令（校验+持久化）→ 成功立即重读折叠；
  // 失败保留上一真实视图（错误呈现归 MVP-44）。
  const runCommand = async (command, args) => {
    if (disposed || !current.data) {
      return current;
    }
    const result = await command(transport, args);
    if (disposed) {
      return current;
    }
    if (!result.ok) {
      emit(errorViewModel(current, result));
      return current;
    }
    await refresh();
    return current;
  };

  refresh();
  const timer = setInterval(refresh, intervalMs);

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
    refresh,
    actions: {
      setEnabled: (enabled) => runCommand(setSubtitleEnabled, { enabled }),
      setDisplayMode: (patch) => runCommand(setSubtitleDisplayMode, patch),
      setProvider: (apiSlug) => runCommand(setSubtitleProvider, { apiSlug }),
      setTargetLanguage: (toLang) => runCommand(setSubtitleTargetLanguage, { toLang }),
      setContextMode: (slug) => runCommand(setSubtitleContextMode, { slug }),
    },
    dispose: () => {
      disposed = true;
      listeners.clear();
      clearInterval(timer);
    },
  };
};
