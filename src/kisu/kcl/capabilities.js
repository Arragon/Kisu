// 显式 capability 声明。Kisu 产品层只能依赖已声明且 supported 的 capability；
// "上游可能有"不是声明理由，每个 capability 必须能指向上游真实行为。

export const kclCapability = (id, { supported, reason = null } = {}) => {
  if (!id || typeof id !== "string") {
    throw new TypeError("capability id must be a non-empty string");
  }
  if (supported !== true && supported !== false) {
    throw new TypeError(`capability "${id}" must declare supported: true|false explicitly`);
  }
  return Object.freeze({ id, supported, reason: reason === null ? null : String(reason) });
};

export const isCapabilitySupported = (capability) =>
  Boolean(capability && capability.id && capability.supported === true);
