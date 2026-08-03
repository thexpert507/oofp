# Application patterns

## Optional property

```typescript
const normalizedCity = pipe(
  Focal.from<User>(),
  Focal.optional("address"),
  Focal.prop("city"),
  Focal.modify((city) => city.trim()),
  Focal.run(user),
);
```

When `address` is absent, the update is a no-op. Read the path with `Focal.preview(user)`.

## Discriminated union

```typescript
type Payment =
  | { kind: "card"; last4: string }
  | { kind: "bank"; account: string };

const maskedCard = pipe(
  Focal.from<Payment>(),
  Focal.match("kind", "card"),
  Focal.prop("last4"),
  Focal.set("••••"),
  Focal.run(payment),
);
```

The update leaves bank payments unchanged.

## Array or record traversal

```typescript
const enabledFlags = pipe(
  Focal.from<FeatureState>(),
  Focal.eachRecord("flags"),
  Focal.filter((flag) => flag.enabled),
  Focal.collect(state),
);
```

Use `each` for array properties and `eachRecord` for record values. Apply `filter` after entering a traversal.

## Index access

`Focal.index(i)` is partial. Reading requires `preview`; modifying a missing index is a no-op and preserves the array.

## Raw Lens

```typescript
import * as Lens from "@oofp/focal/lens";

const streetLens = pipe(
  Lens.identity<Person>(),
  Lens.prop("address"),
  Lens.prop("street"),
);

const street = pipe(streetLens, Lens.view(person));
const moved = pipe(streetLens, Lens.set("Broadway"))(person);
```

Use raw modules when storing the optic, exposing it as an API, or composing with code that expects `Lens`, `Prism`, `Traversal`, or `Iso` directly.

## Custom optics

Use `Lens.make`, `Prism.make`, `Traversal.make`, or `Iso.make` only when built-in navigation cannot express the relationship. Verify laws and round trips with property-based tests when the optic is part of a public API.
