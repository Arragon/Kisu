// 构建产物校验（MVP-25 / INH-1166）。
// 用法：node src/scripts/verify-build-output.mjs
// 校验 build/chrome 与 build/firefox 的 manifest 完整性与关键资产存在性。
// 只读检查，不修改任何产物。
import fs from "fs";
import path from "path";

const TARGETS = ["chrome", "firefox"];
const REQUIRED_MANIFEST_FIELDS = [
  "manifest_version",
  "name",
  "version",
  "description",
];
const CHROME_REQUIRED = ["background", "action", "permissions", "host_permissions"];
const FIREFOX_REQUIRED = ["background", "permissions"];

const readJson = (file) => JSON.parse(fs.readFileSync(file, "utf8"));

const exists = (file) => fs.existsSync(file);

const verifyTarget = (target) => {
  const problems = [];
  const dir = path.resolve("build", target);
  if (!exists(dir)) {
    return { target, ok: false, problems: [`build/${target} does not exist`] };
  }
  const manifestPath = path.join(dir, "manifest.json");
  if (!exists(manifestPath)) {
    return { target, ok: false, problems: ["manifest.json missing"] };
  }
  let manifest;
  try {
    manifest = readJson(manifestPath);
  } catch (err) {
    return { target, ok: false, problems: [`manifest.json unparseable: ${err.message}`] };
  }

  REQUIRED_MANIFEST_FIELDS.forEach((field) => {
    if (!manifest[field]) {
      problems.push(`manifest.${field} missing`);
    }
  });
  const requiredExtra = target === "chrome" ? CHROME_REQUIRED : FIREFOX_REQUIRED;
  requiredExtra.forEach((field) => {
    if (!manifest[field]) {
      problems.push(`manifest.${field} missing (required for ${target})`);
    }
  });
  if (manifest.version !== "2.0.32") {
    problems.push(`manifest.version unexpected: ${manifest.version}`);
  }

  // 图标资产存在性
  const icons = manifest.icons || {};
  Object.values(icons).forEach((rel) => {
    if (!exists(path.join(dir, rel))) {
      problems.push(`icon missing: ${rel}`);
    }
  });

  // content scripts 声明的本地资产存在性
  (manifest.content_scripts || []).forEach((cs) => {
    (cs.js || []).forEach((rel) => {
      if (!exists(path.join(dir, rel))) {
        problems.push(`content script missing: ${rel}`);
      }
    });
    (cs.css || []).forEach((rel) => {
      if (!exists(path.join(dir, rel))) {
        problems.push(`content css missing: ${rel}`);
      }
    });
  });

  // background service worker / script 存在性
  const bg = manifest.background || {};
  [...(bg.service_worker ? [bg.service_worker] : []), ...(bg.scripts || [])].forEach(
    (rel) => {
      if (!exists(path.join(dir, rel))) {
        problems.push(`background script missing: ${rel}`);
      }
    }
  );

  return { target, ok: problems.length === 0, problems, manifestVersion: manifest.version };
};

const results = TARGETS.map(verifyTarget);
for (const result of results) {
  console.log(
    `${result.ok ? "✅" : "❌"} build/${result.target}${
      result.manifestVersion ? ` (v${result.manifestVersion})` : ""
    }${result.problems.length ? `\n   - ${result.problems.join("\n   - ")}` : ""}`
  );
}
if (results.some((r) => !r.ok)) {
  process.exitCode = 1;
}
