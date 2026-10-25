// 归一化错误 → 可行动文案（MVP-23/24 共享，单一来源）。
// PageStatus 与 PopupShell 的 error 占位都经此呈现，避免两套文案漂移。
// 未知码原样 "code: message"，不猜测。

const ERROR_HINTS = {
  TRANSPORT_UNAVAILABLE:
    "Cannot reach the page. Reopen the popup or refresh the page.",
  PROVIDER_NOT_FOUND: "The selected service is gone — pick another below.",
  PROVIDER_REQUEST_FAILED:
    "The service request failed (credentials, rate limit or network). Check the service or try again.",
  UNSUPPORTED_INPUT: "This action is not available here.",
};

export const describeError = (error) => {
  if (!error || typeof error.code !== "string") {
    return "Something went wrong.";
  }
  const hint = ERROR_HINTS[error.code];
  const message = error.message ? String(error.message) : "";
  if (hint) {
    return message ? `${hint} (${message})` : hint;
  }
  return message ? `${error.code}: ${message}` : error.code;
};
