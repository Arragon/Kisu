// Kisu 版本的 M0 来源是 docs/upstream/baseline.json 的 kisuVersion 字段。
// 不劫持 package.json 的 KISS 版本（package.json "version" 属于上游发行物）。
import baseline from "../../../docs/upstream/baseline.json";

export const KISU_VERSION = baseline.kisuVersion;
