---
name: use-oofp-focal
description: Implement and review immutable nested reads, updates, filtering, aggregation, and reversible conversions with @oofp/focal Lens, Prism, Traversal, Iso, and the high-level Focal API. Use when replacing nested object spreads, updating optional or union data, traversing arrays or records, building reusable typed optics, or working with @oofp/focal imports.
---

# Use OOFP Focal

Choose the optic that matches focus cardinality, compose a reusable path, and apply the read or update at the end. Prefer the high-level `Focal` API for application transformations and raw optics for reusable primitives or interop.

## Workflow

1. Inspect the installed `@oofp/focal` and `@oofp/core` versions and local import style.
2. Identify the focus cardinality:

   | Focus | Optic |
   | --- | --- |
   | Exactly one, always present | `Lens` |
   | Zero or one | `Prism` |
   | Zero or many | `Traversal` |
   | Lossless conversion in both directions | `Iso` |

3. Start with `Focal.from<S>()`, `Focal.fromEach<A>()`, or a raw optic constructor.
4. Navigate with `prop`, `optional`, `index`, `match`, `each`, `eachRecord`, or `filter`.
5. Finish with the operation that matches the optic: `get`, `preview`, `collect`, `set`, `modify`, or `fold`.
6. Apply update functions to the source value only at the terminator; preserve the original value.
7. Extract and name the optic when the path is reused or represents domain vocabulary.
8. Test matching and nonmatching paths, including absent optionals, missing indexes, and empty traversals.

## Canonical application update

```typescript
import { pipe } from "@oofp/core/pipe";
import { Focal } from "@oofp/focal";

type Company = {
  departments: Array<{
    active: boolean;
    employees: Array<{ name: string; salary: number }>;
  }>;
};

const raiseActiveDepartmentSalaries = (company: Company) =>
  pipe(
    Focal.from<Company>(),
    Focal.each("departments"),
    Focal.filter((department) => department.active),
    Focal.each("employees"),
    Focal.prop("salary"),
    Focal.modify((salary) => salary * 1.05),
    Focal.run(company),
  );
```

The composed optic degrades automatically to the weakest required optic; traversing a collection makes the overall focus a `Traversal`.

## Choose high-level or raw API

- Use `import { Focal } from "@oofp/focal"` for inline application-level navigation and updates.
- Use `@oofp/focal/lens`, `/prism`, `/traversal`, and `/iso` when defining reusable optic values, laws, or integrations that require the raw optic.
- Wrap raw optics with `Focal.fromOptic` and extract them with `Focal.toOptic` when crossing between APIs.

## Guardrails

- Do not use a `Lens` for a value that may be absent; use a `Prism` path such as `optional` or `index`.
- Do not rebuild surrounding structures manually after an optic has focused the target.
- Treat nonmatching Prism and Traversal updates as no-ops, not failures.
- Do not use `get` on a partial focus. Use `preview` for a Prism and `collect` for multiple foci.
- Use an `Iso` only when both directions form a lossless round trip. Parsing and validation usually require a `Prism` or `Either`, not an Iso.
- Prefer an ordinary object spread for a single shallow one-off update; introduce optics when nesting, partiality, traversal, or reuse justifies them.

## Load references selectively

- Read [choosing-and-composing-optics.md](references/choosing-and-composing-optics.md) for optic selection, composition, and terminators.
- Read [application-patterns.md](references/application-patterns.md) for optional fields, unions, collections, records, reusable updates, and raw optics.
- Invoke `$use-oofp-core` when the task primarily concerns `Maybe`, `Either`, or effect composition around an optic.

## Verification

- Confirm the optic cardinality matches the data model.
- Confirm source objects remain unchanged after updates.
- Confirm nonmatching paths have the intended no-op behavior.
- For custom raw optics, test the relevant Lens, Prism, Traversal, or Iso laws.
