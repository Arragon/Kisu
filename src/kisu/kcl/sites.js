// 站点匹配投影（MVP-06 / INH-1147）。
// isMatch 逐行复刻上游 src/libs/utils.js:200 的双指针回溯匹配，
// 含其已知问题（utils.js:193 REVIEW）：模式两端被自动包裹 "*"，等价于"包含即匹配"，
// 无法精确表达前缀/子域名锚定。复刻是为了让 Kisu 的站点判定与 Popup/黑名单
// 完全一致——修复它属于上游行为变更，不得由 Kisu 悄悄做。

const isAllchar = (s, c, i) => {
  while (i < s.length) {
    if (s[i] !== c) {
      return false;
    }
    i += 1;
  }
  return true;
};

export const isMatch = (s, p) => {
  if (s.length === 0 || p.length === 0) {
    return false;
  }

  p = "*" + p + "*";

  let [sIndex, pIndex] = [0, 0];
  let [sRecord, pRecord] = [-1, -1];
  while (sIndex < s.length && pRecord < p.length) {
    if (p[pIndex] === "*") {
      pIndex++;
      [sRecord, pRecord] = [sIndex, pIndex];
    } else if (s[sIndex] === p[pIndex]) {
      sIndex++;
      pIndex++;
    } else if (sRecord + 1 < s.length) {
      sRecord++;
      [sIndex, pIndex] = [sRecord, pRecord];
    } else {
      return false;
    }
  }

  if (p.length === pIndex) {
    return true;
  }

  return isAllchar(p, "*", pIndex);
};

// 复刻上游 src/libs/blacklist.js:19 isInBlacklist：逗号或换行分隔的黑名单列表。
export const isSiteBlacklisted = (href, blacklist = "") =>
  String(blacklist)
    .split(/\n|,/)
    .some((url) => isMatch(String(href), url.trim()));
