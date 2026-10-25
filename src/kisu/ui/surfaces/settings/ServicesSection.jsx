// Translation Services 设置 section（MVP-52 / INH-1193）。
// projection map §5 硬规则：provider 列表**只读**（KCL #6 白名单 descriptor：
// 名称/类型/可用性），凭证与 custom API 表单一律跳 legacy Advanced——surface
// 永不出现 credential 字段（测试断言）。
import React from "react";
import { InlineStatus, Button, useColorPalette } from "../../primitives";
import { space, type } from "../../tokens/tokens";

export const ServicesSection = ({ providers, onOpenLegacy }) => {
  const palette = useColorPalette();
  const list = Array.isArray(providers) ? providers : [];

  return (
    <div
      data-testid="kisu-settings-services"
      style={{ display: "flex", flexDirection: "column", gap: space.md }}
    >
      <span
        style={{
          fontSize: type.size.sm,
          fontWeight: type.weight.medium,
          color: palette.text.secondary,
        }}
      >
        Configured services
      </span>
      <ul
        style={{
          margin: 0,
          padding: 0,
          listStyle: "none",
          display: "flex",
          flexDirection: "column",
          gap: space.xs,
        }}
        data-testid="kisu-settings-services-list"
      >
        {list.map((provider) => (
          <li
            key={provider.apiSlug}
            data-testid={`kisu-services-row-${provider.apiSlug}`}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: space.sm,
              padding: `${space.xs}px ${space.sm}px`,
              border: `1px solid ${palette.border.default}`,
              borderRadius: 8,
            }}
          >
            <span
              style={{
                fontSize: type.size.md,
                color: palette.text.primary,
              }}
            >
              {provider.name}
              <span
                style={{
                  fontSize: type.size.sm,
                  color: palette.text.secondary,
                  marginLeft: space.sm,
                }}
              >
                {provider.apiType || "unknown"}
              </span>
            </span>
            {provider.usable ? (
              <InlineStatus tone="success">Ready</InlineStatus>
            ) : (
              <InlineStatus tone="warning">Check configuration</InlineStatus>
            )}
          </li>
        ))}
      </ul>
      {list.length === 0 && (
        <InlineStatus tone="info">No services configured.</InlineStatus>
      )}
      <div style={{ display: "flex", gap: space.sm }}>
        <Button onClick={onOpenLegacy}>Manage credentials…</Button>
        <Button onClick={onOpenLegacy}>Custom APIs…</Button>
      </div>
      <InlineStatus tone="info">
        Credentials and custom API hooks are edited in the legacy settings.
      </InlineStatus>
    </div>
  );
};
