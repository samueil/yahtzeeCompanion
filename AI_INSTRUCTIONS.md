# Yahtzee Companion

A React Native mobile app that uses a YOLOv8 machine learning model (via TensorFlow Lite) to detect dice values through the camera in real time. Players scan their physical dice after each roll, and the app tracks scores across a full 13-turn Yahtzee game.

## Stack

| Layer | Tech |
|-------|------|
| Framework | Expo 55 + React Native 0.83.6 + React 19 |
| Language | TypeScript 6 (strict mode) |
| Styling | NativeWind 4 (Tailwind CSS utility classes on native) |
| ML inference | react-native-fast-tflite + YOLOv8 TFLite model |
| Camera | react-native-vision-camera 4 |
| Frame threading | react-native-worklets-core (off-thread frame processing) |
| Icons | lucide-nativewind |
| Testing | Jest (jest-expo preset) + `@testing-library/react-native` |

## Development Commands

```bash
npm start              # Expo dev server (scan QR for Expo Go)
npm run ios            # Build and launch on iOS simulator/device (requires Xcode)
npm run android        # Build and launch on Android (requires Java 17 + Android SDK)
npm run web            # Web version with mock DiceScanner (no camera)
npm test               # Run Jest test suite
npm run lint           # ESLint check only; use `npm run lint -- --fix` to apply auto-fixes
npx tsc --noEmit       # TypeScript type check only
npm run build:check    # Expo export bundle check (runs in CI)
```

**Android:** Java 17 is required. Ensure `JAVA_HOME` points to a JDK 17 installation before running `npm run android`.

## Architecture

### Game State

`App.tsx` is the entry point and owns **all** game state. There is no Redux, Zustand, or Context — all state lives here and is passed as props:

- `dice: number[]` — current face values for 5 dice
- `locked: boolean[]` — which dice are held between rolls
- `rollsLeft: number` — 3 per turn, counts down
- `scores: Record<string, number>` — keyed by category id, set once per category
- `turn: number` — 1–13
- `showScanner: boolean` — toggles the camera modal

### ML Dice Detection Pipeline

1. `DiceScanner` opens as a full-screen overlay with a live camera feed
2. Vision Camera runs a worklet at ~2 FPS (intentionally throttled to avoid UI lag)
3. Frame is centre-cropped to a 1:1 square and resized to 640×640 (model input size)
4. TFLite executes YOLOv8 inference synchronously on the worklet thread (`runSync`)
5. Raw output tensor `[1, features, 8400]` or `[1, 8400, features]` is parsed with NMS in `src/lib/dice-processor.ts`
6. Detections bridge back to React via `Worklets.createRunOnJS()`
7. `AROverlay` renders coloured bounding boxes (red → yellow → green by confidence)
8. User confirms → `onScanComplete(values)` updates dice state in `App.tsx`

The TFLite model file is in `assets/`.

## Code Conventions

### No Default Exports

All modules use **named exports only**. ESLint enforces `import/no-default-export` across the project. `App.tsx` is the sole exception (Expo's entry point requires a default export — the `// eslint-disable-next-line` comment there is intentional, do not remove it).

### Styling

Use `className` props with Tailwind utility classes. Do **not** use `StyleSheet.create`.

- Custom colour tokens are defined in `src/theme/colors.ts` and registered in `tailwind.config.js`
- Use semantic token names (`text-primary`, `bg-card`, `text-muted`, etc.) rather than raw Tailwind colours where a token exists
- `prettier-plugin-tailwindcss` enforces class ordering automatically — run `npm run lint` to fix ordering

### TypeScript

Strict mode is enabled. Avoid `any`. Domain interfaces belong in `src/domain/`.

### Platform-Specific Implementations

Use React Native's file extension convention for platform splits:

- `foo.tsx` — native (iOS + Android)
- `foo.web.tsx` — web fallback

`DiceScanner` is the primary example: native has the full camera + ML pipeline, web has a random-roll simulator. Keep the props interface identical between both files.

### Type Imports

Always use `import type` when importing a symbol that is only used as a type. ESLint enforces this (`@typescript-eslint/consistent-type-imports`).

```ts
import type { DiceDetection } from '../domain/dice-detection'; // correct
import { DiceDetection } from '../domain/dice-detection';      // error — not a value
```

### Blank Line Before `return`

Any `return` statement that has at least one preceding statement in its block must be preceded by a blank line. ESLint enforces this (`padding-line-between-statements`).

### Handler Naming

| Where | Rule | Example |
|---|---|---|
| Function that handles an event | Must start with `handle` | `handleDieClick`, `handleScanComplete` |
| Prop that receives a handler | Must start with `on` | `onClick`, `onScanComplete` |
| Wrapper pass-through | `on` value allowed | `onClick={onClick}` |

 ESLint enforces this via `react/jsx-handler-names` with `checkLocalVariables: false`, so it checks JSX handler props but does not enforce local variable names. The rule is disabled inside `__tests__/` files — jest mock names like `mockOnClick` are fine in tests.

### Testing

See [testing-guidelines.md](./testing-guidelines.md) for full standards, patterns, and do/don't examples.

## CI / Quality Gates

GitHub Actions runs on every push and PR to `main` (`.github/workflows/ci.yml`):

1. `npx tsc --noEmit` — type check
2. `npm run lint` — ESLint + Prettier
3. `npm test` — Jest
4. `npm run build:check` — Expo bundle export

All four must pass. CodeQL security scanning (JS and Android) runs on a separate schedule.

Dependabot keeps npm and GitHub Actions versions up to date automatically.

## Project Structure

```
App.tsx                   # Entry point + complete game state
src/
  components/             # UI components (Die, DiceScanner, AROverlay)
  domain/                 # TypeScript interfaces (Category, DiceDetection)
  constants/              # Static Yahtzee data (CATEGORIES list)
  hooks/                  # Custom React hooks (useCameraPermissions)
  lib/                    # Pure business logic (scoring, ML frame processing)
  theme/                  # Shared colour tokens
assets/                   # TFLite model file + app images
ios/                      # Native iOS Xcode project (CocoaPods)
android/                  # Native Android Gradle project
.github/workflows/        # CI, CodeQL, Dependabot config
```
