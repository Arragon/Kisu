// KCL Subtitle 运行时读取（KP-001 / INH-1228 的 KCL 侧）。
// 访问器由 Kisu content bootstrap 注入（绑定 carried patch 导出的
// getYouTubeCaptionStatus）。KCL 不静态 import src/subtitle/*——其依赖链含
// Jest 27 无法加载的 @streamparser/json ESM（BL-04），与 selection 同理。
import { kclOk, kclError } from "./result";

// 读取字幕运行时快照。getStatus 未注入 → TRANSPORT_UNAVAILABLE；
// 已注入但字幕模块未挂载（访问器返回 null）是合法状态 → kclOk({ mounted: false })，
// 与"出错"显式区分（非视频页/字幕未启用都不算错误）。
export const readSubtitleRuntime = (getStatus) => {
  if (typeof getStatus !== "function") {
    return kclError(
      "TRANSPORT_UNAVAILABLE",
      "readSubtitleRuntime requires the KP-001 accessor to be injected"
    );
  }
  const snapshot = getStatus();
  if (!snapshot || typeof snapshot !== "object") {
    return kclOk(Object.freeze({ mounted: false }));
  }
  return kclOk(snapshot);
};
