// LexicalResult 测试（MVP-30 / INH-1171）。
// 验收：term/音标/释义/详情、缺项自然降级、长释义折叠展开、loading/error、
// 仅 lexical 挂载、token 取色。
import React from "react";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { LexicalResult } from "../LexicalResult";
import { ModeProvider } from "../../../primitives";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const render = (ui) => {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  act(() => root.render(ui));
  return {
    container,
    unmount: () => {
      act(() => root.unmount());
      container.remove();
    },
  };
};

const fireClick = (el) =>
  act(() => {
    el.click();
  });

const vm = ({ data, status, error, blockedBy, can } = {}) =>
  Object.freeze({
    status: status ?? "ready",
    data: Object.freeze({
      text: Object.freeze({
        raw: "serendipity",
        kind: "lexical",
        reason: "latin-word",
      }),
      providers: Object.freeze({
        resolved: Object.freeze([]),
        missing: Object.freeze([]),
      }),
      result: null,
      ...(data || {}),
    }),
    can: Object.freeze({ ...(can || {}) }),
    blockedBy: blockedBy ?? null,
    error: error ?? null,
  });

const mount = (viewModel) =>
  render(
    <ModeProvider>
      <LexicalResult viewModel={viewModel} />
    </ModeProvider>
  );

const readyResult = (payload) => ({
  kind: "lookup",
  status: "ready",
  payload,
});

describe("LexicalResult (MVP-30)", () => {
  it("renders term with fallback to the selected text", () => {
    const { container, unmount } = mount(
      vm({
        data: {
          result: readyResult({ definitions: [{ meaning: "意外发现珍宝的运气" }] }),
        },
      })
    );
    const box = container.querySelector('[data-testid="kisu-lexical-result"]');
    expect(box.textContent).toContain("serendipity"); // term 缺省回退选中文本
    expect(box.textContent).toContain("意外发现珍宝的运气");
    unmount();
  });

  it("shows term and pronunciation when provided", () => {
    const { container, unmount } = mount(
      vm({
        data: {
          result: readyResult({
            term: "serendipity",
            pronunciation: "/ˌserənˈdipədē/",
            definitions: [
              { pos: "n.", meaning: "the occurrence of events by chance" },
            ],
          }),
        },
      })
    );
    expect(
      container.querySelector('[data-testid="kisu-lexical-pronunciation"]')
        .textContent
    ).toBe("/ˌserənˈdipədē/");
    expect(container.textContent).toContain(
      "n. the occurrence of events by chance"
    );
    unmount();
  });

  it("degrades naturally without pronunciation/definitions/detail", () => {
    const { container, unmount } = mount(
      vm({ data: { result: readyResult({ term: "word" }) } })
    );
    expect(
      container.querySelector('[data-testid="kisu-lexical-pronunciation"]')
    ).toBeNull();
    expect(
      container.querySelector('[data-testid="kisu-lexical-definitions"]')
    ).toBeNull();
    expect(container.querySelector('[data-testid="kisu-lexical-detail"]')).toBeNull();
    expect(container.textContent).toContain("word");
    unmount();
  });

  it("expands and collapses long definition lists", () => {
    const many = Array.from({ length: 6 }, (_, i) => ({ meaning: `meaning ${i + 1}` }));
    const { container, unmount } = mount(
      vm({ data: { result: readyResult({ definitions: many }) } })
    );
    expect(
      container
        .querySelector('[data-testid="kisu-lexical-definitions"]')
        .querySelectorAll("li")
    ).toHaveLength(3); // 预览条数
    fireClick(
      [...container.querySelectorAll("button")].find((b) =>
        b.textContent.startsWith("Expand")
      )
    );
    expect(
      container
        .querySelector('[data-testid="kisu-lexical-definitions"]')
        .querySelectorAll("li")
    ).toHaveLength(6);
    fireClick(
      [...container.querySelectorAll("button")].find((b) =>
        b.textContent.startsWith("Collapse")
      )
    );
    expect(
      container
        .querySelector('[data-testid="kisu-lexical-definitions"]')
        .querySelectorAll("li")
    ).toHaveLength(3);
    unmount();
  });

  it("renders detail, loading and error states", () => {
    const { container, unmount } = mount(
      vm({ data: { result: readyResult({ detail: "Etymology notes…" }) } })
    );
    expect(
      container.querySelector('[data-testid="kisu-lexical-detail"]').textContent
    ).toBe("Etymology notes…");
    unmount();

    const { container: c2, unmount: u2 } = mount(
      vm({ data: { result: { kind: "lookup", status: "loading", payload: null } } })
    );
    expect(
      c2.querySelector('[data-testid="kisu-lexical-loading"]').textContent
    ).toContain("Looking up");
    u2();

    const { container: c3, unmount: u3 } = mount(
      vm({ error: { code: "PROVIDER_REQUEST_FAILED", message: "rate limited" } })
    );
    expect(
      c3.querySelector('[data-testid="kisu-lexical-error"]').textContent
    ).toContain("rate limited");
    u3();
  });

  it("renders nothing for non-lexical kinds or missing data", () => {
    const { container, unmount } = mount(
      vm({ data: { text: { raw: "x", kind: "sentence", reason: "default" } } })
    );
    expect(container.querySelector('[data-testid="kisu-lexical-result"]')).toBeNull();
    unmount();

    const { container: c2, unmount: u2 } = mount(vm({ status: "loading", data: null }));
    expect(c2.querySelector('[data-testid="kisu-lexical-result"]')).toBeNull();
    u2();
  });
});
