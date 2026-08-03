---
title: AI Agent Skills
description: Install reusable OOFP guidance for Codex, Cursor, Claude Code, and other Agent Skills-compatible coding agents.
---

OOFP ships reusable [Agent Skills](https://agentskills.io/) derived from patterns exercised in production TypeScript applications. They teach coding agents how to choose OOFP abstractions, compose them correctly, and verify the result without copying application-specific architecture.

Skills complement the documentation: humans can read and copy their examples, while compatible agents load the relevant instructions only when a task triggers them.

## Install the collection

The cross-agent [`skills` CLI](https://www.skills.sh/docs/cli) can discover the skills in this repository and configure them for a supported coding agent:

```bash
npx skills add thexpert507/oofp
```

Review third-party instructions before installing them and select the OOFP skills appropriate for the project.

### Install with Codex

Ask Codex's skill installer to install the repository folder you need:

```text
$skill-installer install https://github.com/thexpert507/oofp/tree/main/skills/use-oofp-core
```

Replace `use-oofp-core` with any skill name below. Restart or open a new agent session if the installed skill is not discovered immediately.

### Copy into a project

Agent Skills-compatible tools commonly discover project skills from `.agents/skills/`. Copy the complete skill directory so its references and agent metadata remain available:

```bash
cp -R skills/use-oofp-core /path/to/consumer/.agents/skills/
```

Some tools also support their own project directories, such as `.cursor/skills/` or `.claude/skills/`. Prefer the tool's documented location when it does not scan `.agents/skills/`.

## Available skills

### `use-oofp-core`

Choose and compose `Maybe`, `Either`, `Task`, `TaskEither`, `Reader`, and `ReaderTaskEither`; model errors; sequence work; and control concurrency.

Example prompts:

```text
Use $use-oofp-core to replace this throwing Promise workflow with typed errors.
Use $use-oofp-core to choose between TaskEither and ReaderTaskEither here.
```

[Browse the skill on GitHub](https://github.com/thexpert507/oofp/tree/main/skills/use-oofp-core)

### `build-rte-workflows`

Build use cases with structural capability contexts, typed asynchronous failures, partial dependency provision, thin framework boundaries, and simple test doubles.

Example prompts:

```text
Use $build-rte-workflows to implement this use case with repository and clock capabilities.
Use $build-rte-workflows to move the business logic out of this NestJS controller.
```

[Browse the skill on GitHub](https://github.com/thexpert507/oofp/tree/main/skills/build-rte-workflows)

### `use-oofp-http`

Create lazy typed HTTP clients with `HttpContext`, interceptors, parsers, retries, timeouts, `HttpError`, and RTE composition.

Example prompts:

```text
Use $use-oofp-http to implement this authenticated API client.
Use $use-oofp-http to parse this API error body without losing the status code.
```

[Browse the skill on GitHub](https://github.com/thexpert507/oofp/tree/main/skills/use-oofp-http)

### `use-oofp-focal`

Choose and compose Lens, Prism, Traversal, Iso, and the high-level Focal API for immutable nested data transformations.

Example prompts:

```text
Use $use-oofp-focal to replace these nested spreads with a typed update.
Use $use-oofp-focal to update only the matching branch of this union.
```

[Browse the skill on GitHub](https://github.com/thexpert507/oofp/tree/main/skills/use-oofp-focal)

## Copy a pattern without installing

Each `SKILL.md` is intentionally short enough to read directly. Detailed examples live one level below in `references/`, so copy the entire folder when a pattern depends on those references.

For a one-off task, copy the relevant workflow and guardrails into the agent prompt, then link the agent to the current OOFP package source or documentation. Always match examples to the package version installed by the consumer.

## Scope

The skills are library-oriented. They intentionally exclude product-specific folder names, domain entities, UI libraries, database schemas, and deployment procedures. Framework integrations may demonstrate NestJS, React Query, or another host, but the OOFP effect and dependency patterns remain portable.
