# JSDoc Standard (Repository-wide)

This repository uses **TypeScript-first JSDoc** for consistent inline documentation. The goal is:

- Consistent shape across packages/apps
- Clear module intent and boundaries (contracts-first)
- Explicit error/edge-case semantics for critical paths

JSDoc is enforced via ESLint (`eslint-plugin-jsdoc`) at **warn** level initially.

---

## 1. General Rules

- Use `/** ... */` block comments (not `//`).
- The first line is a **one-sentence summary** in present tense.
- Prefer documenting **exported/public APIs**.
- Use TypeScript types for types. Use JSDoc types only when TS cannot express the intent.
- Avoid duplicating obvious TS types in `@param {Type}`.
  - In TS, prefer `@param name - description` without `{Type}`.

---

## 2. Required Tags and When

- `@param`:
  - Required for exported functions/methods with parameters.
- `@returns`:
  - Required for exported functions that return a value.
- `@throws`:
  - Required when the function can throw (directly or via helper) in normal operation.
- `@example`:
  - Required for contracts/helpers used across apps or in critical flows.
- `@remarks`:
  - Use for invariants, scope rules, security posture, tenancy constraints, or non-obvious behavior.

---

## 3. File (Module) Header Template

Use this at the top of *domain modules*, *adapters*, *contracts*, and *services*.

```ts
/**
 * <Short module summary>.
 *
 * @remarks
 * - **Scope:** <platform|tenant|customer>
 * - **Authority:** <what is the source of truth>
 * - **Invariants:** <key invariants>
 */
```

---

## 4. Function Template

```ts
/**
 * <One sentence summary>.
 *
 * @param <name> - <meaning and constraints>
 * @returns <what is returned and how to interpret it>
 *
 * @throws <ErrorType> - <when this error is thrown>
 *
 * @remarks
 * - <invariants / edge cases / security posture>
 *
 * @example
 * ```ts
 * const result = await fn(input);
 * ```
 */
```

Notes:

- In TypeScript code, omit `{Type}` in `@param` unless it is necessary to express a special case.
- Prefer documenting **semantics** over types.

---

## 5. Class / Service Template

```ts
/**
 * <One sentence summary of the responsibility>.
 *
 * @remarks
 * - **Threading/Async:** <notes>
 * - **Side effects:** <external effects>
 * - **Tenancy:** <tenant scoping rules>
 */
export class ExampleService {
  /**
   * <Method summary>.
   *
   * @param input - <description>
   * @returns <description>
   */
  async run(input: Input): Promise<Output> {
    // ...
  }
}
```

---

## 6. Type / Contract Template (Recommended)

For shared contracts, prefer `type`/`interface` comments that explain semantics:

```ts
/**
 * <What this type represents>.
 *
 * @remarks
 * - <constraints>
 * - <example values>
 */
export type Example = {
  id: string;
};
```

---

## 7. Standard Tag Set

Use these tags consistently:

- `@param`
- `@returns`
- `@throws`
- `@remarks`
- `@example`
- `@deprecated` (with migration note)

Avoid custom tags unless we add them to the repo standard.
