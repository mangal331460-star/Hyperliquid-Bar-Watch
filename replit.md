# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Each package manages its own dependencies.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)

## Artifacts

### Hyperliquid Pattern Scanner (`artifacts/hyperliquid-scanner`)
- React + Vite app at path `/`
- Monitors all tradable assets on Hyperliquid using 5-minute candle data
- Detects the 3-bar gap pattern: bar1.high is well below bar3.low
- Configurable gap threshold (default 0.1%) and rescan interval
- In-app browser notifications for pattern alerts
- Real-time asset scanning grid + alert feed
- Calls Hyperliquid public API (`https://api.hyperliquid.xyz/info`) directly from browser

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/api-server run dev` — run API server locally

See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.
