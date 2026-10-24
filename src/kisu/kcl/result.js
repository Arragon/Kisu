// KCL 最小归一化结果契约：所有读/写命令统一返回 { ok, value, error }。
// 产品层不得直接消费裸异常或上游原始错误结构。

export const KCL_ERROR_CODES = Object.freeze({
  PROVIDER_NOT_FOUND: "PROVIDER_NOT_FOUND",
  PROVIDER_DISABLED: "PROVIDER_DISABLED",
  UNSUPPORTED_INPUT: "UNSUPPORTED_INPUT",
  CAPTION_UNAVAILABLE: "CAPTION_UNAVAILABLE",
  CONTEXT_UNSUPPORTED: "CONTEXT_UNSUPPORTED",
});

export const kclOk = (value = null) =>
  Object.freeze({ ok: true, value, error: null });

export const kclError = (code, message) => {
  if (!Object.prototype.hasOwnProperty.call(KCL_ERROR_CODES, code)) {
    throw new TypeError(`Unknown KCL error code: ${code}`);
  }
  return Object.freeze({
    ok: false,
    value: null,
    error: Object.freeze({ code, message: String(message) }),
  });
};

export const isKclResult = (result) =>
  Boolean(
    result &&
      typeof result === "object" &&
      typeof result.ok === "boolean" &&
      "value" in result &&
      (result.error === null ||
        (result.error &&
          typeof result.error === "object" &&
          typeof result.error.code === "string" &&
          typeof result.error.message === "string"))
  );
