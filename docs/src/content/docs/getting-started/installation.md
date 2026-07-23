---
title: Installation
description: How to install @oofp/core and other packages.
---

## Install @oofp/core

```bash
npm install @oofp/core
# or
pnpm add @oofp/core
# or
yarn add @oofp/core
```

## Optional Packages

Install additional packages as needed:

```bash
# Functional HTTP client
pnpm add @oofp/http

# Query cache
pnpm add @oofp/query

# Saga pattern
pnpm add @oofp/saga

# React hooks (experimental)
pnpm add @oofp/react
```

## Requirements

- **TypeScript** 7.0 or higher
- **Node.js** 18 or higher (for ESM support)
- `"strict": true` in your `tsconfig.json` is recommended

## Import Style

OOFP uses sub-path exports for tree-shaking. Always import from specific modules:

```typescript
// Correct — tree-shakeable
import * as M from "@oofp/core/maybe";
import * as E from "@oofp/core/either";
import * as TE from "@oofp/core/task-either";
import * as RTE from "@oofp/core/reader-task-either";
import { pipe } from "@oofp/core/pipe";
import { flow } from "@oofp/core/flow";
```

The convention is to use short namespace aliases:

| Module | Alias |
|--------|-------|
| `maybe` | `M` |
| `either` | `E` |
| `task` | `T` |
| `task-either` | `TE` |
| `reader` | `R` |
| `reader-task-either` | `RTE` |
| `io` | `IO` |
| `state` | `S` |
| `list` | `L` |
| `object` | `O` |
| `string` | `Str` |
