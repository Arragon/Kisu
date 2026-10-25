// P2-T05 Design-Change Resilience Gate（MVP-17 / INH-1158）。
// 对真实 src/kisu 树跑扫描器：违规清单必须为空（失败信息即阻断项清单）；
// 另用临时夹具树证明扫描器抓得住各类违规（gate 不是空转）。
// 通过 = P3（Page 产品流）解锁条件满足。
import fs from "fs";
import os from "os";
import path from "path";
import { scanKisuBoundary, writeViolationFixture } from "../boundaryScan";

const KISU_ROOT = path.resolve(__dirname, "..", "..");

describe("P2-T05 boundary gate on the real tree", () => {
  const report = scanKisuBoundary(KISU_ROOT);

  it("scans a non-empty tree across every layer", () => {
    expect(report.scannedFileCount).toBeGreaterThan(10);
    // 五个受管层必须都在；"other"（如 ui/ 根的扫描器自身）无规则但允许存在
    expect(report.layers).toEqual(
      expect.arrayContaining(["kcl", "primitive", "product", "surface", "token"])
    );
  });

  it("gate conclusion: PASS — no design-change boundary violations", () => {
    const blockerList = report.violations
      .map((v) => `${v.file}:${v.line} [${v.rule}] ${v.excerpt}`)
      .join("\n");
    expect(`阻断项:\n${blockerList}`).toBe("阻断项:\n");
  });
});

describe("P2-T05 scanner self-test (catches violations, not vacuous)", () => {
  const fixtureRoot = fs.mkdtempSync(path.join(os.tmpdir(), "kisu-boundary-"));
  writeViolationFixture(fixtureRoot);
  const report = scanKisuBoundary(fixtureRoot);

  afterAll(() => {
    fs.rmSync(fixtureRoot, { recursive: true, force: true });
  });

  it("detects every seeded violation with the right rule", () => {
    const rules = report.violations.map((v) => `${v.file} → ${v.rule}`);
    [
      "kcl/bad.jsx → kcl.no-jsx",
      "kcl/bad.jsx → kcl.no-react-mui",
      "product/bad.jsx → product.no-mui",
      "product/bad.jsx → product.no-sx",
      "product/bad.jsx → product.no-hex",
      "product/bad.jsx → product.no-px",
      "ui/surfaces/bad.jsx → surface.stays-inside-ui",
      "ui/primitives/bad.jsx → primitive.tokens-only-no-hex",
      "ui/tokens/bad.js → token.no-react-mui",
    ].forEach((expected) => {
      expect(rules).toContain(expected);
    });
  });

  it("does not flag clean files", () => {
    const clean = report.violations.filter((v) => v.file.includes("clean"));
    expect(clean).toEqual([]);
  });
});
