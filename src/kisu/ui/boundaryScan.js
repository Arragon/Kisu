// P2-T05 边界扫描器（MVP-17 / INH-1158）。
// 以纯函数形式实现，boundary.test.js 用真实 src/kisu 树跑 gate 结论，
// 并用临时夹具树自测"扫描器确实抓得住违规"。扫描前剥离注释，避免误报；
// 该剥离可能把同行字符串内的 "//" 后内容一并去掉——只会造成漏报（安全方向），
// 不会误报。
import fs from "fs";
import path from "path";

const REACTISH = /^react(-dom)?(\/.*)?$/;
const MUIISH = /^(@mui|@emotion)\//;

const stripComments = (source) =>
  source
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .replace(/(^|\s)\/\/.*$/gm, "$1");

const layerOf = (relPath) => {
  if (relPath.startsWith("kcl/")) return "kcl";
  if (relPath.startsWith("product/")) return "product";
  if (relPath.startsWith("ui/surfaces/")) return "surface";
  if (relPath.startsWith("ui/primitives/")) return "primitive";
  if (relPath.startsWith("ui/tokens/")) return "token";
  return "other";
};

const collectFiles = (dir, base, out) => {
  fs.readdirSync(dir, { withFileTypes: true }).forEach((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "__tests__") {
        return; // 测试文件不参与 gate（其合法使用 jest/react）
      }
      collectFiles(full, base, out);
      return;
    }
    if (/\.(js|jsx)$/.test(entry.name)) {
      out.push({ full, rel: path.relative(base, full) });
    }
  });
  return out;
};

const importSources = (code) =>
  [...code.matchAll(/from\s+"([^"]+)"/g)].map((m) => m[1]);

const checkFile = (rel, source) => {
  const layer = layerOf(rel);
  const violations = [];
  const code = stripComments(source);
  const lineOf = (index) => code.slice(0, index).split("\n").length;
  const push = (rule, excerpt) =>
    violations.push({
      file: rel,
      layer,
      rule,
      excerpt,
      line: lineOf(code.indexOf(excerpt)),
    });

  const sources = importSources(code);
  const isRelative = (s) => s.startsWith(".");

  // 1. KCL 纯度：无 React/MUI，且不得向上依赖 ui/ 或 product/
  if (layer === "kcl") {
    if (rel.endsWith(".jsx")) {
      push("kcl.no-jsx", rel);
    }
    sources.forEach((s) => {
      if (REACTISH.test(s) || MUIISH.test(s)) {
        push("kcl.no-react-mui", s);
      }
      if (isRelative(s) && /\.\.\/(\.\.\/)?(ui|product)\//.test(s)) {
        push("kcl.no-ui-product-deps", s);
      }
    });
  }

  // 2. Product 样式泄漏：无 MUI/emotion、无 sx=、无 hex、无 px 字面量
  if (layer === "product") {
    sources.forEach((s) => {
      if (MUIISH.test(s)) {
        push("product.no-mui", s);
      }
      if (isRelative(s) && /\.\.\/(\.\.\/)?ui\//.test(s)) {
        push("product.no-ui-deps", s);
      }
    });
    const sxMatch = code.match(/\bsx\s*=\s*[{(]/);
    if (sxMatch) {
      push("product.no-sx", sxMatch[0]);
    }
    const hexMatch = code.match(/#[0-9a-fA-F]{6}\b/);
    if (hexMatch) {
      push("product.no-hex", hexMatch[0]);
    }
    const pxMatch = code.match(/\b\d+(?:\.\d+)?px\b/);
    if (pxMatch) {
      push("product.no-px", pxMatch[0]);
    }
  }

  // 3. Surface 隔离：只允许 react(-dom) 与 ui 层内部相对依赖
  //    （ui/ 之外是 kcl/ 与 product/；从 ui/surfaces|primitives|tokens 逃出
  //    ui/ 需要 "../../../"，一律禁止）
  if (layer === "surface") {
    sources.forEach((s) => {
      if (MUIISH.test(s)) {
        push("surface.no-mui", s);
      } else if (!isRelative(s) && !REACTISH.test(s)) {
        push("surface.bare-module-not-allowed", s);
      } else if (isRelative(s) && s.includes("../../../")) {
        push("surface.stays-inside-ui", s);
      }
    });
  }

  // 4. Primitive 纯度：只允许 react 与 tokens / primitives 内部相对依赖
  if (layer === "primitive") {
    sources.forEach((s) => {
      if (MUIISH.test(s)) {
        push("primitive.no-mui", s);
      } else if (!isRelative(s) && !REACTISH.test(s)) {
        push("primitive.bare-module-not-allowed", s);
      } else if (isRelative(s) && s.includes("../../../")) {
        push("primitive.only-tokens-relative", s);
      }
    });
    const hexMatch = code.match(/#[0-9a-fA-F]{6}\b/);
    if (hexMatch) {
      push("primitive.tokens-only-no-hex", hexMatch[0]);
    }
  }

  // 5. Token 纯度：无 React/MUI
  if (layer === "token") {
    sources.forEach((s) => {
      if (REACTISH.test(s) || MUIISH.test(s)) {
        push("token.no-react-mui", s);
      }
    });
  }

  return violations;
};

// 扫描一棵 Kisu 源码树（rootDir 指向 src/kisu 或等价夹具根）。
export const scanKisuBoundary = (rootDir) => {
  const files = collectFiles(rootDir, rootDir, []);
  const violations = files.flatMap(({ full, rel }) =>
    checkFile(rel.split(path.sep).join("/"), fs.readFileSync(full, "utf8"))
  );
  return {
    rootDir,
    scannedFileCount: files.length,
    layers: [
      ...new Set(files.map((f) => layerOf(f.rel.split(path.sep).join("/")))),
    ].sort(),
    violations,
  };
};

// 供 boundary.test.js 自测扫描器：构造一棵含已知违规的夹具树。
export const writeViolationFixture = (rootDir) => {
  const write = (rel, content) => {
    const full = path.resolve(rootDir, rel);
    // 根目录边界校验：夹具路径不得越出 rootDir（防御性，rel 本为内置常量）
    if (full !== rootDir && !full.startsWith(rootDir + path.sep)) {
      throw new Error(`fixture path escapes root: ${rel}`);
    }
    fs.mkdirSync(path.dirname(full), { recursive: true });
    fs.writeFileSync(full, content);
  };
  write("kcl/bad.jsx", 'import React from "react";\n');
  write(
    "product/bad.jsx",
    'import { Box } from "@mui/material";\nconst a = <Box sx={{ m: 1 }} color="#aabbcc" style={{ width: "10px" }} />;\n'
  );
  write("ui/surfaces/bad.jsx", 'import { readPageState } from "../../../kcl";\n');
  write("ui/primitives/bad.jsx", 'const color = "#112233";\n');
  write("ui/tokens/bad.js", 'import React from "react";\n');
  // 干净文件：不应产生违规
  write("kcl/clean.js", "export const a = 1;\n");
  write(
    "ui/surfaces/clean.jsx",
    'import React from "react";\nimport { Button } from "../../primitives";\n'
  );
};
