// Selection trigger 接入（MVP-33 / INH-1174）。
// 并行 overlay：不重写上游检测/不修改上游文件——本模块是 Kisu surface 的
// 触发适配器，把 DOM selection 事件路由到 SelectionController.open()。
// 上游 trigger 生命周期（九种模式）语义保持不变：上游面板照常工作，Kisu
// overlay 是并行消费者。抑制规则（hideTranBtn/纯数字/skipLangs）由注入的
// guard 谓词承载——调用方从上游 setting 派生后注入，本模块不读 schema。
import { kclOk, kclError } from "../../kcl/result";

// DOM Selection → { text, rect } 快照（null = 无有效选区）。
// text 取 string 化选区；rect 取最后一个 range 的包围盒。
export const readSelectionSnapshot = (selection, docView = window) => {
  if (!selection || selection.rangeCount === 0) {
    return null;
  }
  const text = String(selection);
  if (!text.trim()) {
    return null;
  }
  let rect = null;
  try {
    rect = selection.getRangeAt(0).getBoundingClientRect();
  } catch {
    rect = null;
  }
  void docView;
  return { text, rect };
};

// 触发适配器：DOM 事件 → 快照 → guard → controller.open(text)。
// guard(text) 返回 false 时静默跳过（上游抑制语义：hideTranBtn/纯数字/
// skipLangs 由调用方从上游 setting 派生）。
export const createSelectionTrigger = ({
  controller,
  getSelection,
  guard = null,
  onOpen = null,
} = {}) => {
  if (!controller || typeof controller.open !== "function") {
    throw new TypeError("createSelectionTrigger requires a controller with open()");
  }
  if (typeof getSelection !== "function") {
    throw new TypeError("createSelectionTrigger requires a getSelection accessor");
  }
  let bound = false;
  let destroyed = false;

  const route = () => {
    if (destroyed) {
      return;
    }
    const selection = getSelection();
    const snapshot = readSelectionSnapshot(selection);
    if (!snapshot) {
      return;
    }
    if (guard && !guard(snapshot.text)) {
      return;
    }
    controller.open(snapshot.text);
    if (typeof onOpen === "function") {
      onOpen(snapshot);
    }
  };

  const onMouseUp = () => {
    route();
  };

  const onDoubleClick = () => {
    route();
  };

  return kclOk(
    Object.freeze({
      onMouseUp,
      onDoubleClick,
      destroy: () => {
        destroyed = true;
      },
    })
  );
};

// 便捷绑定：把适配器接到宿主（document/ShadowRoot 宿主节点）并返回解除函数。
// 并行 overlay：宿主是 Kisu 自有容器，不触上游 listeners。
export const bindSelectionTrigger = ({ host, ...args } = {}) => {
  if (!host || typeof host.addEventListener !== "function") {
    return kclError("UNSUPPORTED_INPUT", "bindSelectionTrigger requires a host element");
  }
  const result = createSelectionTrigger(args);
  if (!result.ok) {
    return result;
  }
  const trigger = result.value;
  host.addEventListener("mouseup", trigger.onMouseUp);
  host.addEventListener("dblclick", trigger.onDoubleClick);
  return kclOk(
    Object.freeze({
      trigger,
      destroy: () => {
        host.removeEventListener("mouseup", trigger.onMouseUp);
        host.removeEventListener("dblclick", trigger.onDoubleClick);
        trigger.destroy();
      },
    })
  );
};
