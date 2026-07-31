# Contributing to OOFP

First off, thank you for considering contributing to **OOFP**! 🎉

Whether you're fixing a bug, adding a new functional utility, improving the documentation, or opening a discussion, your contributions are welcome and appreciated.

---

## 🛠️ Local Development Setup

OOFP is structured as a monorepo using **pnpm workspaces** and **Changesets**.

### Prerequisites

- **Node.js** v20.0.0 or higher
- **pnpm** v10.0.0 or higher (`corepack enable` or `npm i -g pnpm`)

### Getting Started

1. **Fork & Clone** the repository:
   ```bash
   git clone https://github.com/YOUR_USERNAME/oofp.git
   cd oofp
   ```

2. **Install dependencies**:
   ```bash
   pnpm install
   ```

3. **Verify everything is working**:
   ```bash
   pnpm test        # Run all Vitest unit test suites
   pnpm type-check  # Verify TypeScript compilation
   pnpm lint        # Run Biome linter check
   ```

---

## 💻 Available Workspace Commands

From the root directory, you can run:

- `pnpm test` – Run test suites across all packages.
- `pnpm test:watch` – Run tests in watch mode.
- `pnpm type-check` – Run TypeScript type checking.
- `pnpm lint` – Check formatting and code quality using [Biome](https://biomejs.dev).
- `pnpm format` – Auto-format code using Biome.
- `pnpm bench` – Run performance benchmarks.
- `pnpm docs:dev` – Start local dev server for the documentation website (`https://oofp.js.org`).
- `pnpm playground` – Start the interactive playground environment.

---

## 📁 Monorepo Structure

```text
oofp/
├── packages/
│   ├── core/         # Core ADTs (Maybe, Either, Task, TaskEither, Reader, IO, etc.) - 0 dependencies
│   ├── focal/        # Composable optics (Lens, Prism, Traversal, Iso)
│   ├── http/         # Functional HTTP client with retry, timeouts & interceptors
│   ├── query/        # Functional caching & query engine
│   ├── saga/         # Saga pattern for distributed transactions
│   └── react/        # Functional React hooks & monad integrations
├── docs/             # Documentation website (Astro + Starlight)
├── package.json      # Workspace root configuration
└── pnpm-workspace.yaml
```

---

## 🚀 How to Contribute

### 1. Finding an Issue
Check out open issues on GitHub. Look for the following labels:
- `good first issue` – Ideal for first-time contributors or smaller isolated tasks.
- `help wanted` – Tasks that need community support.
- `documentation` – Fixes, guides, or improvements to the documentation.

### 2. Creating a Pull Request
1. Branch off `main` with a descriptive branch name:
   ```bash
   git checkout -b feature/add-task-retry-policy
   # or
   git checkout -b fix/maybe-filter-type-guard
   ```
2. Make your code changes and add tests for any new or modified functionality.
3. Ensure all tests and checks pass:
   ```bash
   pnpm test
   pnpm type-check
   pnpm lint
   ```
4. **Add a changeset** (if changing exported APIs or adding features):
   ```bash
   pnpm changeset
   ```
   Follow the interactive prompts to describe your change (patch, minor, or major).

5. Commit and push your changes to your fork, then submit a Pull Request!

---

## 🎨 Code Style Guidelines

- **Zero dependencies for `@oofp/core`**: The core package must remain zero-dependency.
- **Pure & Immutability**: Functions should be pure, predictable, and avoid side effects.
- **Type Safety**: Maintain strong TypeScript type inference. Avoid using `any` wherever possible. Use Generics and HKT patterns established in the project.
- **Formatting**: We use [Biome](https://biomejs.dev). Run `pnpm format` before committing.

---

## 💬 Getting Help & Feedback

If you have questions, ideas, or feedback:
- Open a [GitHub Discussion](https://github.com/thexpert507/oofp/discussions).
- Open a [GitHub Issue](https://github.com/thexpert507/oofp/issues) for bugs or feature requests.

Thank you for making OOFP better! 💙
