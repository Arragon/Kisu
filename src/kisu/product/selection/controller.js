// Selection feature controller（MVP-28 / INH-1169）。
// 遵循 ui/contracts/view-model.md：纯 JS、无 React/DOM、零视觉字段
//（无 overlay 坐标——几何属 MVP-29/D5 的 surface 层）。
// 消费：#26 分类器（ADR-015 呈现类型）+ #7 Selection KCL（runner 注入）。
// 事件驱动（选区发生 → open(text)），非轮询；错误保留 data（面板需保持可用，
// 与 page controller 的清空不同——契约允许，属呈现决策）。
import {
  getSelectionProviders,
  setSelectionProviders,
  translateSelection,
  lookupSelection,
} from "../../kcl";
import { classifySelection } from "./classifier";

const ACTION_KEYS = Object.freeze(["translate", "lookup", "copy", "switchProvider"]);

const frozenCan = (flags) => {
  const can = {};
  ACTION_KEYS.forEach((key) => {
    can[key] = Boolean(flags[key]);
  });
  return Object.freeze(can);
};

const loadingViewModel = () =>
  Object.freeze({
    status: "loading",
    data: null,
    can: frozenCan({}),
    blockedBy: null,
    error: null,
  });

// KCL 错误码 → 阻断原因（呈现层提示归 MVP-30/31）
const blockedReasonOf = (providers) =>
  providers.resolved.length === 0 ? "provider" : null;

const readyViewModel = ({ kind, reason, text, providers, result }) => {
  const blockedBy = blockedReasonOf(providers);
  const busy = result && result.status === "loading";
  return Object.freeze({
    status: busy ? "loading" : "ready",
    data: Object.freeze({
      text: Object.freeze({ raw: text, kind, reason }),
      providers,
      result: result || null,
    }),
    can: frozenCan({
      translate:
        !blockedBy && kind !== "unsupported" && (!result || result.status !== "loading"),
      lookup:
        !blockedBy &&
        kind === "lexical" &&
        (!result || result.status !== "loading"),
      copy: Boolean(result && result.status === "ready"),
      switchProvider: true, // 由 setProviders 能力决定实际可用（无 storage 通道时 KCL 明确失败）
    }),
    blockedBy,
    error: null,
  });
};

const errorViewModel = (last, result) =>
  Object.freeze({
    status: "error",
    data: last ? last.data : null, // 保留数据：面板保持可用
    can: frozenCan({ switchProvider: true }),
    blockedBy: null,
    error: Object.freeze({
      code: result.error.code,
      message: result.error.message,
    }),
  });

export const createSelectionController = ({
  getSetting,
  runTranslate,
  runLookup,
} = {}) => {
  if (typeof getSetting !== "function") {
    throw new TypeError("createSelectionController requires a getSetting accessor");
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

  const resolveProviders = async () => {
    const setting = await getSetting();
    return getSelectionProviders(setting);
  };

  // 选区入口：分类 → 解析 provider → 按呈现类型自动执行（lexical → 词典，
  // sentence/multiline → 翻译；unsupported 仅就绪不执行）。
  const open = async (text) => {
    if (disposed) {
      return current;
    }
    const classification = classifySelection(text);
    if (!classification.ok) {
      emit(errorViewModel(current, classification));
      return current;
    }
    const { kind, reason } = classification.value;
    const providersResult = await resolveProviders();
    if (!providersResult.ok) {
      emit(errorViewModel(current, providersResult));
      return current;
    }
    const providers = providersResult.value;
    if (kind === "unsupported") {
      emit(readyViewModel({ kind, reason, text, providers, result: null }));
      return current;
    }
    emit(readyViewModel({ kind, reason, text, providers, result: null }));
    if (kind === "lexical") {
      await run("lookup");
    } else {
      await run("translate");
    }
    return current;
  };

  const run = async (mode) => {
    if (disposed) {
      return current;
    }
    const data = current.data;
    if (!data || current.status === "loading" || current.blockedBy) {
      return current;
    }
    if (mode === "translate" && !current.can.translate) {
      return current;
    }
    if (mode === "lookup" && !current.can.lookup) {
      return current;
    }
    const runner = mode === "translate" ? runTranslate : runLookup;
    if (typeof runner !== "function") {
      return kclUnavailable(mode);
    }
    const providers = data.providers;
    const apiSetting = providers.resolved[0] || null;
    // 结果占位（loading）→ KCL 执行 → ready/error 折叠。
    // translation/词典结果本体由 runner 决定（上游 apiTranslate/apiDict 形状），
    // controller 不解释内容，只承载 status。
    emit(
      readyViewModel({
        kind: data.text.kind,
        reason: data.text.reason,
        text: data.text.raw,
        providers,
        result: Object.freeze({ kind: mode, status: "loading", payload: null }),
      })
    );
    const executor =
      mode === "translate"
        ? translateSelection(
            { text: data.text.raw, apiSetting },
            { run: runner }
          )
        : lookupSelection({ text: data.text.raw }, { run: runner });
    const result = await executor;
    if (disposed) {
      return current;
    }
    if (!result.ok) {
      emit(errorViewModel(current, result));
      return current;
    }
    emit(
      readyViewModel({
        kind: data.text.kind,
        reason: data.text.reason,
        text: data.text.raw,
        providers,
        result: Object.freeze({
          kind: mode,
          status: "ready",
          payload: result.value,
        }),
      })
    );
    return current;
  };

  const kclUnavailable = (mode) => {
    emit(
      errorViewModel(current, {
        error: {
          code: "TRANSPORT_UNAVAILABLE",
          message: `no ${mode} runner injected`,
        },
      })
    );
    return current;
  };

  // provider 多选写入（MVP-09 KCL）；需要入口组合提供 setting 读写 transport。
  const changeProviders = async (apiSlugs, settingTransport) => {
    if (disposed) {
      return current;
    }
    const result = await setSelectionProviders(settingTransport, { apiSlugs });
    if (disposed) {
      return current;
    }
    if (!result.ok) {
      emit(errorViewModel(current, result));
      return current;
    }
    // 写入成功后重解析 provider 视图
    const providersResult = await resolveProviders();
    if (providersResult.ok) {
      const data = current.data;
      emit(
        readyViewModel({
          kind: data.text.kind,
          reason: data.text.reason,
          text: data.text.raw,
          providers: providersResult.value,
          result: data.result,
        })
      );
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
    open,
    actions: {
      translate: () => run("translate"),
      lookup: () => run("lookup"),
      setProviders: (apiSlugs, settingTransport) =>
        changeProviders(apiSlugs, settingTransport),
    },
    dispose: () => {
      disposed = true;
      listeners.clear();
    },
  };
};
