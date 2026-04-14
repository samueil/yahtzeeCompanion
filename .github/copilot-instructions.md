# Copilot Instructions

Full project context is in [`AI_INSTRUCTIONS.md`](../AI_INSTRUCTIONS.md) (root),
[`src/components/AI_INSTRUCTIONS.md`](../src/components/AI_INSTRUCTIONS.md), and
[`src/lib/AI_INSTRUCTIONS.md`](../src/lib/AI_INSTRUCTIONS.md).

Key conventions (summary):

- **No default exports** — named exports everywhere; `App.tsx` is the sole exception.
- **`import type`** for type-only symbols.
- **`className` / NativeWind** for all styling — no `StyleSheet.create`.
- **Handler naming**: props that accept handlers start with `on`; functions that handle events start with `handle`.
- **Blank line before `return`** when at least one statement precedes it in the block.
- **Platform splits** via file extensions: `foo.tsx` (native) / `foo.web.tsx` (web).
- **Test files** in `__tests__/` adjacent to the code they cover; mock native modules in `jest-setup.js`.
