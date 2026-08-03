---
"@oofp/core": major
"@oofp/focal": major
"@oofp/http": major
"@oofp/query": major
"@oofp/react": major
"@oofp/saga": major
---

Remove explicit `any` from the sequencing, concurrency, object, and settled HKT utilities.

This release strengthens tuple, error, and context inference and adds support for contravariant `Reader` and invariant `State` inputs that were previously rejected by `unknown`-based constraints. Existing runtime behavior and exports are preserved, including the legacy `sequenceT` overloads.

TypeScript consumers may observe stricter errors for values that do not belong to the selected HKT and more precise inferred result types. These type-level changes establish the stable `@oofp/core@1.0.0` compatibility boundary, so projects using `^0.3.x` do not receive them automatically.

Because Focal, HTTP, Query, React, and Saga expose or consume Core's shared types, they are released together at `3.0.0`. Their Core peer range now follows compatible `1.x` releases, making the type-system compatibility boundary explicit for every consumer package.
