---
title: "Harness Engineering through Functional Programming: Tools, Effects, and Verification"
date: 2026-08-03
authors:
  - thexpert507
tags:
  - typescript
  - functional-programming
  - architecture
  - ai-agents
description: "How functional programming makes the tool-and-effect layer inside coding-agent harnesses explicit, composable, and verifiable."
excerpt: "Harness engineering surrounds coding agents with tools, constraints, and feedback. Functional programming provides a mature foundation for making that execution layer typed, explicit, composable, and verifiable."
cover:
  alt: "Harness engineering pipeline showing a model passing through typed functional tools and explicit effects to produce a verified result."
  image: ../../../assets/blog/harness-engineering-functional-programming.webp
---

The phrase **harness engineering** is receiving attention because coding agents have made an old systems problem newly visible.

A capable model can propose a plausible change. That is not the same as navigating the right repository, selecting the right tools, respecting architectural boundaries, recovering from failure, and proving that the result is complete. Reliable software work emerges from the model and the system around it.

OpenAI describes this shift in [Harness engineering: leveraging Codex in an agent-first world](https://openai.com/index/harness-engineering/). The team found that progress depended on making capabilities legible to the agent, keeping repository knowledge structured, enforcing architectural invariants, and turning review and validation into feedback loops. Microsoft uses *agent harness* for the runtime that adds planning, memory, tool orchestration, approvals, context management, and telemetry around a model. Anthropic draws a related distinction between predefined workflows and agents that dynamically direct their own process and tool use.

Functional programming has spent decades asking how to represent computations, compose them, separate descriptions from execution, make dependencies explicit, and preserve meaning under transformation. Those ideas do not constitute a complete agent harness. They do, however, provide a mature technical foundation for one of its most important layers: the tools and effects through which an agent acts on the world.

This article develops that narrower claim:

> Functional programming does not replace the agent harness. It gives us strong abstractions for typed tools, explicit effects, controlled execution, composable recovery, and verifiable outcomes.

## Why harness engineering matters now

A language model produces output from context. A coding agent must also inspect a workspace, revise a plan, call tools, interpret observations, retain task state, operate within permissions, and decide when enough evidence exists to stop.

OpenAI's account is useful because it treats agent failures as system feedback. When Codex could not complete a task, the question was not only whether the model needed a better prompt. The team asked which capability, abstraction, constraint, or feedback signal was missing from the environment. Repository documentation became a navigable map. Application behavior, logs, metrics, tests, and browser state became observable. Architecture rules became mechanically enforceable.

This changes the unit we should evaluate. The relevant system is not merely the model:

```text
model + harness + environment -> observable engineering behavior
```

A recent research proposal, [AI Harness Engineering](https://arxiv.org/abs/2605.13357), formalizes this view with responsibilities including task specification, context selection, tool access, project memory, task state, observability, failure attribution, verification, permissions, and maintenance state. It is a useful vocabulary, although it is a recent preprint rather than an established industry standard.

A model can write correct local code and still fail the engineering task. It may open the wrong file, call an unsafe operation, misread a test failure, forget a constraint, or declare success without validating the requirement. Many such failures occur between reasoning and execution.

## The harness is larger than its tools

Tools let the model read files, search code, run tests, query logs, drive a browser, or modify a repository. But a list of callable functions is not a complete runtime.

[Microsoft Agent Framework's harness](https://devblogs.microsoft.com/agent-framework/the-microsoft-agent-framework-harness-is-now-released/) illustrates the difference. The developer provides a model, instructions, and tools; the harness adds facilities such as planning, history, compaction, approvals, memory, and telemetry. The tool answers *what operation is available*. The harness also decides:

- what the model sees before choosing it;
- whether the call is permitted;
- how its input is validated;
- what state is recorded before and after execution;
- how errors and partial completion are represented;
- whether another iteration is useful;
- what evidence satisfies the definition of done.

Anthropic's [Building effective agents](https://www.anthropic.com/engineering/building-effective-agents) makes another important separation. Workflows follow predefined paths, while agents dynamically control their process and tool use. Functional composition is naturally suited to defining reliable workflows, but that does not mean it supplies the policy that decides which workflow to construct next.

This is where the analogy needs discipline. A `TaskEither` is not memory. A `Reader` is not a sandbox. A Saga is not an agent loop. A Zod schema is not a permission system. These abstractions can make the corresponding runtime mechanisms clearer and safer, but they do not make those mechanisms appear automatically.

## A functional model of a tool

Consider a minimal model for a tool:

```typescript
type Tool<I, R, E, O> =
  (input: I) => ReaderTaskEither<R, E, O>
```

This is not an OOFP API. It is a compact design model built from `ReaderTaskEither`.

The four type parameters say more than a conventional asynchronous function usually does:

- `I` is the explicit input supplied by the caller.
- `R` is the environment of capabilities required to execute the operation.
- `E` is the expected failure channel.
- `O` is the successful output.

The returned value is lazy. Calling the tool with an input constructs a program; it does not have to execute the effect immediately. The runtime can validate the request, check permissions, select an environment, attach tracing, or reject the operation before interpretation.

Compare that with a common shape:

```typescript
const inspectFile = async (path: string): Promise<string> => {
  return fs.readFile(path, "utf8")
}
```

The signature reveals the argument and eventual success value. It does not reveal which filesystem authority is used, which failures are expected, whether other effects occur, or whether calling the function starts work immediately.

A functional version makes the capability part of the program:

```typescript
type FileError =
  | { tag: "not-found"; path: string }
  | { tag: "access-denied"; path: string }

type FileSystem = {
  readText: (path: string) => TaskEither<FileError, string>
}

const inspectFile = (
  path: string,
): ReaderTaskEither<FileSystem, FileError, string> =>
  pipe(
    RTE.ask<FileSystem>(),
    RTE.chaint(({ readText }) => readText(path)),
  )
```

This does not guarantee safety. A `FileSystem` implementation could still expose the entire machine. It provides a visible capability boundary: production can supply a workspace-scoped interpreter, tests an in-memory one, and read-only tasks an environment without write capability.

### Input is a contract, not prompt prose

Agent tools normally require a machine-readable input schema. The functional model begins after that input has been decoded, so a fuller definition can carry both schema and program:

```typescript
type ToolDefinition<I, R, E, O> = {
  name: string
  input: z.ZodType<I>
  execute: (input: I) => ReaderTaskEither<R, E, O>
}
```

The schema rejects malformed model output at the trust boundary. The program receives a typed value rather than repeatedly defending itself against `unknown`. This is particularly important for agents: model-generated arguments are untrusted input, even when they look structurally plausible.

### Dependencies can approximate capabilities

`Reader` is usually introduced as dependency injection. In a harness, it is helpful to think in terms of capabilities. A read tool requires `ReadWorkspace`; a test tool requires `TestRunner`; a deployment tool requires a much stronger authority.

Narrow records make those differences inspectable:

```typescript
type AnalyzeContext = {
  workspace: ReadWorkspace
  tests: TestRunner
  logger: StructuredLogger
}
```

The type checker can prevent accidental use of a capability that is absent from the context. Runtime permissions must still enforce filesystem, network, and credential boundaries. Types document and constrain the program; the sandbox constrains the process.

### Errors become observations

An exception interrupts normal composition and often loses domain meaning as it travels through generic catch blocks. `Either<E, O>` turns expected failure into an observation the harness can classify.

That distinction affects recovery. `not-found` may mean the agent selected the wrong path and should search again. `test-failed` may be valuable feedback that should return to the reasoning loop. `access-denied` should not be retried with increasingly creative shell commands. `timeout` may permit a bounded retry. A typed error does not choose the policy, but it gives the policy something better than an arbitrary message to inspect.

### Laziness creates an execution boundary

`TaskEither<E, O>` describes an asynchronous computation. It can be assembled, transformed, wrapped with telemetry, or replaced before it runs. With `ReaderTaskEither<R, E, O>`, the complete environment is supplied at a deliberate boundary:

```typescript
const result = await pipe(
  inspectFile("src/config.ts"),
  RTE.run(workspaceCapabilities),
  TE.run,
)
```

That boundary is a natural place for the harness to record the request, enforce a timeout, attach a correlation ID, collect the result, and decide what the model should observe next.

## Evidence from a production TypeScript codebase

These ideas were tested against an anonymized production backend rather than derived only from small examples. The audited snapshot contained roughly 1,500 TypeScript source files. About 650 imported OOFP packages, with approximately 1,500 `pipe` calls, 3,500 `ReaderTaskEither` operations, and 75 test files.

Those numbers measure adoption, not agent productivity. The audit did not compare models, completion rates, token usage, or defect rates. Its evidence is structural: which patterns survived at production scale, where they improved inspectability, and where hidden effects remained.

### 1. Capability records made use cases reconstructible

Application services were commonly expressed as records of functions assembled from an explicit context. A use case could declare repositories, external services, configuration, and logging in one type, then return a `ReaderTaskEither` without resolving a container or reaching into module globals.

For a coding agent, this creates semantic compression. The signature identifies the required environment, possible failure, and output before the agent explores every implementation. The real adapter and the test double share the same structural contract. When a new capability is introduced, TypeScript points to the execution boundaries that must supply it.

This is not proof that an agent will understand the business requirement. It is evidence that less of the execution contract is hidden in constructor history and runtime registration.

### 2. Pipelines and Sagas exposed recovery structure

One audited workflow coordinated several state-changing operations with compensations. Each step described an action and a rollback; the composed Saga executed compensations when a later step failed.

That structure matters for both humans and agents. A flat sequence of named steps communicates the business order. Explicit compensation communicates which partial effects are reversible. A failing test can identify the step and expected cleanup instead of leaving the reader to infer recovery from nested `try/catch` blocks.

The strongest version of the pattern kept each step small and named. The weakest version mixed logging, fallback policy, object construction, and external calls inside long `chain` callbacks. Functional syntax did not rescue an unclear program. Composition helped only when the units being composed had coherent contracts.

### 3. Test doubles turned context into executable evidence

Tests frequently supplied plain records of functions as repositories, clocks, loggers, or remote services. Running the program required no full framework container. A test could provide fixed capabilities, execute the returned task, and assert the resulting `Either` plus the calls recorded by the doubles.

That is relevant to a coding harness because tests become an interpretable feedback channel. The agent does not need to infer success from the absence of an exception or from a vague log. It can observe a deterministic value and a focused assertion failure. This aligns with OpenAI's broader observation that agent-friendly repositories make architecture, application behavior, and validation directly legible.

This is an architectural inference, not a benchmark result. The audit shows that feedback can be local and explicit, not how much that changes agent performance.

## How functional architecture helps coding agents

A coding agent operates under a limited context budget. Hidden dependencies require more repository reconstruction, untyped failures permit more interpretations, and eager effects blur planning and action.

Functional architecture reduces these uncertainties in several ways:

- **Signatures carry operational facts.** `ReaderTaskEither<Context, Error, Result>` exposes needs, failure, and success together.
- **Composition supplies a small grammar.** `map`, `chain`, `mapLeft`, `orElse`, and `provide` constrain the valid transformations between steps.
- **Pure cores narrow the search space.** Deterministic transformations can be inspected and tested without recreating runtime state.
- **Capabilities support substitution.** Real interpreters, sandboxed interpreters, and test doubles can satisfy the same record contract.
- **Effects can be executed once.** Controllers, workers, CLIs, and tests become visible interpretation boundaries.
- **Failures remain data.** Verification and recovery logic can branch on meaning rather than parse exception text.

These properties complement repository-level harness work. `AGENTS.md`, architecture maps, skills, linters, and test commands tell the agent how the repository should be changed. Functional contracts make more of the repository itself agree with that description. Documentation can drift; a type error and a failing deterministic test provide immediate counterevidence.

For the related argument about local reasoning and hidden state, see [Referential Transparency in TypeScript](/blog/referential-transparency-humans-ai/).

## Where the analogy stops

Calling any functional application an agent harness would erase useful distinctions.

Functional programming does not decide which files enter the context window. It does not maintain project memory, compact a long conversation, allocate a tool budget, request human approval, isolate a process, or determine when the model should stop. It does not provide telemetry merely because a program is composable. It does not turn a business function into a model-facing tool without a schema, description, authorization policy, and observation format.

The audited backend was not a coding-agent harness. Its architecture made important behavior explicit; the harness remained the larger arrangement of agent loop, repository instructions, tools, permissions, tests, and review.

The accurate relationship is therefore:

```text
functional tools are a substrate inside the harness,
not a synonym for the harness
```

This distinction also protects us from a common category error. `Reader` can express that a program requires `DeployProduction`; it cannot prove that the concrete interpreter protects credentials or requires approval. `TaskEither` can represent `PermissionDenied`; it cannot prevent an unrelated shell tool from bypassing the intended path. Static capability design and runtime enforcement must reinforce each other.

## Failure modes found in the audit

The production audit was valuable because the system was not perfectly functional.

**Implicit clocks and identifiers.** Some parsers generated dates or IDs while validating data. The same input could produce different output, and the creation effect was hidden inside a boundary that appeared deterministic. Moving clocks and generators into explicit capabilities separated decoding from creation.

**Global loggers and direct console calls.** A pipeline can preserve its success value while still writing through a module-level logger. From the type signature, that effect is invisible. Important flows benefit from receiving structured logging as a capability, especially when the harness needs correlation and trace evidence.

**Premature execution.** Wrapping an already-running `Promise` does not recover laziness. The operation has begun before the harness can attach policy. Adapters should return thunks or lazy tasks and let the boundary execute them.

**Unreadable pipelines.** Deeply nested `pipe` calls, inline conditionals, broad contexts, and repeated widening combinators can become as opaque as a long imperative method. Agents learn local patterns, including poor ones. Named domain steps and small contracts matter more than maximizing functional syntax.

**Types mistaken for security.** A narrow context improves design-time visibility but is not a process boundary. Filesystem scopes, network policy, secrets, approvals, and timeouts require runtime enforcement outside the TypeScript type system.

These failures identify where the program's description and its real execution have drifted apart—the seam harness engineering must manage.

## Practical principles

The following rules are a useful starting point for repositories that coding agents will read and change:

1. **Treat model-produced arguments as untrusted data.** Decode every tool input with a machine-readable schema.
2. **Model tools as programs, not eager operations.** Construct effects first and execute them at a deliberate boundary.
3. **Use narrow capability records.** Express the authority required by each operation instead of passing a universal application container.
4. **Represent expected failures as data.** Give the harness stable categories for retry, recovery, escalation, and reporting.
5. **Keep runtime enforcement separate.** Pair typed capabilities with sandboxes, approvals, credential scopes, timeouts, and audit logs.
6. **Name orchestration steps.** The main pipeline should read like a plan whose components can be inspected independently.
7. **Make compensation explicit.** For multi-step effects, state which operations can be reversed and verify rollback behavior.
8. **Provide deterministic interpreters for tests.** Make the cheapest verification path local, focused, and readable by an agent.
9. **Run effects once.** Supply context and interpret the program at controllers, workers, CLI commands, or tool executors.
10. **Measure the complete system.** Evaluate model, harness, and environment together; do not attribute every success or failure to the model.

A compact OOFP-shaped tool can then look like this:

```typescript
type InspectInput = { path: string }

type InspectTool = ToolDefinition<
  InspectInput,
  ReadWorkspace,
  WorkspaceError,
  FileReport
>

const inspectTool: InspectTool = {
  name: "inspect_file",
  input: z.object({ path: z.string().min(1) }),
  execute: ({ path }) =>
    pipe(
      RTE.ask<ReadWorkspace>(),
      RTE.chaint((workspace) => workspace.read(path)),
      RTE.map(analyzeSource),
    ),
}
```

The surrounding harness still has work to do. It describes the tool to the model, validates the proposed call, decides whether the path is allowed, provides a scoped `ReadWorkspace`, records the execution, renders the `Either` as an observation, and determines what should happen next.

That is precisely the point. The model proposes. The functional program describes. The interpreter executes. The harness governs and verifies.

## The useful connection

Harness engineering names the discipline of turning model capability into reliable system behavior. Context, state, tools, permissions, observability, recovery, and verification all participate.

Functional programming's contribution is more specific. It makes computations explicit before they run, carries dependencies and errors in types, composes smaller contracts, supports substitutable interpreters, and turns verification into program output.

Those properties were valuable before coding agents. Agents make their value easier to see.

When a probabilistic model is allowed to choose actions, the surrounding execution layer should contain as little accidental ambiguity as possible. Typed functional tools do not complete the harness, but they can make its boundary with the world narrower, more legible, and more accountable.
