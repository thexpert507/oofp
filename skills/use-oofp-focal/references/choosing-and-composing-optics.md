# Choosing and composing optics

## Selection

- Use a `Lens<S, A>` when every valid `S` contains exactly one `A`.
- Use a `Prism<S, A>` when an `A` may not be present, such as a union branch, nullable property, or array index.
- Use a `Traversal<S, A>` for zero or more targets, such as array elements, record values, or filtered items.
- Use an `Iso<A, B>` for a total, reversible, lossless conversion.

Composition produces the weakest focus required by the path:

```text
Lens + Lens       -> Lens
Lens + Prism      -> Prism
Lens + Traversal  -> Traversal
Prism + Lens      -> Prism
Prism + Traversal -> Traversal
Traversal + any   -> Traversal
```

## Focal navigation

| Data shape | Navigation |
| --- | --- |
| Required object property | `Focal.prop(key)` |
| Nullable/undefined property | `Focal.optional(key)` |
| Array element by index | `Focal.index(index)` |
| Discriminated union member | `Focal.match(tagKey, tagValue)` |
| All elements of array property | `Focal.each(key)` |
| All values of record property | `Focal.eachRecord(key)` |
| Matching elements | `Focal.filter(predicate)` |

## Terminators

| Cardinality | Read | Update |
| --- | --- | --- |
| Lens / Iso | `get(source)` | `set(value)`, `modify(fn)` |
| Prism | `preview(source)` | `set(value)`, `modify(fn)` |
| Traversal | `collect(source)`, `fold(...)` | `set(value)`, `modify(fn)` |

High-level update terminators return an updater; finish a pipeline with `Focal.run(source)` or apply the updater directly.

## Reuse

Name a path when it represents stable domain vocabulary:

```typescript
const employeeNames = pipe(
  Focal.from<Company>(),
  Focal.each("departments"),
  Focal.each("employees"),
  Focal.prop("name"),
);

const names = pipe(employeeNames, Focal.collect(company));
const normalized = pipe(
  employeeNames,
  Focal.modify((name) => name.trim()),
  Focal.run(company),
);
```
